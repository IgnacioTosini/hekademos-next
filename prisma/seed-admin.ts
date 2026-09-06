import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../src/lib/password.ts";

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
    select: { passwordHash: true },
  });
  const passwordHash = existingAdmin?.passwordHash
    && await verifyPassword(password, existingAdmin.passwordHash)
      ? existingAdmin.passwordHash
      : await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "Admin Hekademos",
      passwordHash,
      sessionVersion: existingAdmin?.passwordHash !== passwordHash
        ? { increment: 1 }
        : undefined,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      email,
      name: "Admin Hekademos",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`Administrador ${email} inicializado`);
};

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  const prisma = new PrismaClient();

  seedAdmin(prisma)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
