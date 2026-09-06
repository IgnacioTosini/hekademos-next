# Teléfonos con código de país

El teléfono principal de alumnos, coaches y usuarios se edita con un selector de país (Argentina por defecto) y el número nacional. El teléfono sigue siendo opcional; si se informa, debe tener longitud y código de país posibles. Esto no verifica que la línea exista o tenga WhatsApp.

El mismo campo se usa en los perfiles de alumno/coach y en los formularios administrativos de usuarios, alumnos y coaches. El coach que edita a un alumno usa el formulario compartido de alumnos. Los teléfonos de emergencia conservan su validación anterior y no se convierten a números móviles.

`src/utils/phone.ts` centraliza la normalización usando `libphonenumber-js/min`. Las acciones del servidor vuelven a validar y guardan el teléfono principal en formato internacional con `+`. La API de WhatsApp y los enlaces `wa.me` usan la misma normalización y eliminan el `+` al enviar.

Para la compatibilidad con los datos históricos del gimnasio, un número sin prefijo internacional se interpreta como argentino. Se admiten el 0 de acceso nacional y el 15 móvil después del código de área. Por ejemplo, `02234268951` o `0223 15 4268951` se convierten en `+5492234268951`. Los números de otros países deben tener `+`/`00` o ingresarse con el selector. Para Argentina se usa el formato móvil de WhatsApp con +54 9.

No se realiza una migración masiva de datos: los números antiguos se normalizan al guardar o al preparar el envío. No hay variables de entorno nuevas ni migraciones de Prisma. El despliegue debe incluir `package-lock.json` para instalar la nueva dependencia.

Los nombres de país en `phone-countries.ts` son estáticos para evitar diferencias de traducción entre SSR y navegador. Sus códigos se corresponden con los metadatos de la biblioteca instalada; revisar la lista al actualizar la dependencia.

La autorización de destinatarios en la cuenta de prueba de Meta, el token y las plantillas siguen siendo requisitos independientes del formato del teléfono.

Verificación local: cinco pruebas nuevas de normalización y envío simulado; pruebas de navegador con teléfono inválido, cambio de país, pegado internacional, reapertura del perfil y normalización en la base. También se verificó el campo a 390 px de ancho. Los envíos de WhatsApp estuvieron desactivados en el servidor de QA. No se enviaron mensajes reales ni se modificó Neon.
