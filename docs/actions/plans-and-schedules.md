# Planes y turnos

Actions cubiertos:

- `src/app/actions/membership.actions.ts`
- `src/app/actions/class.actions.ts`

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
- dias por semana mayor a cero;
- precio no negativo;
- moneda normalizada a mayusculas, default `ARS`.

Revalida:

- `/admin/planes`
- `/admin/alumnos`

### `updateMembershipPlan(id, input)`

Permisos: admin.

Actualiza nombre, dias por semana, precio, moneda, recomendado y activo.

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

Lista turnos activos con coach y cupos disponibles.

Se usa en formularios donde el alumno puede ver/elegir horarios.

Ordena por dia y hora.

### `getAdminWeeklyClassSchedules()`

Permisos: admin.

Lista todos los turnos con:

- coach e imagen;
- alumnos asignados;
- cupos ocupados;
- cupos disponibles.

Ordena por dia, hora y nombre de coach.

### `createWeeklyClassSchedule(input)`

Permisos: admin.

Crea un turno semanal.

Validaciones:

- dia obligatorio;
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
- mantiene la regla de no duplicar dia/hora/coach.

Revalida:

- `/admin/turnos`
- `/admin/alumnos`

### `deleteWeeklyClassSchedule(id)`

Permisos: admin.

Si el turno tiene asignaciones, no lo borra: lo marca `isActive: false`.

Si no tiene asignaciones, lo elimina.

Esto conserva relacion historica y evita romper alumnos ya asignados.
