# Usuarios, alumnos, coaches y perfiles

Actions cubiertos:

- `src/app/actions/user.actions.ts`
- `src/app/actions/student.actions.ts`
- `src/app/actions/coach.actions.ts`
- `src/app/actions/profile.actions.ts`
- `src/app/actions/scheduleChangeRequest.actions.ts`

## Usuarios admin

### `getUsers()`

Permisos: admin.

Lista todos los usuarios con `image`, `student` y `coach`. Sanitiza `passwordHash`.

### `getUserById(id)` / `getUserByEmail(email)`

Permisos: admin.

Busca un usuario puntual por id o email normalizado. Devuelve el usuario sanitizado.

### `createUser(input)`

Permisos: admin.

Crea un usuario generico. Puede recibir password en texto para hashear o `passwordHash` ya armado.

Revalida: `/admin/usuarios`.

### `updateUser(id, input)`

Permisos: admin.

Actualiza datos basicos, rol, estado, password e imagen del usuario.

Si `image === null`, borra la imagen actual. Si `image` existe, hace upsert.

Revalida: `/admin/usuarios`.

### `updateUserStatus(id, status)` / `updateUserRole(id, role)`

Permisos: admin.

Wrappers de `updateUser`.

### `upsertUserImage(userId, input)` / `deleteUserImage(userId)`

Permisos: admin.

Gestiona la relacion `UserImage` en DB. No sube ni borra Cloudinary por si mismo; eso pasa por la API de imagen.

Revalida usuarios, alumnos y/o coaches.

### `deleteUser(id)`

Permisos: admin.

Borra el usuario. Prisma cascada o relaciones del schema definen que se elimina o queda en null.

Revalida: usuarios, alumnos y coaches.

## Alumnos admin

### `getStudents()`

Permisos: admin.

Lista usuarios con rol `STUDENT`, incluyendo imagen, coach, membresia activa/historica y turnos activos.

### `getStudentById(id, input)`

Permisos: admin.

Devuelve el perfil completo del alumno para `/admin/alumnos/[id]`.

Incluye:

- usuario e imagen;
- coach e imagen;
- membresias con plan y pagos;
- pagos;
- asistencia filtrada por mes/año;
- turnos activos con coach.

Sanitiza `passwordHash` del alumno y del coach.

### `createStudentUser(input)`

Permisos: admin.

Crea un usuario `STUDENT` y su `Student`.

Tambien puede:

- asignar coach;
- asignar plan activo;
- asignar precio mensual individual;
- asignar turnos;
- cargar rutina, notas e imagen.
- enviar mail de bienvenida al alumno.

Validaciones importantes:

- telefonos opcionales con formato valido;
- fecha de nacimiento razonable;
- cantidad de turnos no mayor a los dias por semana del plan;
- turnos de la misma categoria que el plan;
- no permite dos turnos el mismo dia;
- no permite turnos llenos.

Revalida: usuarios, alumnos, pagos y perfil del alumno.

Auditoria: `STUDENT_CREATE`.

El mail de bienvenida no bloquea la creacion del alumno. Si falla SMTP o el email no es entregable, el alumno se crea igual y el estado queda guardado en auditoria como `welcomeEmailStatus`.

### `updateStudentUser(id, input)`

Permisos: admin.

Actualiza usuario y ficha de alumno. Puede cambiar coach, plan, precio mensual, turnos, datos personales, rutina, notas e imagen.

Si `planId` viene vacio, cancela membresias activas. Si viene un plan, crea o actualiza la membresia activa.

Al cambiar de plan, conserva solamente turnos compatibles con la nueva categoria y valida la seleccion antes de actualizar al alumno.

Revalida: usuarios, alumnos, pagos y perfil del alumno.

Auditoria: `STUDENT_UPDATE`.

## Coaches admin

### `getCoaches()`

Permisos: admin.

Lista usuarios con rol `COACH`, incluyendo imagen y alumnos asignados.

### `createCoachUser(input)`

Permisos: admin.

Crea usuario `COACH` y su registro `Coach`.

Revalida: usuarios y coaches.

### `updateCoachUser(id, input)`

Permisos: admin.

Actualiza usuario y datos del coach. Hace upsert del registro `Coach` si hace falta.

Tambien gestiona imagen.

Revalida: usuarios y coaches.

## Funciones del coach sobre sus alumnos

### `updateCoachStudent(studentId, input)`

Permisos: coach dueño del alumno.

Permite al coach editar solo datos operativos:

- link de rutina;
- notas;
- precio mensual individual de la membresia activa.

Revalida: `/coach/dashboard`.

Auditoria: `STUDENT_UPDATE`.

### `markCoachStudentCurrentMonthPaymentPaid(studentId)`

Permisos: coach dueño del alumno.

Marca el pago del mes actual como pagado. Si no existe pago, lo crea.

Aplica recargo si el pago esta fuera de termino.

Revalida: `/coach/dashboard`, `/admin/pagos` y perfil admin del alumno.

Auditoria: `PAYMENT_MARK_PAID`.

### `markCoachStudentCurrentMonthPaymentPending(studentId)`

