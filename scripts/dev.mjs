import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

loadEnvFiles();

const requestedPort = configuredPort("FRONTEND_PORT", 3000);
let port = requestedPort;
let publicOrigin;
const redirectUri = process.env.AGORA_SSO_REDIRECT_URI?.trim();

if ((process.env.AUTH_MODE ?? "bypass").toLowerCase() === "sso" && redirectUri) {
  let redirect;
  try {
    redirect = new URL(redirectUri);
  } catch {
    fail("AGORA_SSO_REDIRECT_URI must be an absolute URL.");
  }
  port = redirect.port
    ? Number(redirect.port)
    : redirect.protocol === "https:"
      ? 443
      : 80;
  publicOrigin = redirect.origin;
  if (!(await portAvailable(port))) {
    fail(
      `SSO requires frontend port ${port}, but it is already in use. Free that port or update and register AGORA_SSO_REDIRECT_URI.`,
    );
  }
} else {
  port = await availablePort(requestedPort);
  publicOrigin = `http://localhost:${port}`;
}

if (port !== requestedPort) {
  console.log(`Frontend port ${requestedPort} is busy; using ${port}.`);
}
console.log(`Frontend: ${publicOrigin}`);

const nextBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);
const child = spawn(
  nextBin,
  ["dev", "--hostname", "localhost", "--port", String(port)],
  {
    env: { ...process.env, APP_PUBLIC_URL: publicOrigin },
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => fail(`Could not start Next.js: ${error.message}`));
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

function configuredPort(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    fail(`${name} must be between 1 and 65535.`);
  }
  return value;
}

async function availablePort(preferred) {
  for (
    let candidate = preferred;
    candidate <= Math.min(preferred + 99, 65535);
    candidate += 1
  ) {
    if (await portAvailable(candidate)) return candidate;
  }
  fail(
    `Could not find an available port between ${preferred} and ${Math.min(preferred + 99, 65535)}.`,
  );
}

function portAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port }, () => {
      server.close(() => resolve(true));
    });
  });
}

function loadEnvFiles() {
  for (const filename of [".env.local", ".env"]) {
    const target = path.join(process.cwd(), filename);
    if (!fs.existsSync(target)) continue;
    for (const rawLine of fs.readFileSync(target, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const name = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(name in process.env)) process.env[name] = value;
    }
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
