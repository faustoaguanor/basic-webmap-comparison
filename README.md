# Quito GIS - Comparativa de Bibliotecas GIS Web

Mapas interactivos de puntos turísticos de Quito, Ecuador, implementados con tres bibliotecas JavaScript de código abierto: **Leaflet**, **MapLibre GL** y **OpenLayers**.

## Descripción

Este repositorio presenta una comparativa práctica de tres de las bibliotecas GIS web más populares del ecosistema JavaScript. Cada implementación muestra un mapa interactivo con los mismos 12 puntos turísticos de Quito, organizados en 5 categorías, con funcionalidades idénticas: búsqueda, filtros, medición de distancias, geolocalización y cambio de tema claro/oscuro.

El objetivo es demostrar las diferencias de arquitectura, renderizado y capacidades de cada biblioteca dentro de un contexto real y funcional.

## Demo en vivo

El sitio está desplegado en GitHub Pages:

> **[https://faustoagunor.github.io/basic-webmap-comparison](https://faustoaguanor.github.io/basic-webmap-comparison/)**

## Estructura del repositorio

```
quito-gis/
├── index.html                # Página principal con explicación y navegación
├── leaflet-quito.html        # Mapa interactivo con Leaflet
├── maplibre-quito.html       # Mapa interactivo con MapLibre GL
├── openlayers-quito.html     # Mapa interactivo con OpenLayers
├── README.md                 # Este documento
└── LICENSE                   # Licencia MIT
```

## Ejemplos incluidos

### 1. Leaflet

| Aspecto     | Detalle            |
| ----------- | ------------------ |
| Biblioteca  | Leaflet 1.9.4      |
| Renderizado | DOM + Raster tiles |
| Peso        | ~44 KB (gzipped)   |
| Licencia    | BSD-2-Clause       |

**Funciones implementadas:**

- Mapa 2D con tiles raster de CARTO y OpenStreetMap
- Control de capas base (`L.control.layers`)
- Mini-mapa de posición (`L.Control.MiniMap` - plugin)
- Barra de escala métrica (`L.control.scale`)
- Marcadores personalizados con `L.divIcon()` (HTML/CSS con colores por categoría)
- Popups informativos por marcador (`marker.bindPopup()`)
- Filtros por categoría (miradores, cultura, barrios, naturaleza, gastronomía)
- Búsqueda en tiempo real por nombre y descripción
- Medición de distancias con `L.polyline()` y `latlng.distanceTo()`
- Geolocalización con `navigator.geolocation`
- Cambio de tema claro/oscuro (intercambio de capa base CARTO Dark/Light)
- Panel lateral con glassmorphism (`backdrop-filter`)
- Diseño responsive con panel colapsable en móvil

### 2. MapLibre GL

| Aspecto     | Detalle              |
| ----------- | -------------------- |
| Biblioteca  | MapLibre GL JS 4.7.1 |
| Renderizado | WebGL + Vector tiles |
| Peso        | ~300 KB (gzipped)    |
| Licencia    | BSD-3-Clause         |

**Funciones implementadas:**

- Mapa vectorial con WebGL y estilos CARTO GL (Dark Matter / Positron)
- Vista 3D con pitch y bearing (`map.easeTo({ pitch: 60 })`)
- Estilos vectoriales en formato GL JSON (`map.setStyle()`)
- Control de navegación con brújula y pitch visual (`NavigationControl`)
- Marcadores HTML con SVG personalizado (`maplibregl.Marker`)
- Popups estilizados (`maplibregl.Popup`)
- Animaciones de vuelo suaves (`map.flyTo()`)
- Filtros por categoría con reconstrucción de marcadores
- Búsqueda en tiempo real
- Medición de distancias con `lngLat.distanceTo()`
- Geolocalización con marcador de posición
- Cambio de tema (cambio de estilo vectorial preservando vista)
- Capa raster OSM como estilo alternativo
- Diseño responsive

### 3. OpenLayers

| Aspecto     | Detalle             |
| ----------- | ------------------- |
| Biblioteca  | OpenLayers 10.4.0   |
| Renderizado | DOM + Raster/Vector |
| Peso        | ~230 KB (gzipped)   |
| Licencia    | BSD-2-Clause        |

**Funciones implementadas:**

- Mapa con proyección EPSG:3857 (Web Mercator)
- Conversión de coordenadas WGS84 ↔ Web Mercator (`ol.proj.fromLonLat()` / `ol.proj.toLonLat()`)
- Capas raster TILE (OSM, CARTO Dark/Light) con `ol.layer.Tile` y `ol.source.XYZ`
- Capa vectorial para features (`ol.layer.Vector` + `ol.source.Vector`)
- Entidades geográficas con propiedades (`ol.Feature`)
- Geometrías Point y LineString (`ol.geom.Point`, `ol.geom.LineString`)
- Estilizado con SVG inline (`ol.style.Icon` con data URI)
- Popup como Overlay posicionado (`ol.Overlay`)
- Escala métrica (`ol.control.ScaleLine`)
- Fórmula Haversine para cálculo manual de distancias geodésicas
- Animaciones de vista (`view.animate()`)
- Detección de features en pixel (`map.forEachFeatureAtPixel()`)
- Cambio de capa base con `layer.setVisible()`
- Diseño responsive

## Comparativa rápida

| Característica         | Leaflet        | MapLibre GL    | OpenLayers          |
| ---------------------- | -------------- | -------------- | ------------------- |
| Renderizado            | DOM / Raster   | WebGL / Vector | DOM / Raster+Vector |
| Mapa 3D                | No             | Sí             | Parcial             |
| Proyecciones múltiples | Via plugin     | Solo Mercator  | Sí (nativo)         |
| Estilos vectoriales GL | No             | Sí             | Parcial             |
| Protocolos OGC         | Via plugin     | No             | Sí                  |
| Curva de aprendizaje   | Baja           | Media          | Alta                |
| Ecosistema de plugins  | Muy amplio     | Medio          | Amplio              |
| Medición de distancias | `distanceTo()` | `distanceTo()` | Haversine manual    |
| MiniMap                | Plugin         | No             | No                  |

## Tecnologías utilizadas

### Bibliotecas JavaScript GIS

- [**Leaflet**](https://leafletjs.com/) 1.9.4 — Biblioteca ligera para mapas interactivos
- [**Leaflet MiniMap**](https://github.com/Norkart/Leaflet-MiniMap) 3.6.1 — Plugin de mini-mapa
- [**MapLibre GL JS**](https://maplibre.org/) 4.7.1 — Motor de mapas vectoriales con WebGL
- [**OpenLayers**](https://openlayers.org/) 10.4.0 — Framework GIS completo

### Tiles cartográficos

- [**CARTO Basemaps**](https://carto.com/basemaps) — Tiles raster y estilos vectoriales gratuitos
- [**OpenStreetMap**](https://www.openstreetmap.org) — Datos cartográficos abiertos

### Frontend

- **HTML5 + CSS3** — Estructura y estilos
- **CSS Custom Properties** — Sistema de temas dark/light
- **CSS Grid** — Layout principal
- **backdrop-filter** — Efecto glassmorphism
- **Vanilla JavaScript** — Sin frameworks (ES5+ compatible)
- [**Font Awesome**](https://fontawesome.com/) 6.5.1 — Iconografía
- [**Google Fonts**](https://fonts.google.com/) — Inter, Playfair Display, JetBrains Mono

### APIs del navegador

- **Geolocation API** — Ubicación del usuario
- **Fullscreen API** — Pantalla completa
- **IntersectionObserver** — Animaciones de scroll (index.html)

## Cómo usar localmente

1. Clona el repositorio:

```bash
git clone https://github.com/faustoaguanor/basic-webmap-comparison.git
cd basic-webmap-comparison
```

1. Abre `index.html` en un navegador:

```bash
# Con Python
python -m http.server 8000

# Con Node.js
npx serve .

# O simplemente abre index.html directamente en el navegador
```

1. Navega entre los tres ejemplos desde la página principal.

> **Nota:** Los mapas cargan tiles desde CDN, por lo que se requiere conexión a internet.

## Despliegue en GitHub Pages

1. Sube el repositorio a GitHub
2. Ve a **Settings > Pages**
3. En **Source**, selecciona la rama `main` y la carpeta `/` (root)
4. Guarda y espera unos minutos
5. Tu sitio estará disponible en `https://faustoaguanor.github.io/basic-webmap-comparison/`

## Datos geográficos

Las coordenadas de los 12 puntos turísticos son aproximadas y referenciales:

| Punto                              | Latitud  | Longitud  | Categoría   |
| ---------------------------------- | -------- | --------- | ----------- |
| Mitad del Mundo                    | -0.00222 | -78.45556 | Cultura     |
| Centro Histórico                   | -0.21861 | -78.50833 | Cultura     |
| Teleférico de Quito                | -0.20194 | -78.54056 | Mirador     |
| El Panecillo                       | -0.22861 | -78.51861 | Mirador     |
| La Mariscal                        | -0.21306 | -78.49417 | Barrio      |
| Parque Metropolitano Guangüiltagua | -0.25000 | -78.51670 | Naturaleza  |
| Parque La Carolina                 | -0.18070 | -78.47080 | Naturaleza  |
| La Ronda                           | -0.22000 | -78.50500 | Gastronomía |
| Plaza Foch                         | -0.21500 | -78.51000 | Gastronomía |
| Parque Itchimbia                   | -0.19230 | -78.51130 | Mirador     |
| Iglesia de la Compañía             | -0.21980 | -78.50760 | Cultura     |
| Barrio San Marcos                  | -0.22140 | -78.50970 | Barrio      |

**Sistema de referencia:** WGS84 (EPSG:4326)

## Créditos y atribuciones

### Bibliotecas JavaScript

| Biblioteca      | Versión | Autor                         | Licencia     |
| --------------- | ------- | ----------------------------- | ------------ |
| Leaflet         | 1.9.4   | Vladimir Agafonkin, Cloudmade | BSD-2-Clause |
| Leaflet MiniMap | 3.6.1   | Norkart AS                    | MIT          |
| MapLibre GL JS  | 4.7.1   | MapLibre contributors         | BSD-3-Clause |
| OpenLayers      | 10.4.0  | OpenLayers contributors       | BSD-2-Clause |

### Datos y tiles cartográficos

| Recurso                            | Proveedor                  | Licencia  |
| ---------------------------------- | -------------------------- | --------- |
| Tiles raster y estilos vectoriales | CARTO (CartoDB)            | CC BY 4.0 |
| Datos cartográficos                | OpenStreetMap contributors | ODbL      |
| CDN de paquetes                    | jsDelivr, unpkg            | MIT       |

### Iconografía y tipografía

| Recurso            | Autor                | Licencia                                |
| ------------------ | -------------------- | --------------------------------------- |
| Font Awesome 6.5.1 | Fonticons, Inc.      | Font Awesome Free (CC BY 4.0 + SIL OFL) |
| Inter              | Rasmus Andersson     | SIL Open Font License 1.1               |
| Playfair Display   | Claus Eggers Sørenen | SIL Open Font License 1.1               |
| JetBrains Mono     | JetBrains            | SIL Open Font License 1.1               |

Los mapas utilizan tiles de CARTO y OpenStreetMap, que requieren la siguiente atribución:

- **CARTO tiles:** `© OpenStreetMap contributors © CARTO`
- **OSM tiles:** `© OpenStreetMap contributors`
- **CARTO GL Styles:** `© CARTO`

Esta atribución se muestra automáticamente en los controles de atribución de cada biblioteca.

## Licencia

Este proyecto está licenciado bajo la **Licencia MIT**. Ver el archivo [LICENSE](LICENSE) para más detalles.

Los datos cartográficos de OpenStreetMap están disponibles bajo la licencia [ODbL](https://www.openstreetmap.org/copyright). Los tiles de CARTO están disponibles bajo [CC BY 4.0](https://carto.com/basemaps). Las bibliotecas JavaScript mantienen sus propias licencias (ver tabla arriba).

---

**Hecho con dedicación para la comunidad GIS de código abierto.**
