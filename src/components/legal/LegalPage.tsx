import Link from 'next/link'
import type { ReactNode } from 'react'
import './legal.scss'

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="legalPage">
      <article>
        <Link href="/">← Volver al inicio</Link>
        <h1>{title}</h1>
        <p className="legalDate">Última actualización: <time dateTime="2026-10-19">19 de octubre de 2026</time></p>
        {children}
        <nav aria-label="Información legal">
          <Link href="/privacidad">Política de privacidad</Link>
          <Link href="/terminos-y-condiciones">Términos y condiciones</Link>
          <Link href="/#contacto">Contactar a Hekademos</Link>
        </nav>
      </article>
    </main>
  )
}
