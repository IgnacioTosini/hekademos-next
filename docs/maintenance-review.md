# Revisión de modularización y dependencias

## Organización

- Las páginas y componentes consumidores usan imports directos para declarar sus dependencias sin atravesar los índices de componentes.
- Los modales de usuarios, coaches, alumnos, planes y turnos se importan dinámicamente y se montan al abrirlos.
- La notificación automática de cambios de horario está en `src/services/schedule-change-notification.ts`. La acción de perfil conserva autenticación, validación, transacción y auditoría.
- `src/utils/schedule.ts` centraliza el texto del rango horario y de la clase; los consumidores agregan su información contextual (coach o fecha).
- `src/lib/app-url.ts` centraliza las URLs configuradas y elimina barras finales para evitar dobles barras en enlaces de correo.
- Se retiraron Formik, Yup y `@types/gsap` del manifiesto y lockfile: los primeros ya no tenían consumidores y GSAP provee sus tipos.

Los índices existentes se conservan como reexportaciones de compatibilidad. No se eliminaron migraciones históricas ni se modificaron datos de alumnos como parte de la refactorización.

## Verificación

`npm run test:all` incluye seis regresiones de notificaciones con Prisma, WhatsApp y email simulados:

1. WhatsApp exitoso: fecha temporal correcta y ningún email.
2. WhatsApp fallido: email únicamente al alumno.
3. Cambio permanente: mensaje de horario fijo.
4. Sin teléfono: respaldo por email.
5. Sin destinatarios válidos: notificación omitida.
6. Ambos canales fallidos: resultado fallido sin registrar destinatarios entregados.

Estas pruebas no envían mensajes reales ni certifican la configuración de proveedores externos.

Resultado de la revisión: 62/62 pruebas aprobadas en `npm run test:all`, ESLint sin errores, TypeScript sin errores y build de producción correcto.

Medición del JavaScript inicial declarado por los manifiestos de cliente del build (suma de archivos únicos, sin compresión):

| Ruta | Antes de esta limpieza | Después |
| --- | ---: | ---: |
| Portada | 123,3 KB | 114,9 KB |
| Perfil del alumno | 192,8 KB | 145,3 KB |
| Administración de alumnos | 158,1 KB | 113,5 KB |
| Panel del coach | 168,7 KB | 130,4 KB |

Esta medición compara paquetes; no sustituye una medición de tiempos de carga con dispositivos y redes reales.

## Dependencias de Prisma: parche aplicado y pendiente restante

La auditoría de npm realizada durante esta revisión reportó cuatro entradas de severidad alta: `prisma`, `@prisma/config`, `deepmerge-ts` y `effect`. Son dos avisos de origen propagados por la misma cadena:

`prisma@6.19.0 → @prisma/config@6.19.0 → deepmerge-ts@7.1.5 / effect@3.18.4`.

- [DeepmergeTS: recursión sobre objetos cíclicos](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). La corrección indicada es 8.0.0; el caso requiere grafos recursivos, no JSON plano.
- [Effect: pérdida o contaminación del contexto en fibras con RPC concurrente](https://github.com/advisories/GHSA-38f7-945m-qr2g). La auditoría marca como afectadas las versiones anteriores a 3.20.0.

En el código inspeccionado, `prisma/config` se usa en la configuración de la herramienta de Prisma. No se encontraron imports directos de estas dos librerías en los handlers de la aplicación. Esto no prueba que toda vía de explotación esté descartada.

Se actualizaron el CLI `prisma` y `@prisma/client` de 6.19.0 a **6.19.3**, fijando ambos a la misma versión exacta. Es un [parche oficial de la rama 6 para corregir Effect](https://github.com/prisma/orm/releases/tag/6.19.3). El lockfile ahora resuelve `@prisma/config@6.19.3` y `effect@3.21.0`.

La auditoría posterior ya no reporta Effect. Persisten **tres entradas de severidad alta por un único aviso de origen**, DeepmergeTS, propagado a `@prisma/config` y `prisma`.

Se conserva `deepmerge-ts@7.1.5`, que es la versión declarada por Prisma 6.19.3. Su [versión 8 incluye cambios incompatibles](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0), entre ellos la forma de combinar Maps. No se forzó un override ni se aplicó el downgrade a Prisma 6.12.0 sugerido por npm, respetando la prioridad de estabilidad solicitada.

El esquema y la configuración de Prisma conservaron sus hashes SHA-256. `prisma migrate status` confirmó las 22 migraciones existentes y el esquema al día; no se ejecutó ninguna migración como parte de este parche.

Validación con Prisma 6.19.3: ambos clientes regenerados, `prisma validate`, ESLint y build con TypeScript correctos, y **62/62 tests aprobados**. No se observaron regresiones en los escenarios probados.
