import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const engine = path.resolve(root, "src/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node");
await access(engine);

// Authentication uses Server Actions, so check page traces as well as the cron.
for (const route of ["auth/login/page", "perfil/page", "api/cron/payment-reminders/route"]) {
    const tracePath = path.resolve(root, `.next/server/app/${route}.js.nft.json`);
    const trace = JSON.parse(await readFile(tracePath, "utf8"));
    assert.ok(trace.files.some((file) => path.resolve(path.dirname(tracePath), file) === engine),
        `Falta el motor de Prisma para Vercel en el trace de ${route}`);
}
console.log("Motor de Prisma para Vercel generado e incluido en login, perfil y cron.");
