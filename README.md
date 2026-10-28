# Quito GIS - Comparativa de Bibliotecas GIS Web

Mapas interactivos de puntos turísticos de Quito, Ecuador, implementados con tres bibliotecas JavaScript de código abierto: **Leaflet**, **MapLibre GL** y **OpenLayers**.

## Descripción

Comparativa práctica de cuatro bibliotecas GIS web: **Leaflet**, **MapLibre GL**, **OpenLayers** y **GeoExt**. Los cuatro visores muestran los mismos 12 puntos turísticos de Quito (5 categorías) con las mismas funciones: búsqueda, filtro por categoría, galería de mapas base, medición de distancias, geolocalización, escala y coordenadas del cursor, y tema claro/oscuro.

La interfaz sigue el lenguaje visual de [Calcite Design System](https://developers.arcgis.com/calcite-design-system/) / ArcGIS Map Viewer (superficies planas, azul `#007ac2`, sin degradados ni efectos de vidrio). Es un proyecto independiente, sin afiliación con Esri.

## Demo en vivo

> **[https://faustoaguanor.github.io/basic-webmap-comparison](https://faustoaguanor.github.io/basic-webmap-comparison/)**

## Estructura

```
├── index.html               # Portada y comparativa
├── leaflet-quito.html       # Visor Leaflet
├── maplibre-quito.html      # Visor MapLibre GL
├── openlayers-quito.html    # Visor OpenLayers
├── geoext-quito.html        # Visor GeoExt (Ext JS + OpenLayers)
├── assets/
│   ├── quito-core.js        # Datos, mapas base y utilidades puras (sin DOM)
│   ├── quito-ui.js          # Interfaz compartida (encabezado, paneles, estado)
│   ├── quito.css            # Estilos compartidos (tokens claro/oscuro)
│   ├── quito-geoext.css     # Ajustes del tema Crisp de Ext JS
│   └── quito-theme.js       # Aplica el tema guardado antes del primer pintado
└── tests/                   # Pruebas unitarias y e2e
```

Cada página de visor contiene **sólo el código de su biblioteca** (~150 líneas): crea el mapa y le pasa a la interfaz un adaptador con `setBasemap`, `setVisible`, `focus`, `home`, `zoomBy`, `setMeasure`, `drawMeasure`, `showLocation` y `resize` (contrato documentado en `assets/quito-ui.js`). Así la comparación entre bibliotecas es directa.

## Mapas base

Todos son teselas raster XYZ, por lo que las cuatro bibliotecas comparan la misma fuente:

| Mapa base | Servicio |
| --- | --- |
| Calles, Lienzo gris claro, Lienzo gris oscuro | CARTO Voyager / Positron / Dark Matter (`basemaps.cartocdn.com`) |
| Topográfico | OpenTopoMap (`tile.opentopomap.org`) |
| Imágenes | Sentinel-2 cloudless 2020 de EOX (`tiles.maps.eox.at`) |
| OpenStreetMap | `tile.openstreetmap.org` (respaldo) |

Notas:

- **Ninguno requiere clave de API.** Antes se usaban las teselas de `server.arcgisonline.com`, pero Esri las retiró: responden con una imagen de "API key requerida" con HTTP 200, por lo que el respaldo automático no saltaba. Una prueba unitaria impide volver a añadir servicios con clave.
- La plantilla de EOX es `{z}/{y}/{x}` (fila antes que columna); las demás son `{z}/{x}/{y}`. Una prueba unitaria lo verifica.
- Las imágenes Sentinel-2 tienen 10 m de resolución: por encima del zoom 15 se amplían las teselas de ese nivel.
- El mapa base es **independiente** del tema claro/oscuro de la interfaz, y la elección se guarda en `localStorage` entre visores.
- Si el mapa base activo falla (3 errores de teselas sin ninguna carga correcta), el visor cambia solo a OpenStreetMap y lo avisa.
- Todos estos servicios requieren atribución (se muestra automáticamente) y están pensados para uso moderado (p. ej. CARTO: uso no comercial; OSM y OpenTopoMap: sin tráfico masivo).

## Visores

| | Leaflet 1.9.4 | MapLibre GL 4.7.1 | OpenLayers 10.4.0 | GeoExt 7.0.1 |
| --- | --- | --- | --- | --- |
| Mapa base | una `L.tileLayer` por proveedor | un estilo con todas las capas raster; se alterna `visibility` (sin `setStyle`) | una `ol.layer.Tile` por proveedor, creada al usarse | igual que OpenLayers |
| Puntos | `L.circleMarker` (canvas) | capa `circle` GeoJSON + filtro por expresión | capa vectorial con estilos en caché | capa vectorial de OpenLayers |
| Popup | `L.popup` | `maplibregl.Popup` | `ol.Overlay` | `GeoExt.component.Popup` |
| Extra | mini-mapa (plugin) | vista inclinada 3D | `ol.control.ScaleLine` | cuadrícula y formularios de Ext JS, evento `pointerrest` |

Detalles de comparabilidad: MapLibre usa teselas de 512 px y su "zoom 13" equivale al 14 de Leaflet/OpenLayers; el visor lo compensa para que todos muestren la misma escala con el mismo zoom.

GeoExt usa Ext JS GPL 6.2.0 y las clases de `@geoext/geoext` 7.0.1 incluidas en `vendor/` (el paquete `extjs-gpl` pesa ~450 MB y jsDelivr no lo sirve); `Ext.Loader` las carga bajo demanda. Usa el tema claro Crisp de Ext JS y no tiene modo oscuro.

## Pruebas

```bash
npm install
npx playwright install chromium   # una vez
npm test                          # unitarias + e2e
```

- `tests/core.test.mjs` — 14 pruebas unitarias de `quito-core.js`: orden `{z}/{y}/{x}`, haversine, formato de distancias y coordenadas, escala, búsqueda sin tildes, filtros, escape de HTML.
- `tests/e2e.test.mjs` — 36 pruebas con Playwright sobre las cinco páginas: carga sin errores de consola, peticiones de teselas con fila/columna correctas, búsqueda, filtros, popup, cambio y persistencia del mapa base, **caída automática a OSM**, medición (≈1,9 km para 100 px a zoom 13 en las tres bibliotecas), tema, barra de estado, diseño móvil y GeoExt.

Las pruebas e2e no usan Internet: las bibliotecas se sirven desde `node_modules` (se interceptan las URL de unpkg/jsDelivr) y las teselas son PNG sintéticos.

## Cómo usar localmente

```bash
git clone https://github.com/faustoaguanor/basic-webmap-comparison.git
cd basic-webmap-comparison
npm run serve        # http://localhost:8000  (o: python -m http.server 8000)
```

> Los visores cargan las bibliotecas y las teselas desde Internet.

## Despliegue en GitHub Pages

1. Settings > Pages > Source: rama `main`, carpeta `/` (root).
2. El sitio queda en `https://faustoaguanor.github.io/basic-webmap-comparison/`.

## Datos geográficos

12 puntos referenciales (WGS 84, EPSG:4326), definidos en `assets/quito-core.js`:

| Punto | Latitud | Longitud | Categoría |
| --- | --- | --- | --- |
| Mitad del Mundo | -0.00222 | -78.45556 | Cultura |
| Centro Histórico | -0.21861 | -78.50833 | Cultura |
| Teleférico de Quito | -0.20194 | -78.54056 | Mirador |
| El Panecillo | -0.22861 | -78.51861 | Mirador |
| La Mariscal | -0.21306 | -78.49417 | Barrio |
| Parque Metropolitano Guangüiltagua | -0.25000 | -78.51670 | Naturaleza |
| Parque La Carolina | -0.18070 | -78.47080 | Naturaleza |
| La Ronda | -0.22000 | -78.50500 | Gastronomía |
| Plaza Foch | -0.21500 | -78.51000 | Gastronomía |
| Parque Itchimbia | -0.19230 | -78.51130 | Mirador |
| Iglesia de la Compañía | -0.21980 | -78.50760 | Cultura |
| Barrio San Marcos | -0.22140 | -78.50970 | Barrio |

## Créditos y atribuciones

| Recurso | Versión | Licencia |
| --- | --- | --- |
| Leaflet / Leaflet MiniMap | 1.9.4 / 3.6.1 | BSD-2-Clause |
| MapLibre GL JS | 4.7.1 | BSD-3-Clause |
| OpenLayers | 10.4.0 | BSD-2-Clause |
| GeoExt / Ext JS GPL | 7.0.1 / 6.2.0 | GPL-3.0 |
| Teselas CARTO basemaps | — | CC BY 4.0 (uso no comercial gratuito) |
| Teselas OpenTopoMap | — | CC-BY-SA |
| Sentinel-2 cloudless 2020 (EOX) | — | CC BY 4.0 |
| Datos OpenStreetMap | — | ODbL |

Atribuciones que muestra cada mapa: `© OpenStreetMap contributors © CARTO`, OpenTopoMap, Sentinel-2 cloudless (EOX) y `© OpenStreetMap contributors`. La interfaz usa iconos SVG propios y la pila tipográfica del sistema (sin Font Awesome ni Google Fonts).

## Licencia

Este proyecto está licenciado bajo la **Licencia MIT**. Ver el archivo [LICENSE](LICENSE) para más detalles.

Los datos cartográficos de OpenStreetMap están disponibles bajo la licencia [ODbL](https://www.openstreetmap.org/copyright). Los tiles de CARTO están disponibles bajo [CC BY 4.0](https://carto.com/basemaps). Las bibliotecas JavaScript mantienen sus propias licencias (ver tabla arriba).

---

**Hecho con dedicación para la comunidad GIS de código abierto.**
