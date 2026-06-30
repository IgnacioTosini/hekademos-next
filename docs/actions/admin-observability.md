# Auditoria, alertas y helpers

Actions y helpers cubiertos:

- `src/app/actions/audit.actions.ts`
- `src/app/actions/alert.actions.ts`
- `src/app/actions/_shared.ts`
- `src/lib/admin-session.ts`
- `src/lib/auth-session.ts`

## Auditoria

### `getAuditLogs()`

Permisos: admin.

Devuelve los ultimos 150 movimientos de `AuditLog`, ordenados del mas nuevo al mas viejo.

Campos principales:

- actor: id, email y rol;
- action;
- entityType;
- entityId;
- metadata;
- fecha.

Actions que actualmente escriben auditoria:

- creacion/edicion de alumnos;
- cambios de perfil del alumno;
- cambios de alumno hechos por coach;
- pagos marcados/desmarcados;
- detalles de pago;
- recordatorios de pago;
- asistencia marcada por coach o admin.

## Alertas admin

### `getAdminAlerts()`

Permisos: admin.

Construye alertas operativas para el dashboard.

Alertas actuales:

- pagos atrasados despues del dia de vencimiento;
- alumnos activos sin plan;
- alumnos activos sin turnos;
- turnos de hoy con alumnos pero sin asistencia marcada;
- alumnos con 2 o mas ausencias en el mes;
- alumnos activos sin rutina;
- alumnos activos sin coach asignado.

Cada alerta devuelve:

- id;
- titulo;
- descripcion;
- href;
- severidad `HIGH`, `MEDIUM` o `LOW`;
- count;
- items clickeables.

## `_shared.ts`

### `ActionResponse<T>`

Formato comun de respuesta para actions.

```ts
{ ok: true, data: T }
{ ok: false, data: null, error: string }
```

### Paths admin

Constantes usadas para `revalidatePath`:

- `adminUsersPath`
- `adminStudentsPath`
- `adminCoachesPath`
- `adminPaymentsPath`
- `adminMembershipPlansPath`
- `adminClassSchedulesPath`

### Includes compartidos

- `userInclude`: imagen, student y coach.
- `coachInclude`: imagen, student y coach con alumnos.

### Helpers

- `normalizeEmail(email)`: trim + lowercase.
- `toDate(value)`: normaliza `Date | string | null`.
- `getUserWithRelations(id)`: busca usuario y sanitiza.
- `getCoachWithRelations(id)`: busca coach user y sanitiza.
- `sanitizeUserForClient(user)`: elimina `passwordHash` de usuario y relaciones anidadas.

## Sesion admin

`requireAdminSession()` valida que exista sesion y rol `ADMIN`.

Se usa en actions administrativos. Si falla, los actions devuelven un mensaje amigable con `getAdminActionErrorMessage`.

## Sesion auth

`auth-session.ts` maneja:

- crear token de sesion;
- verificar token;
- leer cookie actual;
- setear cookie;
- limpiar cookie.

La cookie guarda datos minimos: userId, email, nombre, rol y vencimiento.
