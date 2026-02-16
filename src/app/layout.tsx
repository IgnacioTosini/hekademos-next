import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Footer, Header } from "@/components";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hekademos - Movimiento Consciente",
  description: "Entrenamiento integral que conecta cuerpo y mente para tu bienestar.",
    icons: {
    icon: "/LogoHekademos.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable}`}>
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
