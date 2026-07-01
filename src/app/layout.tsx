import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Providers } from "@/components/providers/Providers";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";

const fontVariables = {
  "--font-inter": "Inter, system-ui, sans-serif",
  "--font-playfair-display": "Georgia, serif",
} as CSSProperties;

export const metadata: Metadata = {
  metadataBase: new URL("https://hekademos.vercel.app"),

  title: {
    default: "Hekademos - Transformá tu relación con el movimiento",
    template: "%s | Hekademos",
  },

  description:
    "Mejorá tu relación con el cuerpo, creá consciencia en cada movimiento y pertenecé a una comunidad donde el respeto y compañerismo van antes que todo.",

  keywords: [
    "hekademos",
    "movimiento consciente",
    "entrenamiento corporal",
    "comunidad fitness",
    "consciencia corporal",
    "transformación personal",
    "movilidad",
    "crecimiento personal",
  ],

  authors: [{ name: "Hekademos" }],

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/LogoHekademos.png",
  },

  openGraph: {
    type: "website",
    url: "https://hekademos.vercel.app",
    title: "Hekademos - Transformá tu relación con el movimiento",
    description:
      "Una práctica que te transforma desde adentro hacia afuera.",
    siteName: "Hekademos",
    locale: "es_ES",
    images: [
      {
        url: "/banner.png",
        width: 1200,
        height: 630,
        alt: "Hekademos - Comunidad de movimiento consciente",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Hekademos - Transformá tu relación con el movimiento",
    description:
      "Mejorá tu relación con el cuerpo y entrená con consciencia.",
    images: ["/banner.png"],
  },

  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body style={fontVariables} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
