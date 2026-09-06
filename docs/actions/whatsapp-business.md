# WhatsApp Business

La integracion usa WhatsApp Business Platform Cloud API. No depende de la aplicacion movil WhatsApp Business.

## Configuracion

Variables secretas provistas por Meta:

```env
ACCESS_TOKEN_WHATSAPP_BUSINESS=""
PHONE_NUMBER_ID=""
WHATSAPP_BUSINESS_ACCOUNT_ID=""
```

Variables de control que se deben agregar para habilitar la prueba:

```env
WHATSAPP_ENABLED="true"
WHATSAPP_TEST_MODE="true"
WHATSAPP_TEST_RECIPIENT="+549..."
WHATSAPP_API_VERSION="v25.0"
WHATSAPP_SCHEDULE_TEMPLATE_NAME="hello_world"
WHATSAPP_SCHEDULE_TEMPLATE_LANGUAGE="en_US"
```

`WHATSAPP_TEST_RECIPIENT` debe ser un numero autorizado en la lista de destinatarios de prueba de Meta y debe escribirse en formato internacional, con `+` y codigo de pais.

El token temporal de la pantalla de configuracion de Meta expira. Para produccion se debe reemplazar por un token de usuario del sistema y nunca debe guardarse en Git.

Si Meta responde con `WhatsApp API 190: Authentication Error`, genera otro token en **Configuracion de la API > Generar token de acceso**, copia solo el token (sin escribir `Bearer`) y reemplaza `ACCESS_TOKEN_WHATSAPP_BUSINESS`. El token y `PHONE_NUMBER_ID` deben pertenecer a la misma app y al mismo numero de prueba. Luego reinicia por completo el servidor de Next.js para que vuelva a leer `.env`.

Si Meta responde con `WhatsApp API 131030`, el valor de `WHATSAPP_TEST_RECIPIENT` no esta en la lista de destinatarios permitidos del numero de prueba. En **Configuracion de la API**, abre el selector **Para**, agrega y verifica ese numero o copia en `.env` uno que ya figure como autorizado. Los digitos deben coincidir exactamente con los que muestra Meta; no se debe agregar ni quitar el `9` de Argentina manualmente.

## Modo seguro de prueba

- `WHATSAPP_ENABLED` es `false` por defecto.
- `WHATSAPP_TEST_MODE` es `true` por defecto.
- Mientras el modo de prueba este activo, todos los mensajes se redirigen a `WHATSAPP_TEST_RECIPIENT` y nunca al telefono real del alumno.
- Si WhatsApp acepta el mensaje, no se envia tambien un email al alumno.
- Si falta configuracion, el numero no es valido, el token expiro o Meta rechaza el mensaje, el cambio de horario igualmente se confirma y se intenta enviar el email de respaldo al alumno.
- Los cambios automaticos no envian email al coach ni a administracion. El alumno recibe WhatsApp y solo recibe email cuando WhatsApp falla, esta deshabilitado o no hay un telefono valido.

## Plantilla de cambios de horario

La integracion usa `hello_world` mientras se prueba la conexion. Esa plantilla no muestra los datos del cambio.

Para enviar el contenido real se debe crear y aprobar una plantilla de utilidad, por ejemplo `cambio_horario_confirmado`, con idioma `es_AR` y tres variables en este orden:

1. nombre del alumno;
2. turno nuevo;
3. vigencia del cambio.

Plantilla creada en Meta con el nombre `cambio_horario_confirmado`, categoria `UTILITY` e idioma `es_AR`:

```text
Hola {{1}}, confirmamos el cambio de horario que solicitaste.

Nuevo horario: {{2}}
Vigencia: {{3}}

Este es un mensaje automatico de Hekademos.
```

Cuando Meta apruebe la plantilla:

```env
WHATSAPP_SCHEDULE_TEMPLATE_NAME="cambio_horario_confirmado"
WHATSAPP_SCHEDULE_TEMPLATE_LANGUAGE="es_AR"
```

Para un cambio puntual, la vigencia aclara la fecha y que luego el alumno vuelve a su horario habitual. Para un cambio permanente, indica que el nuevo horario queda fijo.

## Cambios temporales en el perfil

- El selector muestra la fecha exacta de la proxima ocurrencia junto al dia y horario.
- Antes de confirmar se muestra un resumen con la clase habitual que se reemplaza y la clase temporal elegida, ambas con su fecha completa.
- El alumno puede cancelar el cambio antes de la primera clase involucrada.
- La cancelacion vuelve a calcular el cupo efectivo del turno habitual dentro de una transaccion. Si otro alumno ya ocupo ese lugar, la cancelacion se bloquea y se indica que debe comunicarse con administracion.
- Al cancelar, la solicitud se conserva en el historial con estado `CANCELLED`; no se elimina.

## Produccion

Antes de desactivar `WHATSAPP_TEST_MODE` se debe:

- registrar un numero empresarial real;
- configurar un token permanente y metodo de pago;
- almacenar el consentimiento explicito del alumno;
- normalizar los telefonos de los alumnos a formato internacional;
- revisar plantillas y bajas de suscripcion;
- configurar webhooks si se necesitan estados de entrega o respuestas.

Una vez completados esos requisitos, se habilita expresamente el envio real:

```env
WHATSAPP_TEST_MODE="false"
WHATSAPP_PRODUCTION_SENDS_CONFIRMED="true"
```

Sin esa confirmacion adicional, el transporte rechaza los envios productivos y conserva el email de respaldo.
