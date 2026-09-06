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
                posts={response.ok ? response.data.posts : []}
                authors={response.ok ? response.data.authors : []}
                errorMessage={response.ok ? null : response.error}
            />
        </main>
    );
}
