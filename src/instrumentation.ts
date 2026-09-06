export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;

    const {
        assertProductionEnvironment,
        shouldValidateProductionAtRuntime,
    } = await import("@/lib/environment");

    if (shouldValidateProductionAtRuntime()) {
        assertProductionEnvironment();
    }
}
