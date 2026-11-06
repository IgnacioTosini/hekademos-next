import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

export function createPrismaClient() {
    // Unit tests import the client while mocking all database calls.
    const connectionString = process.env.DATABASE_URL
        ?? 'postgresql://prisma:prisma@127.0.0.1:1/prisma';

    const adapter = new PrismaPg({ connectionString, connectionTimeoutMillis: 5_000 });
    return new PrismaClient({ adapter, log: ['error', 'warn'] });
}
