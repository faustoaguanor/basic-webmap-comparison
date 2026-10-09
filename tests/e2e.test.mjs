import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startServer, mockNetwork, CHROMIUM_ARGS } from "./helpers.mjs";

let srv, browser;
before(async () => {
  srv = await startServer();
  browser = await chromium.launch({ args: CHROMIUM_ARGS });
});
after(async () => {
  await browser?.close();
  srv?.server.close();
});

/** Abre una página con red simulada y recoge errores de consola/página. */
async function open(file, { viewport = { width: 1280, height: 800 }, failHosts = [], storage } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const tiles = await mockNetwork(context, { failHosts });
  if (storage) await context.addInitScript((s) => { for (const k in s) localStorage.setItem(k, s[k]); }, storage);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${srv.base}/${file}`);
  await page.waitForFunction(() => window.__quito, null, { timeout: 15000 });
  return { page, context, tiles, errors };
}

const waitTiles = async (tiles, pred, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (tiles.some(pred)) return true; await new Promise((r) => setTimeout(r, 50)); }
  return false;
};

const VIEWERS = [
  { name: "Leaflet", file: "leaflet-quito.html" },
  { name: "MapLibre GL", file: "maplibre-quito.html" },
  { name: "OpenLayers", file: "openlayers-quito.html" },
];

for (const v of VIEWERS) {
  test(`${v.name}: carga sin errores, 12 puntos y mapa base Esri con el orden {z}/{y}/{x}`, async () => {
    const { page, context, tiles, errors } = await open(v.file);
    assert.equal(await page.locator("#results .result").count(), 12);
    assert.equal(await page.locator("#badge-points").textContent(), "12");
    assert.equal(await page.locator("[data-bm][aria-checked=true]").count(), 1);

    // Zoom 13 sobre Quito: columna x≈2308, fila y≈4101. Si la plantilla estuviera invertida se vería al revés.
    assert.ok(await waitTiles(tiles, (t) => /World_Street_Map\/MapServer\/tile\/13\/(\d+)\/(\d+)$/.test(t.path) && Math.abs(+t.path.split("/").at(-2) - 4101) <= 6 && Math.abs(+t.path.split("/").at(-1) - 2308) <= 8), "no se pidieron teselas Esri con fila/columna correctas");
    assert.ok(!tiles.some((t) => t.host === "tile.openstreetmap.org"), "OSM no debería pedirse si no está seleccionado");
    assert.deepEqual(errors, []);
    await context.close();
  });

  test(`${v.name}: búsqueda sin tildes y botón de borrar`, async () => {
    const { page, context } = await open(v.file);
    await page.fill("#q", "teleferico");
    assert.equal(await page.locator("#results .result").count(), 1);
    assert.match(await page.locator("#results .result").first().textContent(), /Teleférico de Quito/);
    assert.equal(await page.evaluate(() => window.__quito.visibleCount()), 1);
    await page.fill("#q", "zzzz");
    assert.equal(await page.locator("#results .result").count(), 0);
    assert.match(await page.locator("#results .empty").textContent(), /Ningún punto/);
    await page.fill("#q", "x");
    await page.click("#q-clear");
    assert.equal(await page.inputValue("#q"), "");
    assert.equal(await page.locator("#results .result").count(), 12);
    assert.equal(await page.evaluate(() => window.__quito.visibleCount()), 12);
    await context.close();
  });

  test(`${v.name}: el filtro por categoría actualiza lista, contador y mapa`, async () => {
    const { page, context } = await open(v.file);
    await page.click('.rail [data-panel="filter"]');
    await page.click("#cat-none");
    assert.equal(await page.evaluate(() => window.__quito.visibleCount()), 0);
    await page.check('[data-cat="mirador"]');
    assert.equal(await page.evaluate(() => window.__quito.visibleCount()), 3);
    await page.click('.rail [data-panel="points"]');
    assert.equal(await page.locator("#results .result").count(), 3);
    assert.equal(await page.locator("#badge-points").textContent(), "3");
    await page.fill("#q", "parque");
    assert.equal(await page.locator("#results .result").count(), 1); // Itchimbia
    await page.click('.rail [data-panel="filter"]');
    await page.click("#cat-all");
    assert.equal(await page.evaluate(() => window.__quito.visibleCount()), 3); // "parque" sigue activo: 3 coincidencias
    await context.close();
  });

  test(`${v.name}: al elegir un resultado se abre el popup con sus datos`, async () => {
    const { page, context } = await open(v.file);
    await page.locator('#results .result[data-id="panecillo"]').click();
    await page.locator(".qp-title", { hasText: "El Panecillo" }).waitFor({ timeout: 8000 });
    assert.match(await page.locator(".qp").textContent(), /Latitud.*−0\.22861.*Longitud.*−78\.51861/s);
    assert.equal(await page.locator('#results .result[aria-current="true"]').count(), 1);
    await context.close();
  });

  test(`${v.name}: cambiar de mapa base pide las teselas de ese proveedor y se recuerda`, async () => {
    const { page, context, tiles } = await open(v.file);
    await page.click('.rail [data-panel="basemap"]');
    await page.click('[data-bm="osm"]');
    assert.ok(await waitTiles(tiles, (t) => t.host === "tile.openstreetmap.org" && /^\/\d+\/\d+\/\d+\.png$/.test(t.path)));
    assert.equal(await page.getAttribute('[data-bm="osm"]', "aria-checked"), "true");
    await page.click('[data-bm="imagery"]');
    assert.ok(await waitTiles(tiles, (t) => /World_Imagery\/MapServer\/tile\//.test(t.path)));
    assert.equal(await page.getAttribute('[data-bm="streets"]', "aria-checked"), "false");
    assert.equal(await page.evaluate(() => localStorage.getItem("quito-gis-basemap")), "imagery");

    await page.reload();
    await page.waitForFunction(() => window.__quito);
    assert.equal(await page.getAttribute('[data-bm="imagery"]', "aria-checked"), "true");
    await context.close();
  });

  test(`${v.name}: si el mapa base no responde, cae a OpenStreetMap y avisa`, async () => {
    const { page, context, tiles } = await open(v.file, { failHosts: ["server.arcgisonline.com"] });
    await page.locator("#notice:not([hidden])").waitFor({ timeout: 10000 });
    assert.match(await page.locator("#notice").textContent(), /Se cambió a OpenStreetMap/);
    assert.equal(await page.getAttribute('[data-bm="osm"]', "aria-checked"), "true");
    assert.ok(await waitTiles(tiles, (t) => t.host === "tile.openstreetmap.org"));
    await context.close();
  });

  test(`${v.name}: medir distancia (≈1,9 km para 100 px a zoom 13) y borrar`, async () => {
    const { page, context } = await open(v.file);
    await page.click('.rail [data-panel="tools"]');
    await page.click("#t-measure");
    const box = await page.locator("#map").boundingBox();
    const x = box.x + box.width / 2 + 60, y = box.y + box.height / 2 - 220;
    await page.mouse.click(x, y);
    await page.waitForTimeout(350); // evita que Leaflet/OL lo tomen como doble clic
    await page.mouse.click(x, y + 100);
    await page.waitForTimeout(350);
    const km = parseFloat((await page.locator("#m-value").textContent()).replace(" km", ""));
    assert.ok(km > 1.85 && km < 1.97, `distancia fuera de rango: ${km}`);
    await page.click("#m-finish");
    assert.equal(await page.getAttribute("#t-measure", "aria-pressed"), "false");
    assert.match(await page.locator("#m-hint").textContent(), /completada/);
    await page.click("#m-clear");
    assert.equal(await page.locator("#m-value").textContent(), "0 m");
    await context.close();
  });

  test(`${v.name}: el tema oscuro se aplica y persiste sin tocar el mapa base`, async () => {
    const { page, context } = await open(v.file);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "light");
    await page.click("#btn-theme");
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
    assert.equal(await page.getAttribute('[data-bm="streets"]', "aria-checked") ?? "", "true"); // el mapa base no cambió
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
    await context.close();
  });

  test(`${v.name}: el cursor actualiza coordenadas y la barra de estado muestra escala y zoom`, async () => {
    const { page, context } = await open(v.file);
    const box = await page.locator("#map").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2 + 5);
    await page.waitForFunction(() => /−78\.5\d{4}/.test(document.getElementById("st-lng").textContent));
    assert.match(await page.locator("#st-scale").textContent(), /^1:\d{2}\.\d{3}$/);
    assert.match(await page.locator("#st-zoom").textContent(), /^13\.0$/);
    await page.click("#z-in");
    await page.waitForFunction(() => document.getElementById("st-zoom").textContent === "14.0", null, { timeout: 5000 });
    await page.click("#z-home");
    await page.waitForFunction(() => document.getElementById("st-zoom").textContent === "13.0", null, { timeout: 5000 });
    await context.close();
  });

  test(`${v.name}: en móvil el panel empieza cerrado, se abre desde la barra inferior y no hay desbordamiento`, async () => {
    const { page, context } = await open(v.file, { viewport: { width: 390, height: 800 } });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.equal(await page.locator("#panel").isVisible(), false);
    await page.click('.rail [data-panel="points"]');
    assert.equal(await page.locator("#panel").isVisible(), true);
    await page.locator("#results .result").first().click();
    assert.equal(await page.locator("#panel").isVisible(), false); // se cierra para ver el mapa
    await context.close();
  });
}

test("MapLibre GL: cambiar de mapa base no usa setStyle y conserva los puntos; la vista inclinada funciona", async () => {
  const { page, context } = await open("maplibre-quito.html");
  await page.waitForFunction(() => window.__quito.map.loaded() || true);
  await page.click('.rail [data-panel="basemap"]');
  for (const id of ["darkgray", "topo", "osm"]) await page.click(`[data-bm="${id}"]`);
  const vis = await page.evaluate(() => {
    const m = window.__quito.map;
    return { visible: m.getStyle().layers.filter((l) => l.id.startsWith("bm-") && (l.layout?.visibility ?? "visible") === "visible").map((l) => l.id), pois: !!m.getLayer("pois") };
  });
  assert.deepEqual(vis.visible, ["bm-osm"]);
  assert.equal(vis.pois, true);
  await page.click('.rail [data-panel="tools"]');
  await page.click("#t-3d");
  await page.waitForFunction(() => Math.abs(window.__quito.map.getPitch() - 60) < 0.5, null, { timeout: 5000 });
  await page.click("#t-3d");
  await page.waitForFunction(() => window.__quito.map.getPitch() < 0.5, null, { timeout: 5000 });
  await context.close();
});

test("OpenLayers: sólo la capa del mapa base activo está visible y las demás no se crean hasta usarse", async () => {
  const { page, context } = await open("openlayers-quito.html");
  const n = () => page.evaluate(() => window.__quito.map.getLayers().getArray().filter((l) => l.getSource() && l.getSource().getUrls).length);
  assert.equal(await n(), 1);
  await page.click('.rail [data-panel="basemap"]');
  await page.click('[data-bm="gray"]');
  assert.equal(await n(), 2);
  const visibleBase = await page.evaluate(() => window.__quito.map.getLayers().getArray().filter((l) => l.getSource() && l.getSource().getUrls && l.getVisible()).length);
  assert.equal(visibleBase, 1);
  await context.close();
});

test("GeoExt: Ext JS + GeoExt cargan desde el CDN, 12 filas, búsqueda y popup de GeoExt", async () => {
  const { page, context, tiles, errors } = await open("geoext-quito.html");
  await page.waitForSelector(".x-grid-item", { timeout: 15000 });
  assert.equal(await page.locator(".x-grid-item").count(), 12);
  assert.ok(await page.evaluate(() => !!Ext.ClassManager.get("GeoExt.component.Map") && !!Ext.ClassManager.get("GeoExt.component.Popup")), "GeoExt no cargó");
  assert.ok(await waitTiles(tiles, (t) => /World_Street_Map\/MapServer\/tile\/13\/(\d+)\/(\d+)$/.test(t.path) && Math.abs(+t.path.split("/").at(-2) - 4101) <= 6));

  await page.fill('input[placeholder^="Buscar"]', "teleferico");
  await page.waitForFunction(() => document.querySelectorAll(".x-grid-item").length === 1);
  assert.equal(await page.evaluate(() => window.__quito.visibleCount()), 1);

  await page.locator(".x-grid-item").first().click();
  await page.locator(".gx-popup .qp-title", { hasText: "Teleférico de Quito" }).waitFor({ timeout: 8000 });
  assert.deepEqual(errors, []);
  await context.close();
});

test("GeoExt: el selector de mapa base cambia de proveedor", async () => {
  const { page, context, tiles } = await open("geoext-quito.html");
  await page.waitForSelector(".x-grid-item", { timeout: 15000 });
  await page.evaluate(() => Ext.ComponentQuery.query("combobox")[0].setValue("osm"));
  assert.ok(await waitTiles(tiles, (t) => t.host === "tile.openstreetmap.org"));
  await context.close();
});

test("Todas las páginas de visor enlazan entre sí y la portada existe", async () => {
  const { page, context } = await open("leaflet-quito.html");
  const hrefs = await page.$$eval(".nav a", (as) => as.map((a) => a.getAttribute("href")));
  assert.deepEqual(hrefs, ["index.html", "leaflet-quito.html", "maplibre-quito.html", "openlayers-quito.html", "geoext-quito.html"]);
  for (const h of hrefs) assert.equal((await context.request.get(`${srv.base}/${h}`)).status(), 200, h);
  await context.close();
});

test("Portada: sin errores, cuatro tarjetas de visores válidas y tema oscuro persistente", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await mockNetwork(ctx);
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(`${srv.base}/index.html`);
  const cards = await p.$$eval(".item", (as) => as.map((a) => a.getAttribute("href")));
  assert.deepEqual(cards, ["leaflet-quito.html", "maplibre-quito.html", "openlayers-quito.html", "geoext-quito.html"]);
  await p.click("#btn-theme");
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), "dark");
  await p.reload();
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), "dark");
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.deepEqual(errs, []);
  await ctx.close();
});
