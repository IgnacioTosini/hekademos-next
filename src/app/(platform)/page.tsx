import { Metadata } from "next";
import { HomePage } from "@/components/sections/HomePage/HomePage";

export const metadata: Metadata = {
  title: "Hekademos - Movimiento Consciente",
  description: "Entrenamiento integral que conecta cuerpo y mente para tu bienestar.",
  openGraph: {
    title: "Hekademos",
    description: "Movimiento consciente para una vida con propósito.",
  }
};

export default function Home() {
  return (
    <>
      <HomePage />
    </>
  );
}
