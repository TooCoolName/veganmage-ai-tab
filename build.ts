import { build, spawn } from "bun";
import { cp, rm, mkdir, exists } from "node:fs/promises";
import { watch } from "node:fs";

const isWatch = process.argv.includes("--watch");

const bgTasks = [
    { entry: "./src/background.ts", out: "." },
    { entry: "./src/content-scripts/chatgpt.ts", out: "content-scripts" },
    { entry: "./src/content-scripts/copilot.ts", out: "content-scripts" },
    { entry: "./src/content-scripts/deepseek.ts", out: "content-scripts" },
    { entry: "./src/content-scripts/gemini.ts", out: "content-scripts" },
    { entry: "./src/content-scripts/grok.ts", out: "content-scripts" },
    { entry: "./src/content-scripts/groq.ts", out: "content-scripts" },
    { entry: "./src/content-scripts/visibility-inject.ts", out: "content-scripts" },
];

async function buildBackground(signal?: AbortSignal) {
    console.log(`[${new Date().toLocaleTimeString()}] Building background scripts...`);
    const results = await Promise.all(bgTasks.map(task => {
        if (signal?.aborted) return Promise.reject(new Error("Aborted"));
        return build({
            entrypoints: [task.entry],
            outdir: `./dist/${task.out}`,
            naming: "[name].js",
            target: "browser",
            minify: !isWatch,
            define: {
                "Bun.env.NODE_ENV": JSON.stringify(isWatch ? "development" : "production")
            },
        });
    }));

    for (let i = 0; i < results.length; i++) {
        if (!results[i].success) {
            console.error(`❌ Build failed for entrypoint: ${bgTasks[i].entry}`);
            for (const log of results[i].logs) console.error(log);
            return false;
        }
    }
    return true;
}

async function syncAssets() {
    if (!(await exists("./public"))) {
        console.warn("⚠️  Warning: ./public folder not found.");
        return;
    }
    await cp("./public", "./dist", { recursive: true });

    const manifestSource = isWatch ? "manifest.dev.json" : "manifest.prod.json";
    if (await exists(`./public/${manifestSource}`)) {
        await cp(`./public/${manifestSource}`, "./dist/manifest.json");
        console.log(`📄 Using ${manifestSource}`);
    }

    const extraManifests = ["manifest.dev.json", "manifest.prod.json"];
    for (const manifest of extraManifests) {
        const path = `./dist/${manifest}`;
        if (await exists(path)) await rm(path);
    }
}

async function runViteBuild() {
    console.log(`[${new Date().toLocaleTimeString()}] Starting Vite build...`);
    const viteProc = spawn(["bun", "run", "vite-build"], { stdout: "inherit", stderr: "inherit" });
    const exitCode = await viteProc.exited;
    if (exitCode !== 0) console.error("❌ Vite build failed");
    return exitCode === 0;
}

function startViteWatch() {
    console.log(`[${new Date().toLocaleTimeString()}] Starting Vite watch mode...`);
    return spawn(["bun", "run", "vite-build", "--watch"], {
        stdout: "inherit",
        stderr: "inherit",
        env: { ...process.env, VITE_WATCH: "true" }
    });
}

async function runFullBuild() {
    const start = performance.now();
    await rm("./dist", { recursive: true, force: true });
    await mkdir("./dist", { recursive: true });

    const [bgSuccess] = await Promise.all([
        buildBackground(),
        syncAssets()
    ]);

    if (!bgSuccess) return;

    const viteSuccess = await runViteBuild();
    if (!viteSuccess) return;

    if (process.argv.includes("--zip")) {
        console.log("📦 Zipping dist folder...");
        const zipProc = spawn(["zip", "-r", "veganmageaitab.zip", "."], { cwd: "./dist", stdout: "inherit", stderr: "inherit" });
        await zipProc.exited;
    }

    console.log(`✅ Build complete in ${(performance.now() - start).toFixed(2)}ms`);
}

function isErrorMessageAborted(err: unknown): boolean {
    return err instanceof Error && err.message === 'Aborted';
}

if (!isWatch) {
    await runFullBuild();
} else {
    // Initial setup for watch mode
    await rm("./dist", { recursive: true, force: true });
    await mkdir("./dist", { recursive: true });

    await Promise.all([
        buildBackground(),
        syncAssets()
    ]);

    const viteProc = startViteWatch();

    console.log("👀 Watching for changes in ./src and ./public...");
    let bgAbortController: AbortController | undefined;
    let timeout: Timer | undefined;

    const watcher = (event: string, filename: string | Buffer | null | undefined) => {
        if (!filename) return;
        const sFilename = String(filename);
        if (sFilename.includes("node_modules") || sFilename.includes(".git") || sFilename.includes("dist") ||
            sFilename.endsWith("~") || sFilename.endsWith(".tmp") || sFilename.startsWith(".")) return;

        console.log(`[WATCH] Change detected: ${event} on ${sFilename}`);

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            (async () => {
                if (sFilename.startsWith("public")) {
                    await syncAssets();
                } else if (sFilename.startsWith("src/sidepanel") || sFilename.endsWith(".svelte") || sFilename.endsWith(".css")) {
                    // Vite handles these automatically
                    console.log("⚡ Vite is handling the change...");
                } else {
                    // Background or common src files
                    if (bgAbortController) bgAbortController.abort();
                    bgAbortController = new AbortController();
                    try {
                        await buildBackground(bgAbortController.signal);
                        console.log(`✅ Background build complete`);
                    } catch (err) {
                        if (!isErrorMessageAborted(err)) console.error("🚨 Background build error:", err);
                    }
                }
            })().catch(err => console.error("Watcher error:", err));
        }, 200);
    };

    watch("./src", { recursive: true }, watcher);
    watch("./public", { recursive: true }, watcher);

    process.on("SIGINT", () => {
        viteProc.kill();
        process.exit();
    });
}