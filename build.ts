import { build, spawn } from "bun";
import { cp, rm, mkdir, exists } from "node:fs/promises";
import { watch } from "node:fs";

const isWatch = process.argv.includes("--watch");

const tasks = [
    { entry: "./src/background.ts", out: "." },
    { entry: "./src/sidepanel.tsx", out: "." },
    { entry: "./src/content-scripts/chatgpt.ts", out: "content-scripts" },
    { entry: "./src/content-scripts/copilot.ts", out: "content-scripts" },
    { entry: "./src/content-scripts/deepseek.ts", out: "content-scripts" },
    { entry: "./src/content-scripts/gemini.ts", out: "content-scripts" },
    { entry: "./src/content-scripts/grok.ts", out: "content-scripts" },
    { entry: "./src/content-scripts/groq.ts", out: "content-scripts" },
];

async function runBuild(signal?: AbortSignal) {
    if (signal?.aborted) throw new Error("Aborted");
    console.log(`[${new Date().toLocaleTimeString()}] Starting build...`);
    const start = performance.now();

    try {
        // 1. Build JS/TS
        for (const task of tasks) {
            if (signal?.aborted) throw new Error("Aborted");
            const result = await build({
                entrypoints: [task.entry],
                outdir: `./dist/${task.out}`,
                naming: "[name].js", // Ensures names stay clean
                target: "browser",
                minify: !isWatch,
                define: {
                    "Bun.env.NODE_ENV": JSON.stringify(isWatch ? "development" : "production")
                },
            });

            if (!result.success) {
                console.error(`❌ Build failed for entrypoint: ${task.entry}`);
                for (const log of result.logs) {
                    console.error(log);
                }
                // Stop the entire build process here
                return;
            }
        }

        // 2. Build CSS (Tailwind)
        if (signal?.aborted) throw new Error("Aborted");
        // We output directly to dist. Make sure sidepanel.html links to "sidepanel.css"
        const tailwindProc = spawn([
            "bun",
            "tailwindcss",
            "-i", "./src/sidepanel.css",
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

        if (signal?.aborted) throw new Error("Aborted");

        // 3. Sync Public Assets
        // This copies everything (manifest.json, icons, html) in one go
        if (await exists("./public")) {
            await cp("./public", "./dist", { recursive: true });

            // Copy the correct manifest based on environment
            const manifestSource = isWatch ? "manifest.dev.json" : "manifest.prod.json";
            if (await exists(`./public/${manifestSource}`)) {
                await cp(`./public/${manifestSource}`, "./dist/manifest.json");
                console.log(`📄 Using ${manifestSource}`);
            }

            // Cleanup extra manifest files from dist
            const extraManifests = ["manifest.dev.json", "manifest.prod.json"];
            for (const manifest of extraManifests) {
                const path = `./dist/${manifest}`;
                if (await exists(path)) {
                    await rm(path);
                }
            }
        } else {
            console.warn("⚠️  Warning: ./public folder not found.");
        }

        if (process.argv.includes("--zip")) {
            console.log("📦 Zipping dist folder...");
            const zipProc = spawn(["zip", "-r", "veganmageaitab.zip", "."], {
                cwd: "./dist",
                stdout: "inherit",
                stderr: "inherit",
            });
            const exitCode = await zipProc.exited;
            if (exitCode !== 0) {
                console.error("❌ Zip failed");
            } else {
                console.log("✅ Zip created: dist/veganmageaitab.zip");
            }
        }

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

    // Watch both source code and public assets
    watch("./src", { recursive: true }, watcher);
    watch("./public", { recursive: true }, watcher);
}