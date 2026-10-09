/*
 * Quito GIS - interfaz compartida (encabezado, barra de acciones, paneles, estado).
 * Cada página crea su mapa con su librería y se lo "adjunta" a la interfaz mediante un
 * adaptador (ver `ui.attach`). Así la comparación entre librerías es sólo el código del mapa.
 *
 * Contrato del adaptador (todos los métodos son síncronos):
 *   setBasemap(def)        mostrar el mapa base `def` (ver QuitoCore.BASEMAPS)
 *   setVisible(ids: Set)   mostrar sólo los puntos con esos ids
 *   focus(poi)             centrar/acercar y abrir el popup del punto
 *   home()                 volver a la vista inicial
 *   zoomBy(delta)          +1 / -1
 *   setMeasure(active)     activar/desactivar el modo de medición (cursor, doble clic, etc.)
 *   drawMeasure(points)    dibujar la polilínea [[lng, lat], ...]
 *   showLocation(lng, lat) marcar y centrar la ubicación del usuario
 *   resize()               el contenedor cambió de tamaño
 *   setPitch(deg)          (opcional) inclinación 3D
 * Y la interfaz expone al adaptador: view(), cursor(), selectPoi(), measureClick(),
 * measureFinish(), basemapEvent(), notify().
 */
(function (root) {
  "use strict";

  var C = root.QuitoCore;
  var STORE_THEME = "quito-gis-theme";
  var STORE_BASEMAP = "quito-gis-basemap";
  var ERROR_LIMIT = 3; // errores de tesela sin ninguna carga correcta => se considera caído

  var ICONS = {
    globe: '<circle cx="8" cy="8" r="6.5"/><ellipse cx="8" cy="8" rx="2.8" ry="6.5"/><path d="M1.5 8h13"/>',
    pin: '<path d="M8 14.5s4.5-4.2 4.5-8a4.5 4.5 0 0 0-9 0c0 3.8 4.5 8 4.5 8z"/><circle cx="8" cy="6.5" r="1.6"/>',
    filter: '<path d="M1.5 3h13L9.5 9v4.5l-3-1.5V9z"/>',
    layers: '<path d="M8 1.5 1.5 5 8 8.5 14.5 5z"/><path d="M1.5 8 8 11.5 14.5 8"/><path d="M1.5 11 8 14.5 14.5 11"/>',
    ruler: '<path d="M2 11.5 11.5 2 14 4.5 4.5 14z"/><path d="m4.5 9 1.5 1.5M7 6.5 8.5 8M9.5 4 11 5.5"/>',
    search: '<circle cx="6.8" cy="6.8" r="4.3"/><path d="m10 10 4.5 4.5"/>',
    close: '<path d="m3 3 10 10M13 3 3 13"/>',
    plus: '<path d="M8 2.5v11M2.5 8h11"/>',
    minus: '<path d="M2.5 8h11"/>',
    home: '<path d="M2 7.5 8 2l6 5.5"/><path d="M3.5 6.8V14H7v-4h2v4h3.5V6.8"/>',
    locate: '<circle cx="8" cy="8" r="3.2"/><path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15"/>',
    expand: '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/>',
    contrast: '<circle cx="8" cy="8" r="5.8"/><path d="M8 2.2v11.6a5.8 5.8 0 0 0 0-11.6z" fill="currentColor"/>',
    cube: '<path d="M8 1.5 14 4.7v6.6L8 14.5 2 11.3V4.7z"/><path d="M2 4.7 8 8l6-3.3M8 8v6.5"/>',
    trash: '<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4"/>',
    check: '<path d="m3 8.5 3.5 3.5L13 4.5"/>',
  };

  function icon(name) {
    return '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + ICONS[name] + "</svg>";
  }

  function store(key, value) {
    try {
      if (value === undefined) return root.localStorage.getItem(key);
      root.localStorage.setItem(key, value);
    } catch (e) { /* almacenamiento bloqueado: se ignora */ }
    return null;
  }

  var LINKS = [
    { href: "index.html", label: "Inicio", key: "home" },
    { href: "leaflet-quito.html", label: "Leaflet", key: "Leaflet" },
    { href: "maplibre-quito.html", label: "MapLibre GL", key: "MapLibre GL" },
    { href: "openlayers-quito.html", label: "OpenLayers", key: "OpenLayers" },
    { href: "geoext-quito.html", label: "GeoExt", key: "GeoExt" },
  ];

  function applyTheme(theme) {
    root.document.documentElement.setAttribute("data-theme", theme);
  }

  function currentTheme() {
    return root.document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  /**
   * @param {{library: string, version: string, supports3D?: boolean, host?: HTMLElement}} opts
   */
  function mount(opts) {
    var doc = root.document;
    var host = opts.host || doc.getElementById("app");
    var supports3D = !!opts.supports3D;

    var nav = LINKS.map(function (l) {
      return '<a href="' + l.href + '"' + (l.key === opts.library ? ' aria-current="page"' : "") + ">" + l.label + "</a>";
    }).join("");

    host.innerHTML =
      '<div class="shell" id="shell">' +
      '<header class="header">' +
      '<a class="brand" href="index.html" aria-label="Quito GIS, inicio">' + icon("globe") + '<span class="brand-name">Quito GIS</span></a>' +
      '<span class="brand-lib">' + C.escapeHtml(opts.library) + " " + C.escapeHtml(opts.version) + "</span>" +
      '<nav class="nav" aria-label="Visores">' + nav + "</nav>" +
      '<button class="btn btn-icon" id="btn-theme" type="button" title="Cambiar tema claro/oscuro" aria-label="Cambiar tema claro/oscuro">' + icon("contrast") + "</button>" +
      "</header>" +
      '<div class="rail" role="tablist" aria-orientation="vertical" aria-label="Paneles">' +
      '<button type="button" role="tab" data-panel="points" title="Puntos de interés">' + icon("pin") + '<span class="badge" id="badge-points">0</span></button>' +
      '<button type="button" role="tab" data-panel="filter" title="Filtro y leyenda">' + icon("filter") + "</button>" +
      '<button type="button" role="tab" data-panel="basemap" title="Mapa base">' + icon("layers") + "</button>" +
      '<button type="button" role="tab" data-panel="tools" title="Herramientas">' + icon("ruler") + "</button>" +
      "</div>" +
      '<aside class="panel" id="panel">' +
      panelPoints() + panelFilter() + panelBasemap() + panelTools(supports3D) +
      "</aside>" +
      '<main class="main">' +
      '<div class="map-wrap">' +
      '<div class="map" id="map" aria-label="Mapa de Quito"></div>' +
      '<div class="map-tools">' +
      '<div class="map-group">' +
      '<button type="button" id="z-in" title="Acercar" aria-label="Acercar">' + icon("plus") + "</button>" +
      '<button type="button" id="z-out" title="Alejar" aria-label="Alejar">' + icon("minus") + "</button>" +
      "</div>" +
      '<div class="map-group">' +
      '<button type="button" id="z-home" title="Vista inicial" aria-label="Vista inicial">' + icon("home") + "</button>" +
      '<button type="button" id="z-locate" title="Mi ubicación" aria-label="Mi ubicación">' + icon("locate") + "</button>" +
      "</div>" +
      "</div>" +
      '<div class="notice" id="notice" role="status" aria-live="polite" hidden></div>' +
      "</div>" +
      '<footer class="statusbar">' +
      '<span>Lon <b id="st-lng">—</b> &nbsp;Lat <b id="st-lat">—</b></span>' +
      '<span class="grow"></span>' +
      '<span>Escala <b id="st-scale">—</b></span>' +
      '<span>Zoom <b id="st-zoom">—</b></span>' +
      "<span>WGS 84</span>" +
      "</footer>" +
      "</main>" +
      "</div>";

    return create(host, opts, supports3D);
  }

  function panelPoints() {
    return (
      '<section class="panel-view" id="view-points" role="tabpanel" aria-label="Puntos de interés">' +
      '<div class="panel-head"><h2>Puntos de interés</h2><button class="btn btn-icon" type="button" data-close title="Cerrar panel" aria-label="Cerrar panel" style="border-color:transparent">' + icon("close") + "</button></div>" +
      '<div class="search">' + icon("search") + '<input id="q" type="search" placeholder="Buscar por nombre o descripción" autocomplete="off" aria-label="Buscar puntos" />' +
      '<button class="clear" id="q-clear" type="button" aria-label="Borrar búsqueda">' + icon("close") + "</button></div>" +
      '<div class="panel-sub"><span id="results-count"></span></div>' +
      '<div class="panel-body"><ul class="results" id="results"></ul></div>' +
      "</section>"
    );
  }

  function panelFilter() {
    var rows = C.CATEGORIES.map(function (c) {
      return (
        '<li><label><input type="checkbox" data-cat="' + c.id + '" checked />' +
        '<span class="dot" style="background:' + c.color + '"></span><span>' + c.label + '</span>' +
        '<span class="n" id="n-' + c.id + '">0</span></label></li>'
      );
    }).join("");
    return (
      '<section class="panel-view" id="view-filter" role="tabpanel" aria-label="Filtro y leyenda">' +
      '<div class="panel-head"><h2>Filtro y leyenda</h2><button class="btn btn-icon" type="button" data-close title="Cerrar panel" aria-label="Cerrar panel" style="border-color:transparent">' + icon("close") + "</button></div>" +
      '<div class="panel-sub"><span>Categorías visibles</span><span><button class="btn btn-text" type="button" id="cat-all">Todas</button><button class="btn btn-text" type="button" id="cat-none">Ninguna</button></span></div>' +
      '<div class="panel-body"><ul class="legend">' + rows + "</ul></div>" +
      "</section>"
    );
  }

  function panelBasemap() {
    var items = C.BASEMAPS.map(function (b) {
      return (
        '<li><button class="bm" type="button" role="radio" aria-checked="false" data-bm="' + b.id + '">' +
        '<img class="bm-thumb" alt="" width="160" height="120" loading="lazy" data-thumb="' + b.id + '" />' +
        '<span class="bm-name">' + b.label + "</span></button></li>"
      );
    }).join("");
    return (
      '<section class="panel-view" id="view-basemap" role="tabpanel" aria-label="Mapa base">' +
      '<div class="panel-head"><h2>Mapa base</h2><button class="btn btn-icon" type="button" data-close title="Cerrar panel" aria-label="Cerrar panel" style="border-color:transparent">' + icon("close") + "</button></div>" +
      '<div class="panel-body"><ul class="gallery" role="radiogroup" aria-label="Galería de mapas base">' + items + "</ul></div>" +
      "</section>"
    );
  }

  function panelTools(supports3D) {
    return (
      '<section class="panel-view" id="view-tools" role="tabpanel" aria-label="Herramientas">' +
      '<div class="panel-head"><h2>Herramientas</h2><button class="btn btn-icon" type="button" data-close title="Cerrar panel" aria-label="Cerrar panel" style="border-color:transparent">' + icon("close") + "</button></div>" +
      '<div class="panel-body pad"><div class="tools">' +
      '<button class="btn" type="button" id="t-measure" aria-pressed="false">' + icon("ruler") + "Medir distancia</button>" +
      '<button class="btn" type="button" id="t-locate">' + icon("locate") + "Mi ubicación</button>" +
      (supports3D ? '<button class="btn" type="button" id="t-3d" aria-pressed="false">' + icon("cube") + "Vista inclinada (3D)</button>" : "") +
      '<button class="btn" type="button" id="t-full">' + icon("expand") + "Pantalla completa</button>" +
      "</div>" +
      '<div class="card" id="measure-card" hidden>' +
      "<h3>Distancia</h3>" +
      '<div class="value" id="m-value">0 m</div>' +
      '<div class="hint" id="m-hint">Haga clic en el mapa para añadir vértices.</div>' +
      '<div class="row"><button class="btn btn-brand" type="button" id="m-finish">Finalizar</button><button class="btn" type="button" id="m-clear">' + icon("trash") + "Borrar</button></div>" +
      "</div>" +
      '<table class="kv" aria-label="Cursor"><tr><th>Latitud</th><td id="kv-lat">—</td></tr><tr><th>Longitud</th><td id="kv-lng">—</td></tr><tr><th>Puntos visibles</th><td id="kv-visible">—</td></tr></table>' +
      "</div></section>"
    );
  }

  function create(host, opts, supports3D) {
    var doc = root.document;
    var $ = function (id) { return doc.getElementById(id); };
    var shell = $("shell");
    var engine = null;

    var state = {
      query: "",
      categories: new Set(C.CATEGORIES.map(function (c) { return c.id; })),
      selected: null,
      basemap: null,
      panel: null,
      measuring: false,
      measurePoints: [],
      is3D: false,
    };

    /* ---------- paneles ---------- */
    var rail = shell.querySelectorAll(".rail button");
    function showPanel(name) {
      state.panel = name;
      shell.classList.toggle("panel-closed", !name);
      Array.prototype.forEach.call(rail, function (b) {
        var on = b.getAttribute("data-panel") === name;
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      Array.prototype.forEach.call(shell.querySelectorAll(".panel-view"), function (v) {
        v.classList.toggle("is-active", v.id === "view-" + name);
      });
      if (name === "basemap") loadThumbs();
    }
    Array.prototype.forEach.call(rail, function (b) {
      b.addEventListener("click", function () {
        var name = b.getAttribute("data-panel");
        showPanel(state.panel === name ? null : name);
      });
    });
    Array.prototype.forEach.call(shell.querySelectorAll("[data-close]"), function (b) {
      b.addEventListener("click", function () { showPanel(null); });
    });

    /* ---------- aviso ---------- */
    var noticeTimer = null;
    function notify(message, kind) {
      var n = $("notice");
      n.textContent = message;
      n.setAttribute("data-kind", kind || "info");
      n.hidden = false;
      root.clearTimeout(noticeTimer);
      noticeTimer = root.setTimeout(function () { n.hidden = true; }, 4000);
    }

    /* ---------- lista, filtro y búsqueda ---------- */
    var visible = C.POIS.slice();

    function refresh() {
      visible = C.filterPois(C.POIS, { query: state.query, categories: state.categories });
      renderResults();
      $("badge-points").textContent = visible.length;
      $("kv-visible").textContent = visible.length + " de " + C.POIS.length;
      if (engine) engine.setVisible(new Set(visible.map(function (p) { return p.id; })));
      if (state.selected && !visible.some(function (p) { return p.id === state.selected; })) state.selected = null;
    }

    function renderResults() {
      var ul = $("results");
      var frag = doc.createDocumentFragment();
      visible.forEach(function (p) {
        var cat = C.categoryById(p.tipo);
        var li = doc.createElement("li");
        var b = doc.createElement("button");
        b.type = "button";
        b.className = "result";
        b.setAttribute("data-id", p.id);
        b.setAttribute("aria-current", p.id === state.selected ? "true" : "false");
        b.innerHTML =
          '<span class="dot" style="background:' + cat.color + '"></span>' +
          '<span><span class="result-title">' + C.escapeHtml(p.nombre) + '</span><br><span class="result-cat">' + C.escapeHtml(cat.label) + "</span></span>" +
          '<span class="result-desc">' + C.escapeHtml(p.descripcion) + "</span>";
        li.appendChild(b);
        frag.appendChild(li);
      });
      ul.textContent = "";
      if (!visible.length) {
        var li = doc.createElement("li");
        li.className = "empty";
        li.textContent = "Ningún punto coincide con la búsqueda o el filtro.";
        frag.appendChild(li);
      }
      ul.appendChild(frag);
      $("results-count").textContent = visible.length + (visible.length === 1 ? " resultado" : " resultados");
    }

    $("results").addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".result") : null;
      if (!btn) return;
      var poi = C.POIS.filter(function (p) { return p.id === btn.getAttribute("data-id"); })[0];
      if (!poi) return;
      selectPoi(poi.id);
      if (engine) engine.focus(poi);
      if (root.matchMedia && root.matchMedia("(max-width: 760px)").matches) showPanel(null);
    });

    function selectPoi(id) {
      state.selected = id;
      Array.prototype.forEach.call($("results").querySelectorAll(".result"), function (b) {
        b.setAttribute("aria-current", b.getAttribute("data-id") === id ? "true" : "false");
      });
    }

    var q = $("q");
    var qClear = $("q-clear");
    q.addEventListener("input", function () {
      state.query = q.value;
      qClear.classList.toggle("is-visible", !!q.value);
      refresh();
    });
    qClear.addEventListener("click", function () {
      q.value = "";
      state.query = "";
      qClear.classList.remove("is-visible");
      refresh();
      q.focus();
    });

    var counts = C.countByCategory(C.POIS);
    C.CATEGORIES.forEach(function (c) { $("n-" + c.id).textContent = counts[c.id]; });
    Array.prototype.forEach.call(shell.querySelectorAll("[data-cat]"), function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.getAttribute("data-cat");
        if (cb.checked) state.categories.add(id); else state.categories.delete(id);
        refresh();
      });
    });
    function setAllCategories(on) {
      state.categories = new Set(on ? C.CATEGORIES.map(function (c) { return c.id; }) : []);
      Array.prototype.forEach.call(shell.querySelectorAll("[data-cat]"), function (cb) { cb.checked = on; });
      refresh();
    }
    $("cat-all").addEventListener("click", function () { setAllCategories(true); });
    $("cat-none").addEventListener("click", function () { setAllCategories(false); });

    /* ---------- mapa base ---------- */
    var thumbsLoaded = false;
    function loadThumbs() {
      if (thumbsLoaded) return;
      thumbsLoaded = true;
      Array.prototype.forEach.call(shell.querySelectorAll("[data-thumb]"), function (img) {
        var def = C.basemapById(img.getAttribute("data-thumb"));
        img.addEventListener("error", function () { img.style.visibility = "hidden"; });
        img.src = C.tileUrl(def, def.thumb[0], def.thumb[1], def.thumb[2]);
      });
    }

    var tileStats = {}; // id -> {ok, err}
    function setBasemap(id, persist) {
      var def = C.basemapById(id) || C.basemapById(C.DEFAULT_BASEMAP);
      state.basemap = def.id;
      Array.prototype.forEach.call(shell.querySelectorAll("[data-bm]"), function (b) {
        b.setAttribute("aria-checked", b.getAttribute("data-bm") === def.id ? "true" : "false");
      });
      if (persist) store(STORE_BASEMAP, def.id);
      if (engine) engine.setBasemap(def);
    }
    shell.querySelector(".gallery").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-bm]") : null;
      if (b) setBasemap(b.getAttribute("data-bm"), true);
    });

    /** Los adaptadores avisan de cada tesela cargada/fallida del mapa base activo. */
    function basemapEvent(kind, id) {
      id = id || state.basemap;
      var s = tileStats[id] || (tileStats[id] = { ok: 0, err: 0 });
      if (kind === "load") { s.ok++; return; }
      s.err++;
      if (id !== state.basemap || s.ok > 0 || s.err < ERROR_LIMIT) return;
      var def = C.basemapById(id);
      if (id === C.FALLBACK_BASEMAP) {
        notify("No se pueden descargar teselas de «" + def.label + "». Revise la conexión.", "danger");
        return;
      }
      notify("«" + def.label + "» no responde. Se cambió a OpenStreetMap.", "warning");
      setBasemap(C.FALLBACK_BASEMAP, false);
    }

    /* ---------- vista y cursor ---------- */
    var pendingView = null;
    function view(v) {
      if (!pendingView) root.requestAnimationFrame(flushView);
      pendingView = v;
    }
    function flushView() {
      var v = pendingView;
      pendingView = null;
      if (!v) return;
      $("st-zoom").textContent = v.zoom.toFixed(1);
      $("st-scale").textContent = C.formatScale(v.zoom, v.lat);
    }
    var pendingCursor = null;
    function cursor(lng, lat) {
      if (!pendingCursor) root.requestAnimationFrame(flushCursor);
      pendingCursor = [lng, lat];
    }
    function flushCursor() {
      var c = pendingCursor;
      pendingCursor = null;
      if (!c) return;
      var lng = C.formatCoord(c[0], 5), lat = C.formatCoord(c[1], 5);
      $("st-lng").textContent = lng;
      $("st-lat").textContent = lat;
      $("kv-lng").textContent = lng;
      $("kv-lat").textContent = lat;
    }

    /* ---------- medición ---------- */
    function renderMeasure() {
      $("m-value").textContent = C.formatDistance(C.pathLength(state.measurePoints));
      var n = state.measurePoints.length;
      $("m-hint").textContent = state.measuring
        ? (n < 2 ? "Haga clic en el mapa para añadir vértices." : n + " vértices. Doble clic o «Finalizar» para terminar.")
        : (n < 2 ? "Medición vacía." : "Medición completada (" + n + " vértices).");
      if (engine) engine.drawMeasure(state.measurePoints);
    }
    function setMeasuring(on) {
      state.measuring = on;
      $("t-measure").setAttribute("aria-pressed", on ? "true" : "false");
      $("measure-card").hidden = !on && state.measurePoints.length < 2;
      if (engine) engine.setMeasure(on);
    }
    function measureClick(lng, lat) {
      if (!state.measuring) return;
      var last = state.measurePoints[state.measurePoints.length - 1];
      if (last && C.haversine(last, [lng, lat]) < 1) return; // clics repetidos del doble clic
      state.measurePoints.push([lng, lat]);
      renderMeasure();
    }
    function measureFinish() {
      if (!state.measuring) return;
      setMeasuring(false);
      renderMeasure();
      if (state.measurePoints.length > 1) notify("Distancia total: " + C.formatDistance(C.pathLength(state.measurePoints)), "success");
    }
    function measureClear() {
      state.measurePoints = [];
      renderMeasure();
      if (!state.measuring) $("measure-card").hidden = true;
    }
    $("t-measure").addEventListener("click", function () {
      if (state.measuring) { measureFinish(); return; }
      state.measurePoints = [];
      $("measure-card").hidden = false;
      setMeasuring(true);
      renderMeasure();
    });
    $("m-finish").addEventListener("click", measureFinish);
    $("m-clear").addEventListener("click", measureClear);
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.measuring) { measureClear(); setMeasuring(false); $("measure-card").hidden = true; }
    });

    /* ---------- herramientas y controles del mapa ---------- */
    function locate() {
      if (!root.navigator.geolocation) { notify("Este navegador no ofrece geolocalización.", "warning"); return; }
      notify("Buscando su ubicación…", "info");
      root.navigator.geolocation.getCurrentPosition(
        function (pos) {
          if (engine) engine.showLocation(pos.coords.longitude, pos.coords.latitude);
          notify("Ubicación encontrada (±" + Math.round(pos.coords.accuracy) + " m).", "success");
        },
        function (err) {
          notify(err && err.code === 1 ? "Permiso de ubicación denegado." : "No se pudo obtener la ubicación.", "warning");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
    $("t-locate").addEventListener("click", locate);
    $("z-locate").addEventListener("click", locate);
    $("z-in").addEventListener("click", function () { if (engine) engine.zoomBy(1); });
    $("z-out").addEventListener("click", function () { if (engine) engine.zoomBy(-1); });
    $("z-home").addEventListener("click", function () { if (engine) engine.home(); });
    $("t-full").addEventListener("click", function () {
      if (!doc.fullscreenEnabled) { notify("Pantalla completa no disponible.", "warning"); return; }
      if (doc.fullscreenElement) doc.exitFullscreen(); else doc.documentElement.requestFullscreen().catch(function () {});
    });
    if (supports3D) {
      $("t-3d").addEventListener("click", function () {
        state.is3D = !state.is3D;
        $("t-3d").setAttribute("aria-pressed", state.is3D ? "true" : "false");
        if (engine && engine.setPitch) engine.setPitch(state.is3D ? 60 : 0);
      });
    }

    /* ---------- tema ---------- */
    $("btn-theme").addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      store(STORE_THEME, next);
    });

    /* ---------- tamaño del contenedor ---------- */
    if (root.ResizeObserver) {
      new root.ResizeObserver(function () { if (engine) engine.resize(); }).observe($("map"));
    }

    var mobile = root.matchMedia && root.matchMedia("(max-width: 760px)").matches;
    showPanel(mobile ? null : "points");
    renderResults();
    refresh();

    return {
      mapEl: $("map"),
      state: state,
      popupHtml: C.popupHtml,
      isMeasuring: function () { return state.measuring; },
      attach: function (adapter) {
        engine = adapter;
        var saved = store(STORE_BASEMAP);
        setBasemap(C.basemapById(saved) ? saved : C.DEFAULT_BASEMAP, false);
        engine.setVisible(new Set(visible.map(function (p) { return p.id; })));
      },
      setBasemap: function (id) { setBasemap(id, true); },
      view: view,
      cursor: cursor,
      selectPoi: selectPoi,
      measureClick: measureClick,
      measureFinish: measureFinish,
      basemapEvent: basemapEvent,
      notify: notify,
      showPanel: showPanel,
    };
  }

  root.QuitoUI = { mount: mount, applyTheme: applyTheme, currentTheme: currentTheme, STORE_THEME: STORE_THEME, icon: icon };
})(typeof self !== "undefined" ? self : this);
