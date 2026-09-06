import { FaInstagram, FaYoutube } from 'react-icons/fa'
import { NavbarLinks } from '../NavbarLinks/NavbarLinks'
import Image from 'next/image'
import './_footer.scss'
import { getHomePageContent } from '@/lib/site-content'

export const Footer = async () => {
  const { footer: content, navigation } = await getHomePageContent()
  return (
    <div className="footer">
      <div className='footerPartOne'>
        <div className='logoContainer'>
          <Image
            src={content.logo.url}
            alt={content.logo.alt}
            width={80}
            height={80}
            priority={false}
            quality={90}
          />
          <p>{content.tagline}</p>
        </div>

        <div className='linksContainer'>
          <div className='linksSection'>
            <h4>{content.linksTitle}</h4>
            <NavbarLinks isFooter links={navigation.menuLinks} />
          </div>
          <div className='linksSection'>
            <h4>{content.socialTitle}</h4>
            <div className='socialMediasContainer'>
              <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
              <a href={content.youtubeUrl} target="_blank" rel="noopener noreferrer"><FaYoutube /></a>
            </div>
          </div>
        </div>
      </div>

      <div className='footerPartTwo'>
        <p>© {new Date().getFullYear()} {content.copyright}</p>
        <p>{content.credit}</p>

        <p className='especial'>{content.closingText}</p>
      </div>
    </div>
  )
}
