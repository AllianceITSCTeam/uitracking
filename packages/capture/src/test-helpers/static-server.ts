import { createServer } from "node:http";
import type { Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

export type FixtureServer = {
  url: string;
  close: () => Promise<void>;
};

/** Server tĩnh chỉ dùng trong test — phục vụ 1 thư mục HTML fixture qua http://localhost:<port>. */
export function startFixtureServer(rootDir: string): Promise<FixtureServer> {
  return new Promise((resolve, reject) => {
    const server: Server = createServer((req, res) => {
      const requestPath = normalize(decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/"));
      const filePath = join(rootDir, requestPath === "/" ? "/index.html" : requestPath);

      readFile(filePath)
        .then((body) => {
          const contentType = MIME_TYPES[extname(filePath)] ?? "application/octet-stream";
          res.writeHead(200, { "Content-Type": contentType });
          res.end(body);
        })
        .catch(() => {
          res.writeHead(404);
          res.end("Not found");
        });
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Failed to bind fixture server"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}
