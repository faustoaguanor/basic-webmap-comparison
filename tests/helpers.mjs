// Utilidades de las pruebas e2e: servidor estático, CDN simulado desde node_modules y teselas sintéticas.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml", ".gif": "image/gif", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".map": "application/json" };

export function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const file = path.join(ROOT, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` })));
}

/** PNG 256x256 de un solo color, generado sin dependencias. */
function solidPng(r, g, b) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(256, 0); ihdr.writeUInt32BE(256, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(256).fill([r, g, b]).flat())]);
  const raw = Buffer.concat(Array(256).fill(row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const TILE = solidPng(214, 224, 232);

const TILE_HOSTS = /^(server\.arcgisonline\.com|tile\.openstreetmap\.org)$/;

/**
 * Intercepta la red del navegador:
 *  - unpkg / jsdelivr -> paquetes de node_modules (la versión pedida se ignora)
 *  - servidores de teselas -> PNG sintético (o error si `failTiles` coincide con el host)
 *  - cualquier otro host externo -> vacío
 * Devuelve el registro de teselas pedidas.
 */
export async function mockNetwork(context, { failHosts = [] } = {}) {
  const tiles = [];
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
    const url = new URL(route.request().url());
    if (TILE_HOSTS.test(url.hostname)) {
      tiles.push({ host: url.hostname, path: url.pathname });
      if (failHosts.includes(url.hostname)) return route.fulfill({ status: 500, body: "boom" });
      return route.fulfill({ status: 200, contentType: "image/png", body: TILE, headers: { "access-control-allow-origin": "*" } });
    }
    let m = url.pathname.match(/^\/npm\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.+)$/); // jsdelivr
    if (url.hostname === "unpkg.com") m = url.pathname.match(/^\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.+)$/);
    if (m) {
      let rel = m[2];
      if (m[1] === "ol" && rel === "ol.css") rel = "ol.css";
      const file = path.join(ROOT, "node_modules", m[1], rel);
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        return route.fulfill({ status: 200, contentType: MIME[path.extname(file)] || "application/octet-stream", body: fs.readFileSync(file), headers: { "access-control-allow-origin": "*" } });
      }
    }
    return route.fulfill({ status: 404, body: "" });
  });
  return tiles;
}

export const CHROMIUM_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
