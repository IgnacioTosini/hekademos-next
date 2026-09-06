import { getCurrentUser } from '@/app/actions/auth.actions';
import { HeaderClient } from './HeaderClient';
import './_header.scss'
import { getHomePageContent } from '@/lib/site-content';

export const Header = async () => {
    const [userResponse, content] = await Promise.all([getCurrentUser(), getHomePageContent()]);
    const user = userResponse.ok ? userResponse.data : null;

    return <HeaderClient user={user} content={content.header} navigation={content.navigation} />;
};
