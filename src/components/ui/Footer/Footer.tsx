import { FaInstagram, FaYoutube } from 'react-icons/fa'
import { NavbarLinks } from '../NavbarLinks/NavbarLinks'
import Image from 'next/image'
import './_footer.scss'

export const Footer = () => {
  return (
    <div className="footer">
      <div className='footerPartOne'>
        <div className='logoContainer'>
          <Image
            src="/LogoHekademos.png"
            alt="Logo Hekademos"
            width={80}
            height={80}
            priority={false}
            quality={90}
          />
          <p>Movimiento consciente para una vida con propósito.</p>
        </div>

        <div className='linksContainer'>
          <div className='linksSection'>
            <h4>Enlaces rapidos</h4>
            <NavbarLinks isFooter />
          </div>
          <div className='linksSection'>
            <h4>Seguinos</h4>
            <div className='socialMediasContainer'>
              <a href="https://www.instagram.com/hekademos.em" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
              <a href="https://www.youtube.com/@HekademosE.M" target="_blank" rel="noopener noreferrer"><FaYoutube /></a>
            </div>
          </div>
        </div>
      </div>

      <div className='footerPartTwo'>
        <p>© {new Date().getFullYear()} Hekademos. Todos los derechos reservados.</p>
        <p>Creado por Ignacio Tosini</p>

        <p className='especial'>Hekademos — Movimiento consciente para una vida con propósito.</p>
      </div>
    </div>
  )
}
