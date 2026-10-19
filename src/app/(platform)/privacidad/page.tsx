import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/LegalPage'
import { LegalContact } from '@/components/legal/LegalContact'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Cómo Hekademos utiliza los datos de contacto, cuentas y actividades de sus usuarios.',
  alternates: { canonical: '/privacidad' },
  openGraph: { title: 'Política de privacidad | Hekademos', description: 'Información sobre el tratamiento de datos personales en Hekademos.', url: '/privacidad' },
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad">
      <p>Esta política describe el tratamiento de datos personales en el sitio y la plataforma de Hekademos. Para consultas sobre tus datos, podés comunicarte con el equipo a través de nuestros <Link href="/#contacto">canales de contacto</Link>.</p>
      <LegalContact />
      <h2>1. Qué información se utiliza</h2>
      <ul>
        <li>Consultas: nombre, correo electrónico y el mensaje que enviás desde el formulario de contacto.</li>
        <li>Cuenta y perfil: nombre, correo electrónico, teléfono, foto de perfil y datos necesarios para autenticarte. Las contraseñas se almacenan mediante un resumen criptográfico, no como texto legible.</li>
        <li>Actividad como alumno: fecha de nacimiento, contacto de emergencia, profesor asignado, rutinas, observaciones, membresías, registros de pagos, asistencias, horarios y solicitudes de cambio, cuando estos datos se incorporan a tu perfil.</li>
        <li>Comunidad: publicaciones, comentarios y datos de autoría asociados a tu participación.</li>
        <li>Funcionamiento y seguridad: información técnica de las solicitudes, registros de acciones y datos utilizados para prevenir abusos y conocer el uso del sitio.</li>
      </ul>
      <h2>2. Para qué se utilizan</h2>
      <p>Los datos permiten responder consultas, administrar el acceso a la plataforma, organizar clases y membresías, registrar pagos y asistencias, gestionar rutinas y solicitudes, y mantener la seguridad del servicio. Los campos requeridos son necesarios para completar la operación correspondiente; los datos opcionales pueden omitirse.</p>
      <h2>3. Comunicaciones por correo y WhatsApp</h2>
      <p>Los datos de contacto pueden utilizarse para comunicaciones relacionadas con tu cuenta y actividad, como recuperación de contraseña, avisos de horarios y recordatorios de pago. El envío por correo o WhatsApp depende de los canales habilitados. Podés consultar al equipo sobre tus preferencias de comunicación.</p>
      <h2>4. Acceso y servicios externos</h2>
      <p>El personal autorizado accede a la información según sus funciones de administración y enseñanza. El contenido que compartís en la comunidad puede ser visible para otros usuarios con acceso a ese espacio.</p>
      <p>El sitio utiliza servicios de alojamiento y analítica de Vercel, gestión de imágenes de Cloudinary y proveedores de correo. Cuando se habilita la integración con WhatsApp, intervienen los servicios de Meta. Estos proveedores pueden procesar información en otros países. Los enlaces y contenidos de terceros, como YouTube e Instagram, están sujetos también a sus propias políticas de privacidad.</p>
      <h2>5. Cookies y analítica</h2>
      <p>La plataforma utiliza una cookie de sesión para mantener tu acceso a las áreas privadas. Bloquearla puede impedir el inicio de sesión. También integra Vercel Analytics para obtener estadísticas de uso del sitio.</p>
      <h2>6. Conservación y seguridad</h2>
      <p>Al darse de baja, el perfil del alumno se desactiva y deja de mostrarse como activo. Sus datos se conservan para facilitar su reincorporación si decide volver; la baja de la membresía no implica la eliminación de la información.</p>
      <p>Si querés que tus datos se eliminen por completo, solicitalo expresamente al equipo mediante los canales de contacto indicados en esta página. Se atenderá tu solicitud, salvo los registros que deban conservarse por obligaciones legales aplicables, sobre los que se te informará al responder.</p>
      <p>La plataforma aplica controles de acceso por rol y medidas de protección de credenciales; ningún sistema elimina por completo los riesgos de seguridad.</p>
      <h2>7. Tus derechos y solicitudes</h2>
      <p>Podés solicitar acceso, actualización, rectificación o supresión de tus datos mediante los <Link href="/#contacto">canales de contacto</Link>, indicando qué información querés consultar o modificar. Para proteger tu información, puede ser necesario verificar tu identidad. No envíes contraseñas ni información sensible en el formulario.</p>
      <p>En Argentina, podés consultar información sobre estos derechos y las vías de reclamo ante la <a href="https://www.argentina.gob.ar/aaip/datospersonales/derechos">Agencia de Acceso a la Información Pública (AAIP)</a>.</p>
      <h2>8. Cambios en esta política</h2>
      <p>Las actualizaciones se publicarán en esta página con su fecha de revisión. Si tenés dudas sobre el tratamiento de tus datos, contactá al equipo antes de proporcionar información adicional.</p>
    </LegalPage>
  )
}
