import { getAdminUserPage } from '@/app/actions/admin-user-page.actions';
import { UsersSection } from '@/components/admin/users/usersSection/UsersSection';
import type { Metadata } from 'next';
import './_usuariosPage.scss';

export const metadata: Metadata = {
    title: 'Usuarios',
    description: 'Administracion de usuarios de Hekademos.',
};

export default async function UsuariosPage() {
    const usersResponse = await getAdminUserPage('users');
    const usersPage = usersResponse.ok ? usersResponse.data : { items: [], total: 0, filteredTotal: 0, page: 1 };

    return (
        <div className="usuarios-page">
            <UsersSection initialPage={usersPage} />
        </div>
    );
}
