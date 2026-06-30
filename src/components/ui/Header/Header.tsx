import { getCurrentUser } from '@/app/actions/auth.actions';
import { HeaderClient } from './HeaderClient';
import './_header.scss'

export const Header = async () => {
    const userResponse = await getCurrentUser();
    const user = userResponse.ok ? userResponse.data : null;

    return <HeaderClient user={user} />;
};
