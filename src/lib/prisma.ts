import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    prismaSchemaVersion: string | undefined;
};

const cachedPrisma = globalForPrisma.prisma;
const prismaSchemaVersion = '20260910-whatsapp-integration';

export const prisma = cachedPrisma
    && globalForPrisma.prismaSchemaVersion === prismaSchemaVersion
    && 'classCategoryOption' in cachedPrisma
    && 'siteContent' in cachedPrisma
    && 'communityPost' in cachedPrisma
    && 'whatsAppIntegration' in cachedPrisma
    ? cachedPrisma
    : new PrismaClient({
        log: ['error', 'warn'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
    globalForPrisma.prismaSchemaVersion = prismaSchemaVersion;
}
