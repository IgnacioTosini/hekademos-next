# Migración de Prisma 6 a 7

## Paso 1: estado previo

- Versiones actuales: `prisma` y `@prisma/client` 6.19.3. Node local 24.11.0; TypeScript está declarado como `^5`.
- La aplicación genera `prisma-client-js` en `node_modules` y usa el motor Rust con un binario para Vercel. `next.config.ts` y `scripts/verify-prisma-engine.mjs` comprueban ese empaquetado.
- `prisma.config.ts` ya usa la conexión directa de Neon para migraciones y conserva la conexión agrupada para la aplicación.
- El cliente se crea en `src/lib/prisma.ts`, en los dos seeds, en scripts de mantenimiento y en pruebas de integración. Hay imports directos de `@prisma/client` en acciones y utilidades.
- `package.json` tiene cambios de usuario pendientes sobre `allowScripts`; `vercel.json` y `scripts/vercel-npm.mjs` también tienen cambios pendientes. Conservarlos al actualizar dependencias.
- Línea base local: `npx tsc --noEmit` pasa. `npm test` falla en pruebas que intentan conectar con Neon, que no es accesible desde este entorno; no atribuir esos fallos a la migración.

## Paso 2: actualización local

- Instalados `prisma`, `@prisma/client` y `@prisma/adapter-pg` 7.10.1, además de `pg` y sus tipos. Se mantuvieron los cambios previos de `allowScripts` y Vercel.
- Primero se usó temporalmente `prisma-client-js` con `engineType = "client"`; el paso 3 ya lo sustituyó por `prisma-client`. La conexión de la aplicación usa `PrismaPg`; el CLI sigue usando la URL directa de Neon para migraciones.
- Actualizados seeds, scripts y pruebas que construyen su propio cliente. La verificación de Vercel ahora comprueba el compilador de consultas y el driver PostgreSQL en los traces, sin depender del motor Rust.
- Pasan `prisma generate`, `prisma validate`, TypeScript, lint, 50 pruebas unitarias, 8 pruebas de entorno y `next build`. El build local registra errores de conexión a Neon desde este entorno, pero termina correctamente. No se ejecutaron migraciones.

## Pasos siguientes

### Paso 3: generador nuevo, completado localmente

- `prisma-client` genera TypeScript en `src/generated/prisma`, que permanece ignorado por Git y se regenera en cada build.
- Los imports de la aplicación, seeds, scripts y pruebas apuntan al nuevo cliente. Next lo incluye en sus bundles; los traces de login, perfil y recordatorios contienen el runtime de Prisma y el driver PostgreSQL, sin el cliente antiguo de `node_modules/.prisma`.
- `npm run build`, TypeScript y las 50 pruebas unitarias pasan. No se ejecutaron migraciones ni pruebas de integración contra producción.

### Pendiente

### Paso 4: base temporal local

- Se inicializó una instancia PostgreSQL 18 aislada en `127.0.0.1:55432`, con una base vacía distinta de la configurada en `.env`.
- Prisma 7 descubrió que la migración `20260903150000_payment_session_idempotency` perdía sus tablas temporales entre sentencias. Se envolvió esa migración en una transacción; las 28 migraciones se aplicaron correctamente desde cero.
- `prisma migrate status` indicó que la base está al día; `prisma migrate diff` no encontró diferencias. La segunda ejecución de `migrate deploy` no aplicó nada.
- Pasaron 7 pruebas de integridad, 4 de límite de solicitudes y 3 de concurrencia sobre la base temporal. Tras cargar datos de ensayo y levantar Next en un puerto local, pasaron también las 7 pruebas HTTP de acceso por roles.
- Se detuvieron Next y PostgreSQL; la carpeta de la base temporal fue eliminada.
- Al modificarse una migración histórica ya aplicada, la documentación oficial contempla un aviso por checksum distinto. Se reprodujo localmente ese estado con el checksum original de Git registrado en `_prisma_migrations`: Prisma 7.10.1 ejecutó `migrate deploy` sin errores ni avisos y `migrate status` indicó que la base estaba al día. Este ensayo no sustituye una prueba sobre una copia de la base real.

### Pendiente

1. Antes de desplegar, comprobar `migrate status` en un entorno de ensayo con una copia real de la base y revisar el primer build de Vercel con Prisma 7. La base temporal solo reproduce el historial de migraciones.

Guías: [actualización oficial a Prisma 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) y [estado de versiones](https://www.prisma.io/docs/orm/release-status).
