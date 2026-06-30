# Asistencia

Action cubierto:

- `src/app/actions/attendance.actions.ts`

## Estados de asistencia

Estados soportados:

- `PRESENT`
- `ABSENT`
- `LATE`
- `EXCUSED`

Para `PRESENT` y `LATE`, se guarda `checkInAt`.

## Coach

### `getCoachTodayAttendance()`

Permisos: coach autenticado.

Devuelve los turnos activos del coach para el dia actual.

Incluye:

- schedule id;
- session id si ya existe;
- etiqueta de horario;
- alumnos activos del turno;
- estado de asistencia si ya fue marcado.

Si no hay sesion del dia, igual muestra los alumnos del turno.

### `markCoachStudentAttendance(scheduleId, studentId, status)`

Permisos: coach autenticado y dueño del turno.

Marca asistencia de un alumno para el dia actual.

Hace:

- valida que el turno pertenezca al coach;
- valida que el alumno este asignado al turno;
- crea o actualiza `ClassSession` del dia;
- hace upsert de `Attendance`;
- setea `checkInAt` para `PRESENT` o `LATE`.

Revalida: `/coach/dashboard`.

Auditoria: `ATTENDANCE_MARK_COACH`.

## Admin

### `getAdminAttendanceOverview(input)`

Permisos: admin.

Devuelve los turnos de una fecha, opcionalmente filtrados por coach.

Incluye:

- coach;
- horario;
- alumnos activos;
- estado de asistencia del dia.

Si no se pasa fecha, usa hoy.

### `getAdminMonthlyAttendanceSummary(input)`

Permisos: admin.

Resume asistencias de un mes, opcionalmente por coach.

Devuelve:

- totales por estado;
- lista por alumno con presentes, ausentes, tardes y justificadas;
- ultima asistencia registrada.

### `markAdminStudentAttendance(scheduleId, studentId, status, date)`

Permisos: admin.

Marca asistencia para cualquier turno y fecha.

Hace:

- valida turno activo;
- valida que el alumno pertenezca al turno;
- crea o actualiza `ClassSession`;
- hace upsert de `Attendance`;
- setea `checkInAt` si corresponde.

Revalida:

- `/admin/asistencia`
- `/coach/dashboard`

Auditoria: `ATTENDANCE_MARK_ADMIN`.

### `getAdminTodayAttendanceSummary()`

Permisos: admin.

Devuelve un resumen compacto para el dashboard:

- cantidad de turnos;
- cantidad de alumnos;
- marcados y pendientes;
- presentes, ausentes, tarde, justificadas;
- turnos de hoy con alumnos pero sin asistencia marcada.
