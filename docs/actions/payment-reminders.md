# Recordatorios mensuales de cuota

## Funcionamiento

- `vercel.json` programa `GET /api/cron/payment-reminders` el día 1 a las 12:00 UTC (09:00 Argentina). La precisión depende del plan de Vercel; en Hobby puede ejecutarse dentro de esa hora.
- Solo se ejecuta con `VERCEL_ENV=production`, `PAYMENT_REMINDERS_ENABLED=true` y autorización `Bearer CRON_SECRET`. No depende de visitas al sitio. Preview y desarrollo no envían automáticamente.
- Se comprueba el día de Argentina, no el día UTC del servidor.
- Se incluyen alumnos con usuario ACTIVE y membresía ACTIVE ya iniciada y no vencida. Se toma la membresía más reciente y su precio personalizado, si existe.
- Se omite la cuota del período marcada PAID. Un pago realizado pero todavía no registrado por el coach puede recibir recordatorio.
- Se intenta WhatsApp; si falla la API, falta teléfono válido o WhatsApp está desactivado, se intenta el email del alumno por SMTP/Gmail. No se envía al coach ni al administrador.
- Aceptación de la API de WhatsApp no equivale a entrega al teléfono: no hay webhook de estados de entrega. Un rechazo posterior a la aceptación no dispara email. Un timeout ambiguo podría producir ambos mensajes si Meta aceptó antes del corte.
- La tarea no registra pagos ni realiza cobros.

## Variables nuevas en Vercel → Settings → Environment Variables → Production

```dotenv
PAYMENT_REMINDERS_ENABLED=true
CRON_SECRET=REEMPLAZAR_POR_UN_SECRETO_ALEATORIO_DE_AL_MENOS_32_CARACTERES
WHATSAPP_PAYMENT_TEMPLATE_NAME=recordatorio_cuota
WHATSAPP_PAYMENT_TEMPLATE_LANGUAGE=es_AR
```

Conservar `PAYMENT_REMINDER_DAY=1`, WhatsApp productivo (`WHATSAPP_ENABLED=true`, `WHATSAPP_TEST_MODE=false`, `WHATSAPP_PRODUCTION_SENDS_CONFIRMED=true`), credenciales de Meta y SMTP ya configuradas. El envío masivo rechaza el modo de prueba para no redirigir datos de todos los alumnos al número de pruebas. Los tests usan proveedores simulados.

El secreto debe generarse de forma privada (gestor de contraseñas); no copiar el ejemplo literalmente ni subir `.env` al repositorio. Vercel agrega automáticamente el encabezado Authorization usando `CRON_SECRET`.

## Plantilla en Meta

Crear una plantilla de categoría **Utilidad**, nombre `recordatorio_cuota`, español Argentina (`es_AR`), cuerpo con cinco parámetros posicionales:

```text
Hola {{1}}, te recordamos que está pendiente la cuota de {{2}} de Hekademos.

Plan: {{3}}
Importe: {{4}}
Vencimiento: {{5}}

Podés consultar los datos de pago de tu coach en tu perfil. Si ya pagaste, avisale para que registre el pago.

Este es un recordatorio automático de Hekademos.
```

Ejemplos: 1 Ana Pérez; 2 septiembre de 2026; 3 Plan 2; 4 $ 55.000; 5 10/09/2026.

No agregar encabezados, botones ni parámetros extra sin adaptar el envío. Meta decide la aprobación y categoría final. Enviar solamente a alumnos que hayan aceptado notificaciones por WhatsApp; revisar costos y política vigentes de Meta. La aprobación de la plantilla de cambios de horario no aprueba esta nueva plantilla.

## Despliegue en Vercel y Neon

1. Aprobar la plantilla y configurar las variables anteriores en Production. Hasta entonces dejar `PAYMENT_REMINDERS_ENABLED=false`.
2. Respaldar Neon antes del despliegue. Usar el Build Command existente `npm run build:vercel`, que aplica migraciones con `prisma migrate deploy`. La nueva migración `20260904180000_payment_reminder_deliveries` solo agrega una tabla, índices y su relación; no cambia importes ni pagos existentes.
3. Desplegar y verificar en Settings → Cron Jobs que aparezca la tarea. Confirmar que no hubo errores de migración o validación de variables.
4. Revisar Logs después del día 1: contadores por canal, fallidos, duplicados y procesamiento incompleto. No ejecutar un envío masivo real como prueba sin revisar destinatarios.

## Duplicados, errores y reintentos

`PaymentReminderDelivery` guarda una clave única por alumno, mes y tipo (MONTHLY/LATE_WARNING). La misma protección se usa en el botón **Enviar recordatorios** de Admin → Pagos. Un éxito no se reenvía, tampoco al cambiar de canal.

Se procesan páginas de 50 alumnos y grupos de 5 envíos. Se deja de iniciar trabajo después de 210 segundos, con `maxDuration=300`. Si hay fallidos o queda trabajo, el cron responde 503 y registra el resumen. Vercel no reintenta automáticamente los fallos; usar el botón del admin para continuar/reintentar, eligiendo el mismo mes. El botón conserva el aviso LATE_WARNING del día configurado (por defecto 9), que es un tipo distinto; fuera de ese día usa MONTHLY. El cron solo envía MONTHLY el día 1, no programa avisos de mora.

FAILED se puede reclamar de nuevo mediante una actualización atómica; SENT y PROCESSING no. Si la función se corta tras aceptar el proveedor, un registro puede quedar PROCESSING: revisar primero la entrega con el proveedor, usando messageId si está disponible. No resetear estos registros a ciegas: podría duplicar mensajes. No se promete entrega exactamente una vez entre la base y un proveedor externo.

Para desactivar futuros envíos automáticos, cambiar `PAYMENT_REMINDERS_ENABLED=false` y redesplegar; el botón manual sigue disponible.

Referencias: [administración, seguridad y reintentos de cron en Vercel](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [límites de programación](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Verificación local (4 de septiembre de 2026)

78 tests aprobados: 35 unitarios/notificaciones/cron, 6 de entorno, 7 de integridad, 4 de rate limit, 3 de concurrencia PostgreSQL, 7 de permisos y 16 flujos de navegador. Incluyen 16 pruebas nuevas de este cambio (respaldo, fechas, plantilla, paginación, duplicados, concurrencia y seguridad). ESLint, TypeScript y build correctos. El endpoint real sin autorización devolvió 401. Migración aplicada solamente en PostgreSQL local; 23 migraciones al día. No se enviaron recordatorios reales ni se modificó Vercel/Neon.
