import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/LegalPage'
import { LegalContact } from '@/components/legal/LegalContact'

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones de uso del sitio, la plataforma y los servicios de Hekademos.',
  alternates: { canonical: '/terminos-y-condiciones' },
  openGraph: { title: 'Términos y condiciones | Hekademos', description: 'Condiciones de uso de Hekademos.', url: '/terminos-y-condiciones' },
}

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones">
      <p>Estos términos describen las condiciones de uso del sitio y la plataforma de Hekademos, que permiten consultar actividades y gestionar cuentas, clases, membresías y participación en la comunidad.</p>
      <LegalContact />
      <h2>1. Cuenta y acceso</h2>
      <p>Las funciones disponibles dependen del perfil asignado a tu cuenta. Proporcioná datos correctos y mantenelos actualizados. Tus credenciales son personales: no compartas tu contraseña y avisá al equipo si detectás un acceso no autorizado.</p>
      <h2>2. Uso de la plataforma y comunidad</h2>
      <p>Utilizá la plataforma con respeto hacia los demás. No publiques contenido ofensivo, ilícito o que exponga datos de otras personas sin autorización. No intentes acceder a cuentas ajenas, alterar registros ni interferir con el funcionamiento del servicio.</p>
      <p>El equipo podrá moderar contenido y restringir accesos ante usos indebidos o problemas de seguridad. Podés comunicarte con Hekademos para consultar o solicitar la revisión de una restricción.</p>
      <h2>3. Clases, horarios y cambios</h2>
      <p>La participación en clases depende del plan acordado, los horarios asignados y la disponibilidad de cupos. Los cambios de horario realizados desde el perfil se confirman automáticamente cuando hay cupo y se cumplen las condiciones del plan. Si no hay cupo, el cambio no se confirma. La recuperación de clases se coordina caso por caso según disponibilidad.</p>
      <p>Si vas a faltar a una clase, avisá a tu entrenador con un mínimo de 24 horas de antelación. Para solicitar un cambio de horario, utilizá la configuración de horarios disponible en tu perfil de alumno.</p>
      <h2>4. Membresías, pagos y cancelaciones</h2>
      <p>Los planes son mensuales y no se renuevan automáticamente. Al principio de cada mes se envía un aviso de pago. El comprobante de pago del mes debe enviarse al entrenador antes del día 11, es decir, hasta el día 10 inclusive. Si no lo enviaste dentro de ese plazo, se aplica un recargo del 20 % sobre el precio del plan elegido. Si ya enviaste el comprobante a tiempo y aún figura un recargo, avisá a tu entrenador para que revise el registro. Confirmá con él el precio y las actividades incluidas antes de contratar o renovar.</p>
      <p>Mientras tu membresía esté activa, Hekademos podrá enviarte por WhatsApp un recordatorio mensual de pago y la confirmación de los cambios de horario que realices. Para recibirlos, necesitamos tu número y tu autorización previa para comunicarnos por ese canal. Podés pedir que dejemos de enviarte mensajes de WhatsApp en cualquier momento mediante los canales de contacto o respondiendo al mensaje; eso no implica la baja de las clases. Si te das de baja, no se enviarán nuevos recordatorios de cuota mientras tu membresía esté inactiva. Cuando WhatsApp no esté disponible, podremos usar el correo electrónico registrado para estos avisos.</p>
      <p>Podés solicitar una baja, cancelación o devolución en cualquier momento, por privado, al entrenador con quien hayas coordinado tu inscripción, o mediante los <Link href="/#contacto">canales de contacto</Link> del sitio. El equipo revisará la solicitud y te informará su resolución. Si contrataste a distancia, conservás el derecho de arrepentimiento dentro del plazo legal aplicable; estas condiciones no limitan tus derechos como consumidor.</p>
      <h2>5. Participación en actividades</h2>
      <p>Respetá las indicaciones del equipo y comunicá las circunstancias relevantes para adaptar tu participación de forma segura. Las rutinas y contenidos de entrenamiento no reemplazan una evaluación profesional de salud.</p>
      <p>Los menores de edad pueden inscribirse siempre que sus adultos responsables estén informados de su inscripción y participación en las actividades. La inscripción debe coordinarse con el entrenador y los adultos responsables.</p>
      <h2>6. Contenidos y servicios de terceros</h2>
      <p>El acceso a materiales, imágenes y rutinas no transfiere derechos de propiedad sobre ellos. Respetá los derechos de sus titulares y compartí únicamente contenido para el que cuentes con autorización. Los servicios externos enlazados desde el sitio tienen sus propias condiciones de uso.</p>
      <h2>7. Disponibilidad</h2>
      <p>El servicio puede experimentar interrupciones por mantenimiento o problemas técnicos. Si una función no está disponible o detectás un error en tus datos, pagos u horarios, contactá al equipo para revisar la situación.</p>
      <h2>8. Datos personales</h2>
      <p>El tratamiento de los datos se describe en la <Link href="/privacidad">Política de privacidad</Link>, incluyendo los canales para realizar consultas y ejercer tus derechos.</p>
      <h2>9. Actualizaciones y consultas</h2>
      <p>Las modificaciones de estos términos se publicarán aquí con su fecha de actualización, sin afectar los derechos adquiridos ni las condiciones previamente acordadas que correspondan. Para cualquier consulta, utilizá los <Link href="/#contacto">canales de contacto de Hekademos</Link>.</p>
    </LegalPage>
  )
}
