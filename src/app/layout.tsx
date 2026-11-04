import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { Analytics } from "@vercel/analytics/next"
import { getSiteUrl, isSearchIndexingEnabled } from "@/lib/seo";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";

const fontVariables = {
  "--font-inter": "Inter, system-ui, sans-serif",
  "--font-playfair-display": "Georgia, serif",
} as CSSProperties;

const siteUrl = getSiteUrl();
const siteDescription = "Clases de calistenia, entrenamiento funcional y planes personalizados en Mar del Plata. Entrená fuerza y movilidad con el equipo de Hekademos.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Hekademos | Calistenia en Mar del Plata",
    template: "%s | Hekademos",
  },

  description: siteDescription,

  authors: [{ name: "Hekademos" }],

  robots: {
    index: isSearchIndexingEnabled(),
    follow: isSearchIndexingEnabled(),
  },

  icons: {
    icon: "/LogoHekademos.png",
  },

  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Hekademos | Calistenia en Mar del Plata",
    description: siteDescription,
    siteName: "Hekademos",
    locale: "es_AR",
    images: [
      {
        url: "/banner.png",
        width: 1024,
        height: 1024,
        alt: "Hekademos - Comunidad de movimiento consciente",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "Hekademos | Calistenia en Mar del Plata",
    description: siteDescription,
    images: ["/banner.png"],
  },

};

export const viewport: Viewport = {
  themeColor: "#0b1b2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body style={fontVariables} suppressHydrationWarning>
        {children}
        <ToastProvider />
        <Analytics />
      </body>
    </html>
  );
}
