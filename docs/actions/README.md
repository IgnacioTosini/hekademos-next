# Actions

Esta carpeta documenta los server actions principales del proyecto.

La idea no es repetir linea por linea el codigo, sino dejar por escrito:

- que hace cada action;
- quien puede llamarlo;
- que datos toca;
- que rutas revalida;
- que efectos secundarios importantes tiene, como auditoria, emails o cookies.

## Convenciones generales

Todos los actions devuelven `ActionResponse<T>` desde `src/app/actions/_shared.ts`:

```ts
{ ok: true, data: T }
{ ok: false, data: null, error: string }
```

Los actions administrativos llaman a `requireAdminSession()`. Si la sesion no es admin, el helper devuelve un error traducible como "Necesitas iniciar sesion como admin".

Los datos de usuario que vuelven al cliente pasan por `sanitizeUserForClient()` cuando aplica, para que `passwordHash` no viaje al frontend.

## Archivos

- [auth-and-account.md](./auth-and-account.md): login, logout, recuperacion y cambio de contraseña.
- [contact.md](./contact.md): formulario publico de contacto por email.
- [users-students-coaches.md](./users-students-coaches.md): usuarios, alumnos, coaches y perfiles.
- [payments.md](./payments.md): resumen de pagos, marcar pagos, detalles y recordatorios por email.
- [attendance.md](./attendance.md): asistencia del coach y del admin.
- [plans-and-schedules.md](./plans-and-schedules.md): planes de membresia y turnos semanales.
- [admin-observability.md](./admin-observability.md): auditoria, alertas y helpers compartidos.
