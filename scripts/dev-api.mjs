// Launches the FastAPI service using the repo's virtualenv.
//
// npm runs scripts through cmd.exe on Windows, which will not resolve a
// relative "venv/Scripts/python" as a command — so resolve the interpreter
// here instead of hardcoding a platform-specific path in package.json.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const candidates =
  process.platform === "win32"
    ? [join(root, "venv", "Scripts", "python.exe"), join(root, ".venv", "Scripts", "python.exe")]
    : [join(root, "venv", "bin", "python"), join(root, ".venv", "bin", "python")];

const python = candidates.find(existsSync);

if (!python) {
  console.error(
    "No virtualenv found. Create one and install the API dependencies:\n" +
      "  python -m venv venv\n" +
      (process.platform === "win32"
        ? "  venv\\Scripts\\pip install -r api/requirements.txt"
        : "  venv/bin/pip install -r api/requirements.txt"),
  );
  process.exit(1);
}

const args = ["-m", "uvicorn", "api.server:app", "--reload", "--port", process.env.API_PORT ?? "8000"];

const child = spawn(python, args, { cwd: root, stdio: "inherit" });

child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
