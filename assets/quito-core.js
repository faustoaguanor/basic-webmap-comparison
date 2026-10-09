/*
 * Quito GIS - núcleo compartido (sin dependencias de DOM ni de librerías de mapas).
 * Datos, catálogo de mapas base y utilidades puras; se prueba con `node --test`.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.QuitoCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CENTER = { lng: -78.52495, lat: -0.22985 };
  var ZOOM = 13;
  var MIN_ZOOM = 3;
  var MAX_ZOOM = 19;

  var CATEGORIES = [
    { id: "mirador", label: "Miradores", color: "#0079c1" },
    { id: "cultura", label: "Cultura", color: "#9e559c" },
    { id: "barrio", label: "Barrios", color: "#d83020" },
    { id: "naturaleza", label: "Naturaleza", color: "#56a05a" },
    { id: "gastronomia", label: "Gastronomía", color: "#f89927" },
  ];

  var POIS = [
    { id: "mitad-del-mundo", lng: -78.45556, lat: -0.00222, nombre: "Mitad del Mundo", tipo: "cultura", descripcion: "Monumento que marca la línea ecuatorial. Uno de los sitios más visitados del país." },
    { id: "centro-historico", lng: -78.50833, lat: -0.21861, nombre: "Centro Histórico", tipo: "cultura", descripcion: "Corazón colonial de Quito con iglesias, plazas y museos declarados Patrimonio de la Humanidad." },
    { id: "teleferico", lng: -78.54056, lat: -0.20194, nombre: "Teleférico de Quito", tipo: "mirador", descripcion: "Teleférico que asciende al volcán Pichincha a más de 4000 msnm con vistas panorámicas." },
    { id: "panecillo", lng: -78.51861, lat: -0.22861, nombre: "El Panecillo", tipo: "mirador", descripcion: "Colina con la icónica estatua de la Virgen de Quito y una vista de 360 grados de la capital." },
    { id: "la-mariscal", lng: -78.49417, lat: -0.21306, nombre: "La Mariscal", tipo: "barrio", descripcion: "Barrio bohemio y cultural, famoso por su vida nocturna, galerías de arte y restaurantes." },
    { id: "metropolitano", lng: -78.5167, lat: -0.25, nombre: "Parque Metropolitano Guangüiltagua", tipo: "naturaleza", descripcion: "El bosque protector más grande de Quito con 557 hectáreas de flora nativa y senderos." },
    { id: "la-carolina", lng: -78.4708, lat: -0.1807, nombre: "Parque La Carolina", tipo: "naturaleza", descripcion: "Pulmón verde del norte de Quito con jardines, lagos, ciclovías y el Jardín Botánico." },
    { id: "la-ronda", lng: -78.505, lat: -0.22, nombre: "La Ronda", tipo: "gastronomia", descripcion: "Callejón colonial restaurado con artesanos, gastronomía tradicional y vida nocturna cultural." },
    { id: "plaza-foch", lng: -78.51, lat: -0.215, nombre: "Plaza Foch", tipo: "gastronomia", descripcion: "Centro gastronómico y de entretenimiento con restaurantes internacionales y cocina fusión." },
    { id: "itchimbia", lng: -78.5113, lat: -0.1923, nombre: "Parque Itchimbia", tipo: "mirador", descripcion: "Mirador natural con vista panorámica del Centro Histórico y el cerro del Panecillo." },
    { id: "la-compania", lng: -78.5076, lat: -0.2198, nombre: "Iglesia de la Compañía", tipo: "cultura", descripcion: "Joya barroca con interior recubierto de oro, considerada la más bella de Latinoamérica." },
    { id: "san-marcos", lng: -78.5097, lat: -0.2214, nombre: "Barrio San Marcos", tipo: "barrio", descripcion: "Barrio patrimonial emergente con galerías de arte contemporáneo y cafeterías especializadas." },
  ];

  /*
   * Mapas base. Todos son teselas raster XYZ de servicios públicos, de modo que las
   * cuatro librerías comparan exactamente la misma fuente. OJO con el orden de Esri:
   * la plantilla es {z}/{y}/{x} (fila antes que columna), no {z}/{x}/{y}.
   * `thumb` = [z, x, y] de una tesela sobre Quito para la miniatura de la galería.
   */
  var ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/";
  var ESRI_ATTR =
    'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
  var BASEMAPS = [
    { id: "streets", label: "Calles", url: ESRI + "World_Street_Map/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 19, attribution: ESRI_ATTR, thumb: [12, 1154, 2050] },
    { id: "topo", label: "Topográfico", url: ESRI + "World_Topo_Map/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 19, attribution: ESRI_ATTR, thumb: [12, 1154, 2050] },
    { id: "imagery", label: "Imágenes", url: ESRI + "World_Imagery/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 18, attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community', thumb: [12, 1154, 2050] },
    { id: "gray", label: "Lienzo gris claro", url: ESRI + "Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 16, attribution: ESRI_ATTR, thumb: [12, 1154, 2050] },
    { id: "darkgray", label: "Lienzo gris oscuro", url: ESRI + "Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 16, attribution: ESRI_ATTR, thumb: [12, 1154, 2050] },
    { id: "osm", label: "OpenStreetMap", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", maxNativeZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors', thumb: [12, 1154, 2050] },
  ];
  var DEFAULT_BASEMAP = "streets";
  var FALLBACK_BASEMAP = "osm";

  function basemapById(id) {
    for (var i = 0; i < BASEMAPS.length; i++) if (BASEMAPS[i].id === id) return BASEMAPS[i];
    return null;
  }

  function categoryById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }

  function tileUrl(def, z, x, y) {
    return def.url.replace("{z}", z).replace("{x}", x).replace("{y}", y);
  }

  /* ---------- utilidades puras ---------- */

  var EARTH_RADIUS = 6371008.8; // radio medio (m), el mismo que usan Leaflet/MapLibre

  function toRad(d) {
    return (d * Math.PI) / 180;
  }

  /** Distancia haversine en metros entre dos pares [lng, lat]. */
  function haversine(a, b) {
    var dLat = toRad(b[1] - a[1]);
    var dLng = toRad(b[0] - a[0]);
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** Longitud total (m) de una polilínea [[lng, lat], ...]. */
  function pathLength(points) {
    var total = 0;
    for (var i = 1; i < points.length; i++) total += haversine(points[i - 1], points[i]);
    return total;
  }

  function formatDistance(meters) {
    if (!isFinite(meters)) return "—";
    if (meters >= 1000) return (meters / 1000).toFixed(2) + " km";
    return Math.round(meters) + " m";
  }

  function formatCoord(value, decimals) {
    return (value >= 0 ? "" : "−") + Math.abs(value).toFixed(decimals == null ? 5 : decimals);
  }

  /** Denominador de escala (1:N) para un zoom Web Mercator a una latitud dada, a 96 dpi. */
  function scaleDenominator(zoom, lat) {
    var resolution = (156543.03392804097 * Math.cos(toRad(lat))) / Math.pow(2, zoom);
    return resolution * (96 / 0.0254);
  }

  function formatScale(zoom, lat) {
    var n = Math.round(scaleDenominator(zoom, lat));
    return "1:" + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  /** Minúsculas sin tildes, para que "teleferico" encuentre "Teleférico". */
  function normalize(text) {
    return String(text == null ? "" : text)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  }

  /**
   * Filtra puntos por texto y categorías.
   * @param {Array} pois
   * @param {{query?: string, categories?: Iterable<string>|null}} opts  categories null = todas
   */
  function filterPois(pois, opts) {
    opts = opts || {};
    var q = normalize(opts.query);
    var cats = opts.categories == null ? null : new Set(opts.categories);
    return pois.filter(function (p) {
      if (cats && !cats.has(p.tipo)) return false;
      if (!q) return true;
      return normalize(p.nombre).indexOf(q) !== -1 || normalize(p.descripcion).indexOf(q) !== -1;
    });
  }

  function countByCategory(pois) {
    var counts = {};
    CATEGORIES.forEach(function (c) { counts[c.id] = 0; });
    pois.forEach(function (p) { counts[p.tipo] = (counts[p.tipo] || 0) + 1; });
    return counts;
  }

  var ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function escapeHtml(text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, function (c) { return ESCAPES[c]; });
  }

  /** Contenido del popup, común a las cuatro librerías (estilo ventana emergente de Esri). */
  function popupHtml(poi) {
    var cat = categoryById(poi.tipo) || { label: poi.tipo, color: "#6a6a6a" };
    return (
      '<div class="qp">' +
      '<div class="qp-title">' + escapeHtml(poi.nombre) + "</div>" +
      '<div class="qp-cat"><span class="qp-dot" style="background:' + cat.color + '"></span>' + escapeHtml(cat.label) + "</div>" +
      '<p class="qp-desc">' + escapeHtml(poi.descripcion) + "</p>" +
      '<table class="qp-table">' +
      "<tr><th>Latitud</th><td>" + formatCoord(poi.lat, 5) + "</td></tr>" +
      "<tr><th>Longitud</th><td>" + formatCoord(poi.lng, 5) + "</td></tr>" +
      "</table></div>"
    );
  }

  return {
    CENTER: CENTER,
    ZOOM: ZOOM,
    MIN_ZOOM: MIN_ZOOM,
    MAX_ZOOM: MAX_ZOOM,
    CATEGORIES: CATEGORIES,
    POIS: POIS,
    BASEMAPS: BASEMAPS,
    DEFAULT_BASEMAP: DEFAULT_BASEMAP,
    FALLBACK_BASEMAP: FALLBACK_BASEMAP,
    basemapById: basemapById,
    categoryById: categoryById,
    tileUrl: tileUrl,
    haversine: haversine,
    pathLength: pathLength,
    formatDistance: formatDistance,
    formatCoord: formatCoord,
    scaleDenominator: scaleDenominator,
    formatScale: formatScale,
    normalize: normalize,
    filterPois: filterPois,
    countByCategory: countByCategory,
    escapeHtml: escapeHtml,
    popupHtml: popupHtml,
  };
});
