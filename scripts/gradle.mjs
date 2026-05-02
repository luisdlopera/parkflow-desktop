import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "apps", "api");
const isWin = process.platform === "win32";
const cmd = isWin ? "gradlew.bat" : "./gradlew";
const args = process.argv.slice(2);

const result = spawnSync(cmd, args, {
  cwd: apiDir,
  stdio: "inherit",
  shell: isWin,
});

process.exit(result.status === null ? 1 : result.status);
