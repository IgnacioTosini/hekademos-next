import { Metadata } from "next";
import { HomePage } from "@/components/sections/HomePage/HomePage";
import { getSiteUrl } from "@/lib/seo";
import { businessAddress } from "@/lib/business-location";

export const metadata: Metadata = {
  title: { absolute: "Hekademos | Calistenia en Mar del Plata" },
  description: "Clases de calistenia, entrenamiento funcional y planes personalizados en Mar del Plata. Mejorá fuerza, movilidad y conciencia corporal con Hekademos.",
  alternates: { canonical: new URL("/", getSiteUrl()).toString() },
};

export default function Home() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "Hekademos", url: siteUrl },
      {
        "@type": "HealthClub",
        name: "Hekademos",
        url: siteUrl,
        logo: `${siteUrl}/LogoHekademos.png`,
        image: `${siteUrl}/banner.png`,
        address: { "@type": "PostalAddress", ...businessAddress },
      },
    ],
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <HomePage />
  </>;
}
