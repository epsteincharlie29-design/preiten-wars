// PreitenWars: Ein-Port-Betrieb für Gratis-Hoster (z.B. Render).
//
// Im Original verteilt nginx die Anfragen: /wN/... (inkl. WebSockets) an die
// Worker-Prozesse auf Port 3001+N und /api/create_game an irgendeinen Worker.
// Hoster wie Render geben aber nur EINEN Port frei. Mit SINGLE_PORT=1 übernimmt
// der Master-Prozess diese Verteilung selbst und lauscht auf $PORT.
import type { NextFunction, Request, Response } from "express";
import http from "http";
import net from "net";
import { ServerEnv } from "./ServerEnv";

const WORKER_PATH = /^\/w(\d+)(\/.*)?$/;
const CREATE_PATHS = new Set([
  "/api/create_game",
  "/api/adminbot/create_game",
  "/api/adminbot/create_pool",
]);

export function singlePortEnabled(): boolean {
  return process.env.SINGLE_PORT === "1";
}

/** Ziel (Worker-Port + Pfad) für eine URL, oder null wenn der Master zuständig ist. */
export function workerTarget(
  url: string,
  numWorkers: number,
): { port: number; path: string } | null {
  const q = url.indexOf("?");
  const pathname = q === -1 ? url : url.slice(0, q);
  const search = q === -1 ? "" : url.slice(q);
  const m = WORKER_PATH.exec(pathname);
  if (m) {
    const idx = Number(m[1]);
    if (!Number.isInteger(idx) || idx < 0 || idx >= numWorkers) return null;
    return {
      port: ServerEnv.workerPortByIndex(idx),
      path: (m[2] ?? "/") + search,
    };
  }
  if (CREATE_PATHS.has(pathname)) {
    const idx = Math.floor(Math.random() * numWorkers);
    return { port: ServerEnv.workerPortByIndex(idx), path: url };
  }
  return null;
}

/** Express-Middleware: leitet Worker-Anfragen weiter. Muss VOR express.json() hängen,
 *  damit der Request-Body unangetastet durchgereicht wird. */
export function singlePortHttpProxy() {
  return (req: Request, res: Response, next: NextFunction) => {
    const target = workerTarget(req.originalUrl, ServerEnv.numWorkers());
    if (!target) return next();
    const upstream = http.request(
      {
        host: "127.0.0.1",
        port: target.port,
        method: req.method,
        path: target.path,
        headers: {
          ...req.headers,
          "x-forwarded-for": req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "",
        },
      },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.on("error", () => {
      if (!res.headersSent) res.status(502).send("Worker nicht erreichbar");
      else res.end();
    });
    req.pipe(upstream);
  };
}

/** WebSocket-Upgrades (/wN/...) an den passenden Worker durchreichen. */
export function attachSinglePortUpgrade(server: http.Server) {
  server.on("upgrade", (req, socket, head) => {
    const target = workerTarget(req.url ?? "/", ServerEnv.numWorkers());
    if (!target) {
      socket.destroy();
      return;
    }
    const upstream = net.connect(target.port, "127.0.0.1", () => {
      const lines = [`${req.method} ${target.path} HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      }
      upstream.write(lines.join("\r\n") + "\r\n\r\n");
      if (head && head.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    const close = () => {
      upstream.destroy();
      socket.destroy();
    };
    upstream.on("error", close);
    socket.on("error", close);
  });
}

export function singlePortListenPort(): number {
  const p = Number(process.env.PORT);
  return Number.isInteger(p) && p > 0 ? p : 3000;
}
