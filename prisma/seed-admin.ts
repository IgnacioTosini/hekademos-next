import { pathToFileURL } from "node:url";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password.ts";

const getAdminCredentials = () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email) {
    throw new Error("Falta configurar ADMIN_EMAIL");
  }

  if (!password) {
    throw new Error("Falta configurar ADMIN_PASSWORD");
  }

  return { email, password };
};

export const seedAdmin = async (prisma: PrismaClient) => {
  const { email, password } = getAdminCredentials();
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  if (existingAdmin) {
    if (existingAdmin.role !== "ADMIN") {
      throw new Error("ADMIN_EMAIL corresponde a una cuenta que no es administradora");
    }
    console.log(`Administrador ${email} ya existe; se conserva su contraseña`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name: "Admin Hekademos",
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`Administrador ${email} inicializado`);
};

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  seedAdmin(prisma)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
