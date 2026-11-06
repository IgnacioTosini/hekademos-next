import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
await access(path.resolve(root, 'src/generated/prisma/client.ts'));
const requiredFiles = [
    'node_modules/@prisma/client/runtime/client.js',
    'node_modules/pg/esm/index.mjs',
];

for (const file of requiredFiles) await access(path.resolve(root, file));

for (const route of ['auth/login/page', 'perfil/page', 'api/cron/payment-reminders/route']) {
    const tracePath = path.resolve(root, `.next/server/app/${route}.js.nft.json`);
    const trace = JSON.parse(await readFile(tracePath, 'utf8'));
    const tracedFiles = new Set(trace.files.map((file) => path.resolve(path.dirname(tracePath), file)));
    for (const file of requiredFiles) {
        assert.ok(tracedFiles.has(path.resolve(root, file)), `Falta ${file} en el trace de ${route}`);
    }
    assert.ok(!trace.files.some((file) => file.replaceAll('\\', '/').includes('node_modules/.prisma/client/')),
        `El trace de ${route} todavía depende del cliente antiguo`);
}

console.log('Cliente Prisma 7 generado en src, runtime y driver PostgreSQL incluidos en los traces de Vercel.');
