import { getUsers } from '@/app/actions/user.actions';
import { UsersSection } from '@/components/admin/users';
import type { Metadata } from 'next';
import './_usuariosPage.scss';

export const metadata: Metadata = {
    title: 'Usuarios',
    description: 'Administracion de usuarios de Hekademos.',
};

export default async function UsuariosPage() {
    const usersResponse = await getUsers();
    const users = usersResponse.ok ? usersResponse.data : [];

    return (
        <div className="usuarios-page">
            <UsersSection users={users} />
        </div>
    );
}
