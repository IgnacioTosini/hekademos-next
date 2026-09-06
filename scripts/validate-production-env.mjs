import nextEnvironment from "@next/env";
import { assertProductionEnvironment } from "../src/lib/environment.ts";

const { loadEnvConfig } = nextEnvironment;

loadEnvConfig(process.cwd(), false);

try {
    assertProductionEnvironment(process.env);
    console.log("Configuración de producción válida.");
} catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudo validar la configuración de producción");
    process.exitCode = 1;
}
