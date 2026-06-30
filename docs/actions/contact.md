# Contacto

Actions cubiertos:

- `src/app/actions/contact.actions.ts`

## `sendContactMessage(input)`

Permisos: publico.

Envia el formulario de contacto de la landing usando Nodemailer.

Valida en servidor:

- nombre entre 2 y 80 caracteres;
- email entregable;
- mensaje entre 10 y 1200 caracteres;
- destinatario configurado.

Destinatario:

- primero usa `CONTACT_TO_EMAIL`;
- si no existe, usa `ADMIN_NOTIFICATION_EMAIL`;
- si no existe, usa `EMAIL_FROM_ADDRESS`;
- si no existe, usa `SMTP_USER`.

El email sale con `replyTo` apuntando al email del visitante, para poder responder directamente desde el cliente de correo.
