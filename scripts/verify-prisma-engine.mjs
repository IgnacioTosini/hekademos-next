import assert from "node:assert/strict";
import { access, readFile, mkdtemp, mkdir, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const engine = path.resolve(root, "node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node");
await access(engine);
const clientFiles = new Set();

// Authentication uses Server Actions, so check page traces as well as the cron.
for (const route of ["auth/login/page", "perfil/page", "api/cron/payment-reminders/route"]) {
    const tracePath = path.resolve(root, `.next/server/app/${route}.js.nft.json`);
    const trace = JSON.parse(await readFile(tracePath, "utf8"));
    assert.ok(trace.files.some((file) => path.resolve(path.dirname(tracePath), file) === engine),
        `Falta el motor de Prisma para Vercel en el trace de ${route}`);
    for (const required of ["node_modules/@prisma/client/default.js", "node_modules/.prisma/client/index.js"]) {
        assert.ok(trace.files.some((file) => path.resolve(path.dirname(tracePath), file) === path.resolve(root, required)),
            `Falta ${required} en el trace de ${route}`);
    }
    for (const file of trace.files) {
        const relative = path.relative(root, path.resolve(path.dirname(tracePath), file)).split(path.sep).join("/");
        assert.ok(!relative.startsWith("src/generated/prisma/"), `Cliente antiguo incluido en ${route}`);
        if (relative.startsWith("node_modules/@prisma/client/") || relative.startsWith("node_modules/.prisma/client/")) clientFiles.add(relative);
    }
}

// Recreate only traced Prisma files outside the repo, without access to Neon.
const sandbox = await mkdtemp(path.join(tmpdir(), "hekademos-prisma-package-"));
try {
    for (const relative of clientFiles) {
        const destination = path.join(sandbox, relative);
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(path.join(root, relative), destination);
    }
    const environment = { ...process.env, NODE_PATH: "", DATABASE_URL: "" };
    delete environment.PRISMA_QUERY_ENGINE_LIBRARY;
    delete environment.PRISMA_QUERY_ENGINE_BINARY;
    const probe = spawnSync(process.execPath, ["-e", `
        const { PrismaClient } = require('@prisma/client');
        const client = new PrismaClient({ datasourceUrl: 'postgresql://probe:probe@127.0.0.1:1/probe?connect_timeout=1' });
        client.$connect().then(() => { throw new Error('Unexpected database connection'); }).catch(error => {
            if (error.errorCode !== 'P1001') { console.error(error.message); process.exitCode = 1; }
        }).finally(() => client.$disconnect());
    `], { cwd: sandbox, env: environment, encoding: "utf8", timeout: 20_000 });
    assert.equal(probe.status, 0, `El cliente empaquetado no pudo cargar su motor: ${probe.error?.message ?? probe.stderr}`);
} finally {
    // Only delete the fresh temporary directory created above.
    assert.ok(path.dirname(sandbox) === path.resolve(tmpdir()) && path.basename(sandbox).startsWith("hekademos-prisma-package-"));
    await rm(sandbox, { recursive: true, force: true });
}
console.log("Prisma externo y motor de Vercel incluidos en login, perfil y cron; motor nativo cargado desde copia aislada, sin conectar a Neon.");
