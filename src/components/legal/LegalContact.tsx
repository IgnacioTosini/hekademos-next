import Link from 'next/link'
import { isDeliverableEmail } from '@/lib/form-validation'
import { businessAddressLabel } from '@/lib/business-location'

export function LegalContact() {
  const email = process.env.CONTACT_TO_EMAIL?.trim()

  return (
    <p>
      Hekademos está a cargo de Juan Pablo Iglesias, Victoria Menendez y Dalmiro Mandrini.
      {' '}Para consultas sobre estas condiciones o tus datos personales,{' '}
      {email && isDeliverableEmail(email)
        ? <>escribí a <a href={`mailto:${email}`}>{email}</a> o utilizá el </>
        : <>utilizá el </>}
      <Link href="/#contacto">formulario de contacto</Link>.
      {' '}La dirección de las actividades es {businessAddressLabel}.
    </p>
  )
}
