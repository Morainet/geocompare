import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const temporary = mkdtempSync(join(root, ".package-smoke-"));
const consumer = join(temporary, "consumer");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}${result.stderr ? `: ${result.stderr}` : ""}`);
  return result;
}

try {
  mkdirSync(consumer, { recursive: true });
  const pack = run("npm", ["pack", "--pack-destination", temporary, "--silent"], {
    env: { ...process.env, npm_config_cache: join(temporary, "npm-cache") },
    stdio: "pipe",
  });
  const archiveName = pack.stdout.trim().split("\n").at(-1);
  if (!archiveName || basename(archiveName) !== archiveName || !archiveName.endsWith(".tgz")) {
    throw new Error("npm pack did not return a valid archive name");
  }
  const archive = join(temporary, archiveName);
  const packageDirectory = join(consumer, "node_modules", "@morainet", "geocompare");
  mkdirSync(packageDirectory, { recursive: true });
  run("tar", ["-xzf", archive, "-C", packageDirectory, "--strip-components=1"]);

  for (const required of ["dist/index.js", "dist/index.d.ts", "dist/style.css", "docs/PRD.md", "docs/DEMO_DATA.md"]) {
    if (!existsSync(join(packageDirectory, required))) throw new Error(`Packed package is missing ${required}`);
  }
  const manifest = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8"));
  if (!existsSync(join(packageDirectory, manifest.exports["."].import.slice(2)))) throw new Error("Invalid JS export");
  if (!existsSync(join(packageDirectory, manifest.exports["."].types.slice(2)))) throw new Error("Invalid type export");
  if (!existsSync(join(packageDirectory, manifest.exports["./style.css"].slice(2)))) throw new Error("Invalid CSS export");

  for (const file of ["index.html", "main.tsx", "tsconfig.json"]) {
    copyFileSync(join(root, "tests", "package-consumer", file), join(consumer, file));
  }
  run(join(root, "node_modules", ".bin", "tsc"), ["-p", join(consumer, "tsconfig.json")]);
  run(join(root, "node_modules", ".bin", "vite"), ["build", consumer, "--outDir", join(temporary, "output"), "--emptyOutDir"]);
  if (!existsSync(join(temporary, "output", "index.html"))) throw new Error("Consumer build did not produce index.html");
  process.stdout.write("Packed package typechecks and builds in an isolated Vite consumer.\n");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
