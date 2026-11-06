import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seedAdmin } from '../prisma/seed-admin.ts';
import { verifyPassword } from '../src/lib/password.ts';

const adminEmail = 'admin-seed-test@example.com';

test('el seed conserva la contraseña de un administrador existente', async () => {
    const previousEmail = process.env.ADMIN_EMAIL;
    const previousPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_EMAIL = adminEmail;
    process.env.ADMIN_PASSWORD = 'contraseña-bootstrap';
    try {
        let created = false;
        await seedAdmin({ user: {
            findUnique: async () => ({ role: 'ADMIN' }),
            create: async () => { created = true; },
        } });
        assert.equal(created, false);
    } finally {
        if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
        else process.env.ADMIN_EMAIL = previousEmail;
        if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
        else process.env.ADMIN_PASSWORD = previousPassword;
    }
});

test('el seed crea un administrador nuevo con una contraseña verificable', async () => {
    const previousEmail = process.env.ADMIN_EMAIL;
    const previousPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_EMAIL = adminEmail;
    process.env.ADMIN_PASSWORD = 'contraseña-bootstrap';
    try {
        let created;
        await seedAdmin({ user: {
            findUnique: async () => null,
            create: async (input) => { created = input.data; },
        } });
        assert.equal(created.email, adminEmail);
        assert.equal(created.role, 'ADMIN');
        assert.equal(await verifyPassword('contraseña-bootstrap', created.passwordHash), true);
    } finally {
        if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
        else process.env.ADMIN_EMAIL = previousEmail;
        if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
        else process.env.ADMIN_PASSWORD = previousPassword;
    }
});

test('el seed rechaza convertir otra cuenta en administrador', async () => {
    const previousEmail = process.env.ADMIN_EMAIL;
    const previousPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_EMAIL = adminEmail;
    process.env.ADMIN_PASSWORD = 'contraseña-bootstrap';
    try {
        await assert.rejects(() => seedAdmin({ user: {
            findUnique: async () => ({ role: 'STUDENT' }),
            create: async () => { throw new Error('No se debe crear'); },
        } }), /no es administradora/);
    } finally {
        if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
        else process.env.ADMIN_EMAIL = previousEmail;
        if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
        else process.env.ADMIN_PASSWORD = previousPassword;
    }
});
