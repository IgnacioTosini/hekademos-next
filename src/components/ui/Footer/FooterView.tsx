import { FaInstagram, FaYoutube } from 'react-icons/fa'
import { NavbarLinks } from '../NavbarLinks/NavbarLinks'
import Image from 'next/image'
import Link from 'next/link'
import './_footer.scss'
import type { HomePageContent } from '@/lib/home-page-content'
import { siteImageStyle } from '@/lib/site-image-style'

export const FooterView = ({ content, navigation }: { content: HomePageContent['footer']; navigation: HomePageContent['navigation'] }) => {
  return (
    <footer className="footer">
      <div className="footerInner">
        <div className="footerMain">
          <div className="footerBrand">
            <Link href="/" className="footerBrandLink" aria-label="Hekademos, ir al inicio">
              <Image src={content.logo.url} alt="" style={siteImageStyle(content.logo)} width={52} height={52} quality={90} />
              <span>HEKADEMOS</span>
            </Link>
            <p className="footerTagline">{content.tagline}</p>
          </div>

          <nav className="footerNavigation" aria-label="Secciones del sitio">
            <h2>{content.linksTitle}</h2>
            <NavbarLinks isFooter links={navigation.menuLinks} />
          </nav>

          <div className="footerSocial">
            <h2>{content.socialTitle}</h2>
            <div className="socialMediasContainer">
              <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram de Hekademos"><FaInstagram aria-hidden="true" /><span>Instagram</span></a>
              <a href={content.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube de Hekademos"><FaYoutube aria-hidden="true" /><span>YouTube</span></a>
            </div>
          </div>
        </div>

        <div className="footerBottom">
          <p>© {new Date().getFullYear()} {content.copyright}</p>
          <nav className="legalLinks" aria-label="Información legal">
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/terminos-y-condiciones">Términos y condiciones</Link>
          </nav>
          <p className="footerCredit">{content.credit}</p>
        </div>
      </div>
    </footer>
  )
}

