# Pagos

Action cubierto:

- `src/app/actions/payment.actions.ts`

## Conceptos

El pago se mira por periodo mensual. El action normaliza `month` y `year`; si no vienen, usa el mes actual.

El vencimiento y recargo se calculan desde `src/utils/payment.ts`.

Actualmente:

- el pago del mes se busca por `dueDate` o `paidAt` dentro del periodo;
- si esta pendiente y vencido, se muestra monto con recargo;
- si ya esta pagado, se respeta el monto guardado en el pago.

## `getPaymentOverview(input)`

Permisos: admin.

Devuelve una fila por alumno con:

- alumno;
- coach;
- membresia activa para el periodo;
- pago del mes;
- ultimo pago;
- historial de pagos;
- estado calculado;
- monto base y monto final;
- moneda;
- fecha de inicio y vencimiento;
- si esta fuera de termino;
- porcentaje de recargo.

Estados posibles de la vista:

- `PAID`
- `PENDING`
- `REFUNDED`
- `CANCELLED`
- `NO_MEMBERSHIP`

## `markCurrentMonthPaymentPaid(studentId, input)`

Permisos: admin.

Marca como pagado el pago del periodo seleccionado.

Hace:

- busca alumno y membresia activa;
- busca pago existente del periodo;
- calcula monto con recargo si corresponde;
- actualiza el pago existente o crea uno nuevo;
- setea `status: PAID`, `paidAt` y `dueDate`.

Revalida:

- `/admin/pagos`
- `/admin/alumnos`
- `/admin/alumnos/[studentId]`

Auditoria: `PAYMENT_MARK_PAID`.

## `markCurrentMonthPaymentPending(studentId, input)`

Permisos: admin.

Desmarca un pago del periodo seleccionado.

Hace:

- busca el pago por `dueDate` o `paidAt`;
- cambia `status` a `PENDING`;
- limpia `paidAt`;
- mantiene/actualiza `dueDate`.

Revalida:

- `/admin/pagos`
- `/admin/alumnos`
- `/admin/alumnos/[studentId]`

Auditoria: `PAYMENT_MARK_PENDING`.

## `savePaymentDetails(studentId, input)`

Permisos: admin.

Guarda referencia y notas internas del pago mensual.

Si el pago no existe y el alumno tiene membresia activa, crea un pago `PENDING`.

No marca automaticamente como pagado.

Revalida pagos y perfil del alumno.

Auditoria: `PAYMENT_DETAILS_UPDATE`.

## `sendPaymentReminderEmails(input)`

Permisos: admin.

Envia recordatorios de pago por email para el periodo seleccionado.

Importante: no es automatico. Se ejecuta cuando el admin aprieta el boton.

Hace:

- decide tipo de recordatorio por fecha o por `input.reminderType`;
- recorre alumnos con membresia activa;
- saltea usuarios inactivos;
- saltea emails no entregables o de prueba;
- saltea alumnos ya pagos;
- calcula monto actual y monto con recargo;
- envia email con `buildEmailMessage` y `sendEmail`.

Devuelve contadores:

- `sentCount`: enviados;
- `failedCount`: fallaron al enviar;
- `alreadyPaidCount`: ya estaban pagados;
- `invalidEmailCount`: email invalido o de prueba;
- `skippedCount`: sin membresia activa o usuario no activo.

Auditoria: `PAYMENT_REMINDER_EMAILS`.

Notas:

- Los recordatorios automaticos de dia 1 y dia 9 no estan activos todavia.
- Si se agregan mas adelante, conviene crear un endpoint cron protegido y reutilizar esta misma logica.
