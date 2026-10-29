// Dev mode: Next dev server + esbuild watch for main/preload/mcp + Electron pointed at the dev server.
import { spawn } from "node:child_process";

const PORT = 3123;
const URL = `http://localhost:${PORT}`;
const children = [];
const start = (cmd, args, env = {}) => {
  const child = spawn(cmd, args, { stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  children.push(child);
  return child;
};
const stopAll = () => children.forEach((child) => child.kill());

start("npx", ["next", "dev", "-p", String(PORT)]);
start("node", ["scripts/build-electron.mjs", "--watch"]);

// Wait until Next answers before opening the window.
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
const waitForServer = async (tries) => {
  const up = await fetch(URL).then(() => true, () => false);
  if (up || tries <= 0) return;
  await sleep(500);
  await waitForServer(tries - 1);
};
await waitForServer(120);

start("npx", ["electron", "."], { PAPERCHASE_DEV_URL: URL }).on("exit", () => {
  stopAll();
  process.exit(0);
});
process.on("SIGINT", stopAll);
