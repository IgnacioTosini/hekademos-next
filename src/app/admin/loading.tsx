import { LoadingState } from '@/components/ui/loadingState/LoadingState';
import './_adminLoading.scss';

export default function AdminLoading() {
    return (
        <div className="admin-route-loading">
            <LoadingState title="Cargando sección" description="Estamos preparando la información del panel." />
        </div>
    );
}
