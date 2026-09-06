# Planes y turnos

Actions cubiertos:

- `src/app/actions/membership.actions.ts`
- `src/app/actions/class.actions.ts`
- `src/app/actions/classCategory.actions.ts`

## Categorias de clase

### `getClassCategories()`

Devuelve el catalogo compartido de categorias. Cada categoria incluye su nombre y el indicador `isSpecialActivity`, que permite marcarla como actividad especial o evento. En Planes se administra el catalogo y en Turnos solo se puede seleccionar una categoria existente.

### `createClassCategory(input)`

Crea una categoria desde el mini ABM disponible al crear o editar un plan. Valida nombres de entre 2 y 60 caracteres y evita duplicados.

### `updateClassCategory(id, input)`

Actualiza el nombre y el indicador de actividad especial. Si cambia el nombre, la categoria compartida se renombra en todos los planes y turnos dentro de una transaccion. De esta forma no se pierden ni se desactivan las asignaciones de alumnos.

### `deleteClassCategory(id)`

Elimina una categoria solo cuando no esta siendo usada por ningun plan o turno.

## Planes de membresia

### `getMembershipPlans()`

Permisos: publico/app.

Lista planes activos ordenados por dias de entrenamiento por semana.

Se usa donde un alumno o formulario necesita elegir plan sin entrar al panel admin.

### `getAdminMembershipPlans()`

Permisos: admin.

Lista todos los planes, activos o no, incluyendo membresias relacionadas.

### `createMembershipPlan(input)`

Permisos: admin.

Crea un plan.

Validaciones:

- nombre obligatorio;
- categoria de clase obligatoria y existente en el catalogo;
- dias por semana mayor a cero;
- precio no negativo;
- moneda normalizada a mayusculas, default `ARS`.

Revalida:

- `/admin/planes`
- `/admin/alumnos`

### `updateMembershipPlan(id, input)`

Permisos: admin.

Actualiza nombre, categoria, dias por semana, precio, moneda, recomendado y activo.

Si se elige otra categoria se protege la compatibilidad de los alumnos activos. Los cambios de nombre se realizan desde el mini ABM de categorias y conservan la relacion entre planes, turnos y alumnos.

Revalida:

- `/admin/planes`
- `/admin/alumnos`
- `/admin/pagos`

### `deleteMembershipPlan(id)`

Permisos: admin.

Si el plan tiene membresias asociadas, no lo borra: lo desactiva y quita `isRecommended`.

Si no tiene membresias, lo elimina.

Esto evita romper historial de alumnos.

## Turnos semanales

### `getWeeklyClassSchedules()`

Permisos: publico/app.

Lista turnos activos con categoria, coach y cupos disponibles.

Se usa en formularios donde el alumno puede ver/elegir horarios.

Ordena por dia y hora.

### `getAdminWeeklyClassSchedules()`

Permisos: admin.

Lista todos los turnos con:

- coach e imagen;
- categoria de clase;
- alumnos asignados;
- cupos ocupados;
- cupos disponibles.

Ordena por dia, hora y nombre de coach.

### `createWeeklyClassSchedule(input)`

Permisos: admin.

Crea un turno semanal.

Validaciones:

- dia obligatorio;
- categoria obligatoria y previamente creada desde Planes;
- hora obligatoria;
- formato de hora `HH:mm`;
- duracion minima 15 minutos;
- capacidad mayor a cero si existe;
- no permite duplicar dia, hora y coach.

Revalida:

- `/admin/turnos`
- `/admin/alumnos`

### `updateWeeklyClassSchedule(id, input)`

Permisos: admin.

Actualiza un turno semanal.

Validaciones extra:

- si cambia capacidad, no puede quedar por debajo de los cupos ocupados;
- al elegir otra categoria existente se protegen los alumnos asignados;
- no permite crear ni renombrar categorias desde Turnos;
- mantiene la regla de no duplicar dia/hora/coach.

Revalida:

- `/admin/turnos`
- `/admin/alumnos`

### `deleteWeeklyClassSchedule(id)`

Permisos: admin.

Si el turno tiene asignaciones, no lo borra: lo marca `isActive: false`.

Si no tiene asignaciones, lo elimina.

Esto conserva relacion historica y evita romper alumnos ya asignados.

## Compatibilidad entre planes y turnos

Cada plan y cada turno tienen una unica categoria. Los selectores de horarios muestran solo turnos de la categoria del plan activo y las actions vuelven a validar esa coincidencia antes de crear alumnos, actualizar sus turnos o confirmar cambios de horario.

La primera migracion asigna `Calistenia` a los planes y turnos existentes. La migracion siguiente convierte el enum a texto editable y crea el catalogo dinamico sin modificar `StudentScheduleAssignment`. Las categorias permiten mostrar clases distintas en el mismo dia y horario, por ejemplo Calistenia y Movilidad con coaches diferentes.
