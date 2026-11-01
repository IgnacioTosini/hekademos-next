import { getHomePageContent } from '@/lib/site-content'
import { FooterView } from './FooterView'

export const Footer = async () => {
  const { footer, navigation } = await getHomePageContent()
  return <FooterView content={footer} navigation={navigation} />
}
