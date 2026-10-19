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
      <p>La participación en clases depende del plan acordado, los horarios asignados y la disponibilidad de cupos. Las solicitudes de cambio requieren revisión y confirmación del equipo; enviarlas no implica que hayan sido aprobadas. La recuperación de clases se coordina caso por caso según disponibilidad.</p>
      <p>Si vas a faltar a una clase, avisá a tu entrenador con un mínimo de 24 horas de antelación. Para solicitar un cambio de horario, utilizá la configuración de horarios disponible en tu perfil de alumno.</p>
      <h2>4. Membresías, pagos y cancelaciones</h2>
      <p>Los planes son mensuales y no se renuevan automáticamente. Al principio de cada mes se envía un aviso de pago. Pasados los primeros 10 días del mes, se aplica un recargo por atraso a las cuotas impagas. Confirmá con tu entrenador el precio del plan, las actividades incluidas y el importe del recargo antes de contratar o renovar.</p>
      <p>Podés solicitar una baja, cancelación o devolución en cualquier momento, por privado, al entrenador con quien hayas coordinado tu inscripción. Las condiciones y la resolución de cada solicitud se conversan directamente con ese entrenador, sin afectar los derechos que correspondan conforme a la normativa aplicable.</p>
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
