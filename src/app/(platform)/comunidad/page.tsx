import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCommunityFeed } from "@/app/actions/community.actions";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { getCurrentAuthSession } from "@/lib/auth-session";

export const metadata: Metadata = { title: "Comunidad", description: "Preguntas, reflexiones y aportes de la comunidad Hekademos." };

export default async function CommunityPage() {
    const session = await getCurrentAuthSession();
    if (!session) redirect("/auth/login?next=/comunidad");

    const response = await getCommunityFeed();
    if (!response.ok) redirect("/perfil");
    return <main><CommunityFeed data={response.data} /></main>;
}
