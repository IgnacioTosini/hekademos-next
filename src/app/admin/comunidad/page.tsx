import type { Metadata } from "next";
import { getAdminCommunityPosts } from "@/app/actions/community.actions";
import { AdminCommunitySection } from "@/components/admin/AdminCommunitySection";
import "./_comunidadAdminPage.scss";

export const metadata: Metadata = { title: "Comunidad", description: "Administración del foro de Hekademos." };

export default async function AdminCommunityPage() {
    const response = await getAdminCommunityPosts();
    return (
        <main className="admin-community-page">
            <AdminCommunitySection
                data={response.ok ? response.data : { posts: [], authors: [], page: 1, totalPosts: 0, filteredTotal: 0, types: [] }}
                errorMessage={response.ok ? null : response.error}
            />
        </main>
    );
}
