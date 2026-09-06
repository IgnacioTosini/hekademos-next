import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
    if (specifier === "next/cache") {
        return nextResolve("next/cache.js", context);
    }

    if (!specifier.startsWith("@/")) {
        return nextResolve(specifier, context);
    }

    const sourcePath = resolvePath(process.cwd(), "src", specifier.slice(2));
    const candidates = [
        `${sourcePath}.ts`,
        `${sourcePath}.tsx`,
        resolvePath(sourcePath, "index.ts"),
        resolvePath(sourcePath, "index.tsx"),
    ];
    const matchingPath = candidates.find(existsSync);

    if (!matchingPath) {
        return nextResolve(specifier, context);
    }

    return {
        shortCircuit: true,
        url: pathToFileURL(matchingPath).href,
    };
}
