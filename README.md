This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuración de producción

Usá `.env.example` como referencia y cargá los secretos directamente en el proveedor de despliegue. No subas archivos `.env` al repositorio.

Para activar los recordatorios de cuota del día 1 por WhatsApp, con email de respaldo, seguí la [guía de recordatorios mensuales](docs/actions/payment-reminders.md). Incluye la plantilla de Meta, las nuevas variables de Vercel y la migración de registro de envíos en Neon.

Antes de publicar, verificá la configuración con:

```bash
npm run validate:env:production
```

`build:deploy`, `build:vercel` y `start` ejecutan esta validación automáticamente y se detienen antes de iniciar si falta una variable obligatoria o existe una configuración insegura.

`ADMIN_EMAIL` y `ADMIN_PASSWORD` se usan únicamente durante el seed de despliegue para crear o actualizar un usuario real en PostgreSQL. No existe un administrador virtual ni un acceso alternativo mediante variables de entorno.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
