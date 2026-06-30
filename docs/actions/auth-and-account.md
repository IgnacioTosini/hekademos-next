# Auth y cuenta

Actions cubiertos:

- `src/app/actions/auth.actions.ts`
- `src/app/actions/account.actions.ts`

## `login(input)`

Inicia sesion con email y contraseña.

Permisos: publico.

Hace:

- normaliza el email;
- valida que email y contraseña existan;
- permite un admin bootstrap por `.env` con `ADMIN_EMAIL` y `ADMIN_PASSWORD`;
- busca el usuario en DB;
- rechaza usuarios inexistentes, sin password o no activos;
- verifica la contraseña con `verifyPassword`;
- crea cookie de sesion con `setAuthSessionCookie`;
- devuelve el destino segun rol:
  - `ADMIN` -> `/admin`
  - `COACH` -> `/coach/dashboard`
  - `STUDENT` -> `/perfil`

Importante: el admin bootstrap usa id fijo `env-admin`, no viene de Prisma.

## `logout()`

Cierra sesion.

Permisos: publico.

Hace:

- limpia la cookie de sesion con `clearAuthSessionCookie`;
- devuelve `{ ok: true }`.

## `requestPasswordReset(input)`

Genera y envia el email para restablecer contraseña.

Permisos: publico.

Hace:

- normaliza el email;
- si el usuario no existe o no esta activo, responde `sent: true` igual para no filtrar cuentas;
- invalida tokens anteriores no usados;
- crea un token aleatorio, guarda solo su hash SHA-256;
- vence en 60 minutos;
- arma la URL `/auth/restablecer?token=...`;
- envia email con Nodemailer mediante `buildEmailMessage` y `sendEmail`;
- en desarrollo puede devolver `resetUrl`, en produccion no.

Importante: si falla el envio de email en produccion no filtra el detalle al usuario.

## `resetPassword(input)`

Aplica una contraseña nueva usando un token de recuperacion.

Permisos: publico con token valido.

Hace:

- valida token y contraseña minima de 6 caracteres;
- hashea el token recibido y lo busca en `PasswordResetToken`;
- rechaza tokens vencidos, usados o de usuarios no activos;
- actualiza `passwordHash`;
- marca ese token como usado;
- invalida otros tokens activos del mismo usuario.

## `getCurrentUser()`

Devuelve el usuario de la cookie actual, si existe.

Permisos: sesion opcional.

Hace:

- lee `getCurrentAuthSession`;
- si no hay sesion, devuelve `data: null`;
- si hay sesion, devuelve id, email, nombre y rol.

## `changeCurrentUserPassword(input)`

Cambia la contraseña del usuario logueado.

Permisos: cualquier usuario autenticado.

Hace:

- exige sesion;
- valida contraseña actual, nueva y confirmacion;
- exige minimo 6 caracteres;
- busca el usuario actual;
- exige que tenga `passwordHash`;
- verifica la contraseña actual;
- guarda el nuevo hash;
- revalida `/perfil` y `/coach/dashboard`.
