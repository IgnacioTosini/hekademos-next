
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const pooledUrl = env("DATABASE_URL");
const configuredDirectUrl = process.env.DIRECT_URL?.trim();
const migrationUrl = (() => {
  if (configuredDirectUrl) return configuredDirectUrl;

  // Neon uses the same credentials on its direct host, without "-pooler".
  const parsed = new URL(pooledUrl);
  if (parsed.hostname.endsWith(".neon.tech") && parsed.hostname.includes("-pooler.")) {
    parsed.hostname = parsed.hostname.replace("-pooler.", ".");
    return parsed.toString();
  }

  return pooledUrl;
})();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types prisma/seed.ts",
  },
  engine: "classic",
  datasource: {
    url: migrationUrl,
  },
});