Permisos: coach dueño del alumno.

Desmarca el pago del mes actual, dejando estado `PENDING` y `paidAt: null`.

Revalida: `/coach/dashboard`, `/admin/pagos` y perfil admin del alumno.

Auditoria: `PAYMENT_MARK_PENDING`.

## Perfil propio

### `updateStudentProfile(input)`

Permisos: alumno autenticado.

Permite al alumno editar datos propios:

- email;
- telefono;
- nombre/apellido;
- fecha de nacimiento;
- contacto de emergencia;
- imagen.

No permite editar plan, coach, precio, notas internas, rutina ni cambiar horarios directos.

Validaciones:

- email unico;
- telefonos validos;
- fecha de nacimiento valida;
Actualiza la cookie de sesion si cambia email/nombre.

Revalida: `/perfil`, `/admin/alumnos`, perfil admin del alumno.

Auditoria: `STUDENT_UPDATE`.

### `createStudentScheduleChangeRequest(input)`

Permisos: alumno autenticado.

Valida y confirma automáticamente un cambio de horario desde el bloque "Turnos elegidos" del perfil del alumno, sin intervención de admin o coach.

Tipos:

- `ONE_TIME`: reemplaza un unico turno para la proxima clase; no modifica los horarios fijos.
- `PERMANENT`: cambio permanente; actualiza los turnos fijos en el momento.

Siempre exige justificacion.

Validaciones:

- alumno autenticado;
- membresia activa;
- al menos un turno solicitado;
- para `ONE_TIME`, un unico turno actual y un unico turno de reemplazo;
- no permite otro cambio puntual activo para el alumno;
- turnos distintos a los actuales;
- turnos activos del coach asignado;
- turnos de la misma categoria que el plan activo;
- turnos dentro del limite del plan;
- sin dos turnos el mismo dia;
- sin turnos llenos.

Resultado:

- guarda `ScheduleChangeRequest` directamente en estado `APPROVED`, con fecha y nota de procesamiento automatico;
- `ONE_TIME` guarda un turno de origen, un turno de destino y la fecha concreta; el destino se calcula a partir de la proxima clase original;
- mientras esta vigente, el perfil reemplaza visualmente el turno original por el temporal y lo identifica como "Solo por esta clase";
- las listas de asistencia quitan al alumno del turno original y lo agregan al temporal en las fechas correspondientes;
- despues de la clase temporal, el perfil vuelve automaticamente a los turnos fijos;
- `PERMANENT` sincroniza `StudentScheduleAssignment` dentro de la misma transaccion;
- conserva las validaciones de membresia, plan, dias y cupos antes de aplicar el cambio.

Notificaciones:

- informa por mail al alumno, al coach asignado y al email configurado en `ADMIN_NOTIFICATION_EMAIL`;
- el mensaje deja claro que el cambio ya fue confirmado y enlaza al panel correspondiente;
- si falla el mail o no hay destinatario valido, el cambio queda confirmado igual y auditoria guarda `notificationStatus`.

Revalida: `/perfil`, `/coach/dashboard`, `/admin/solicitudes-horarios`, `/admin/alumnos` y perfil admin del alumno.

Auditoria: `SCHEDULE_CHANGE_REQUEST_AUTO_APPROVE`.

### `getScheduleChangeRequests()`

Permisos: admin o coach.

Lista los ultimos cambios de horario, con alumno, coach actual, turnos anteriores, turnos solicitados, cupos y datos de procesamiento.

La pantalla que la consume es `/admin/solicitudes-horarios`, ahora presentada como historial. Los registros pendientes anteriores al cambio automatico todavia pueden resolverse desde ahi.

### `approveScheduleChangeRequest(input)`

Permisos: admin o coach.

Aprueba una solicitud pendiente.

Antes de aprobar vuelve a validar:

- membresia activa;
- limite de turnos del plan;
- turnos activos;
- turnos de la misma categoria que el plan activo;
- sin dos turnos el mismo dia;
- cupos disponibles.

Si la solicitud es permanente, sincroniza `StudentScheduleAssignment`. Si es puntual, solo registra la aprobacion.

Envia mail al alumno con el resultado. Si falla el envio, la aprobacion queda guardada igual y auditoria registra `studentNotificationStatus`.

Auditoria: `SCHEDULE_CHANGE_REQUEST_APPROVE`.

### `rejectScheduleChangeRequest(input)`

Permisos: admin o coach.

Rechaza una solicitud pendiente y guarda nota opcional.

Envia mail al alumno con el resultado. Si falla el envio, el rechazo queda guardado igual y auditoria registra `studentNotificationStatus`.

Auditoria: `SCHEDULE_CHANGE_REQUEST_REJECT`.

### `updateCoachProfile(input)`

Permisos: coach autenticado.

Permite al coach editar su cuenta y perfil:

- email;
- nombre;
- telefono;
- bio;
- especialidad;
- Instagram;
- imagen.

Actualiza cookie de sesion si cambia email/nombre.

Revalida: `/coach/dashboard`, `/admin/alumnos`, `/admin/coaches`, `/admin/usuarios`.
