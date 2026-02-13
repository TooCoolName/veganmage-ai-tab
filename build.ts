import { build, spawn } from "bun";
import { cp, rm, mkdir, exists, readdir } from "node:fs/promises";
import { watch } from "node:fs";
import { join } from "node:path";

const isWatch = process.argv.includes("--watch");

// Helper to get all content scripts
async function getContentScripts() {
    const contentScriptsDir = "./src/content-scripts";
    if (await exists(contentScriptsDir)) {
        const files = await readdir(contentScriptsDir);
        return files
            .filter(f => f.endsWith(".ts") || f.endsWith(".tsx"))
            .map(f => `./src/content-scripts/${f}`);
    }
    return [];
}

async function runBuild(signal?: AbortSignal) {
    if (signal?.aborted) throw new Error("Aborted");
    console.log(`[${new Date().toLocaleTimeString()}] Starting build...`);
    const start = performance.now();

    try {
        // 1. Build JS/TS
        const contentScripts = await getContentScripts();
        const entrypoints = [
            "./src/background/service-worker.ts",
            "./src/sidepanel.tsx",
            ...contentScripts
        ];

        if (signal?.aborted) throw new Error("Aborted");

        // Check if entrypoints exist
        const validEntrypoints = [];
        for (const entry of entrypoints) {
            if (await exists(entry)) {
                validEntrypoints.push(entry);
            } else {
                console.warn(`⚠️  Warning: Entrypoint not found: ${entry}`);
            }
        }

        if (validEntrypoints.length > 0) {
            const result = await build({
                entrypoints: validEntrypoints,
                outdir: "./dist",
                root: "./src", // This ensures output structure mirrors src
                target: "browser",
                minify: !isWatch,
                define: {
                    "Bun.env.NODE_ENV": JSON.stringify(isWatch ? "development" : "production")
                },
            });

            if (!result.success) {
                console.error(`❌ Build failed:`);
                for (const log of result.logs) {
                    console.error(log);
                }
                // Stop the entire build process here
                return;
            }
        }

        // 2. Build CSS (Tailwind)
        if (signal?.aborted) throw new Error("Aborted");

        // Check if sidepanel.css exists in root or src
        let cssInput = "./src/sidepanel.css";
        if (await exists("./sidepanel.css")) {
            cssInput = "./sidepanel.css";
        }

        if (await exists(cssInput)) {
            const tailwindProc = spawn([
                "bun",
                "tailwindcss",
                "-i", cssInput,
                "-o", "./dist/sidepanel.css",
                ...(isWatch ? [] : ["--minify"])
            ], {
                stdout: "inherit",
                stderr: "inherit",
            });

            const abortHandler = () => tailwindProc.kill();
            signal?.addEventListener("abort", abortHandler);

            try {
                await tailwindProc.exited;
            } finally {
                signal?.removeEventListener("abort", abortHandler);
            }
        } else {
            console.warn(`⚠️  Warning: CSS input ${cssInput} not found.`);
        }

        if (signal?.aborted) throw new Error("Aborted");

        // 3. Sync Public Assets
        if (await exists("./public")) {
            await cp("./public", "./dist", { recursive: true });
        }

        // Sync root assets that should be in dist
        if (await exists("./icons")) {
            await cp("./icons", "./dist/icons", { recursive: true });
        }
        if (await exists("./sidepanel.html")) {
            await cp("./sidepanel.html", "./dist/sidepanel.html");
        }

        // 4. Handle Manifest
        const manifestName = isWatch ? "manifest.dev.json" : "manifest.prod.json";
        // Check public first, then root
        let manifestSrc = `./public/${manifestName}`;
        if (!await exists(manifestSrc)) {
            manifestSrc = `./${manifestName}`;
        }

        if (await exists(manifestSrc)) {
            await cp(manifestSrc, "./dist/manifest.json");
            console.log(`✅ Using ${manifestName}`);
        } else {
            console.warn(`⚠️  Warning: ${manifestName} not found.`);
        }

        // Clean up dev/prod manifests from dist if they were copied from public
        if (await exists("./dist/manifest.dev.json")) await rm("./dist/manifest.dev.json");
        if (await exists("./dist/manifest.prod.json")) await rm("./dist/manifest.prod.json");


        console.log(`✅ Build complete in ${(performance.now() - start).toFixed(2)}ms`);

    } catch (err) {
        if (signal?.aborted || (err as Error).message === "Aborted") {
            throw err;
        }
        console.error("🚨 Build error:", err);
    }
}

// Initial Setup: Wipe and recreate dist
await rm("./dist", { recursive: true, force: true });
await mkdir("./dist", { recursive: true });

// Initial Build
await runBuild();

if (isWatch) {
    console.log("👀 Watching for changes in ./src and ./public...");

    let currentAbortController: AbortController | undefined;

    const triggerBuild = async () => {
        if (currentAbortController) {
            currentAbortController.abort();
        }

        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;

        try {
            await runBuild(signal);
        } catch (err) {
            if ((err as Error).message === "Aborted") {
                console.log(`[${new Date().toLocaleTimeString()}] ⏹️ Build cancelled for new change.`);
            } else {
                console.error("🚨 Watcher encountered an unexpected error during build execution:", err);
            }
        } finally {
            if (currentAbortController?.signal === signal) {
                currentAbortController = undefined;
            }
        }
    };

    let timeout: Timer | undefined;
    // eslint-disable-next-line no-restricted-syntax
    const watcher = (event: string, filename: string | Buffer | null | undefined) => {
        if (!filename) return;
        const sFilename = String(filename);

        // Ignore common temporary/hidden files
        if (sFilename.includes("node_modules") ||
            sFilename.includes(".git") ||
            sFilename.includes("dist") ||
            sFilename.endsWith("~") || // vim backup
            sFilename.endsWith(".tmp") ||
            sFilename.startsWith(".")) { // hidden files
            return;
        }

        console.log(`[WATCH] Change detected: ${event} on ${sFilename}`);

        clearTimeout(timeout);
        timeout = setTimeout(triggerBuild, 200);
    };

    // Watch source code, public assets, and root assets
    watch("./src", { recursive: true }, watcher);
    if (await exists("./public")) watch("./public", { recursive: true }, watcher);
    // Also watch root files if needed, but recursive watch on root is bad due to node_modules
    // Maybe just watch specific root files?
    watch("./sidepanel.html", watcher);
    watch("./sidepanel.css", watcher);
}