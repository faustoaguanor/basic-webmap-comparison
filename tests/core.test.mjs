import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const C = createRequire(import.meta.url)("../assets/quito-core.js");

test("hay 12 puntos con ids únicos, coordenadas dentro del área de Quito y categoría válida", () => {
  assert.equal(C.POIS.length, 12);
  assert.equal(new Set(C.POIS.map((p) => p.id)).size, 12);
  for (const p of C.POIS) {
    assert.ok(C.categoryById(p.tipo), `categoría inválida en ${p.id}`);
    assert.ok(p.lat > -0.4 && p.lat < 0.05, `latitud fuera de rango en ${p.id}`);
    assert.ok(p.lng > -78.7 && p.lng < -78.3, `longitud fuera de rango en ${p.id}`);
  }
});

test("las plantillas de mapa base de Esri usan {z}/{y}/{x} (fila antes que columna)", () => {
  const esri = C.BASEMAPS.filter((b) => b.url.includes("arcgisonline.com"));
  assert.ok(esri.length >= 4);
  for (const b of esri) assert.match(b.url, /\/tile\/\{z\}\/\{y\}\/\{x\}$/, b.id);
  assert.match(C.basemapById("osm").url, /\{z\}\/\{x\}\/\{y\}\.png$/);
});

test("el mapa base por defecto y el de respaldo existen", () => {
  assert.ok(C.basemapById(C.DEFAULT_BASEMAP));
  assert.ok(C.basemapById(C.FALLBACK_BASEMAP));
  assert.equal(C.basemapById("no-existe"), null);
});

test("tileUrl sustituye z/x/y", () => {
  assert.equal(
    C.tileUrl(C.basemapById("streets"), 12, 1154, 2050),
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/12/2050/1154"
  );
});

test("la miniatura de cada mapa base apunta a la tesela que contiene a Quito", () => {
  const n = 2 ** 12;
  const x = Math.floor(((C.CENTER.lng + 180) / 360) * n);
  const lat = (C.CENTER.lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n);
  for (const b of C.BASEMAPS) assert.deepEqual(b.thumb, [12, x, y], b.id);
});

test("haversine: cero, simetría y una referencia conocida", () => {
  const a = [-78.50833, -0.21861];
  const b = [-78.51861, -0.22861];
  assert.equal(C.haversine(a, a), 0);
  assert.equal(C.haversine(a, b), C.haversine(b, a));
  // 1 grado de longitud en el ecuador ≈ 111.195 km
  assert.ok(Math.abs(C.haversine([0, 0], [1, 0]) - 111195) < 50);
  // Centro Histórico -> Panecillo ≈ 1,5 km
  assert.ok(C.haversine(a, b) > 1400 && C.haversine(a, b) < 1650);
});

test("pathLength suma los tramos y tolera 0-1 puntos", () => {
  const p = [[0, 0], [1, 0], [1, 1]];
  assert.equal(C.pathLength([]), 0);
  assert.equal(C.pathLength([[0, 0]]), 0);
  assert.ok(Math.abs(C.pathLength(p) - (C.haversine(p[0], p[1]) + C.haversine(p[1], p[2]))) < 1e-6);
});

test("formatDistance", () => {
  assert.equal(C.formatDistance(0), "0 m");
  assert.equal(C.formatDistance(999.4), "999 m");
  assert.equal(C.formatDistance(1000), "1.00 km");
  assert.equal(C.formatDistance(12345), "12.35 km");
  assert.equal(C.formatDistance(NaN), "—");
});

test("formatCoord usa el signo menos tipográfico y redondea", () => {
  assert.equal(C.formatCoord(-78.52495, 5), "−78.52495");
  assert.equal(C.formatCoord(-0.22986, 4), "−0.2299");
  assert.equal(C.formatCoord(0.5, 2), "0.50");
});

test("escala a 96 dpi: zoom 0 en el ecuador y mitad por cada nivel", () => {
  assert.equal(Math.round(C.scaleDenominator(0, 0)), Math.round((156543.03392804097 * 96) / 0.0254));
  assert.ok(Math.abs(C.scaleDenominator(1, 0) * 2 - C.scaleDenominator(0, 0)) < 1e-3);
  assert.ok(C.scaleDenominator(13, 60) < C.scaleDenominator(13, 0)); // cos(lat)
  assert.match(C.formatScale(13, -0.22985), /^1:\d{2}\.\d{3}$/);
});

test("normalize ignora tildes y mayúsculas", () => {
  assert.equal(C.normalize("  Teleférico DE Quito "), "teleferico de quito");
  assert.equal(C.normalize(null), "");
});

test("filterPois: texto sin tildes, descripción, categorías y combinación", () => {
  const ids = (r) => r.map((p) => p.id).sort();
  assert.deepEqual(ids(C.filterPois(C.POIS, { query: "teleferico" })), ["teleferico"]);
  assert.ok(ids(C.filterPois(C.POIS, { query: "COMPAÑIA" })).includes("la-compania"));
  assert.ok(ids(C.filterPois(C.POIS, { query: "patrimonio" })).includes("centro-historico")); // sólo en la descripción
  assert.equal(C.filterPois(C.POIS, { categories: [] }).length, 0);
  assert.equal(C.filterPois(C.POIS, { categories: null }).length, 12);
  assert.deepEqual(ids(C.filterPois(C.POIS, { categories: ["mirador"] })), ["itchimbia", "panecillo", "teleferico"]);
  assert.deepEqual(ids(C.filterPois(C.POIS, { query: "parque", categories: ["mirador"] })), ["itchimbia"]);
  assert.equal(C.filterPois(C.POIS, { query: "zzz" }).length, 0);
});

test("countByCategory suma el total", () => {
  const counts = C.countByCategory(C.POIS);
  assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 12);
  assert.equal(counts.mirador, 3);
  assert.equal(counts.gastronomia, 2);
});

test("popupHtml escapa HTML y muestra coordenadas", () => {
  const html = C.popupHtml({ id: "x", nombre: '<img src=x onerror="a()">', descripcion: "a & b", tipo: "cultura", lat: -0.5, lng: -78.1 });
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img"));
  assert.ok(html.includes("a &amp; b"));
  assert.ok(html.includes("−0.50000") && html.includes("−78.10000"));
});
