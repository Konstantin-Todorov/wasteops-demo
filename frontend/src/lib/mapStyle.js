import { addProtocol } from 'maplibre-gl';
import { Protocol } from 'pmtiles';

/**
 * Източникът на картата се сменя на едно място.
 *
 * Разработка и облачно внедряване → hosted векторни плочки (Carto).
 * Локален сървър без интернет → PMTiles файл, раздаван от собствения backend.
 *
 * За production на локалната машина:
 *   1. Генерирайте извадка за България:
 *        pmtiles extract <planet.pmtiles> bulgaria.pmtiles --bbox=22.3,41.2,28.7,44.3 --maxzoom=14
 *   2. Сложете я в backend/public/tiles/bulgaria.pmtiles
 *   3. VITE_MAP_SOURCE=pmtiles  (и по желание VITE_PMTILES_URL)
 *
 * MapLibre чете само нужните байтове през HTTP range заявки — не вдига
 * tile сървър и работи изцяло в локалната мрежа.
 */

const SOURCE = import.meta.env.VITE_MAP_SOURCE || 'hosted';
const PMTILES_URL = import.meta.env.VITE_PMTILES_URL || '/tiles/bulgaria.pmtiles';

let protocolRegistered = false;
export function registerPmtiles() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  addProtocol('pmtiles', protocol.tile);
  protocolRegistered = true;
}

const HOSTED = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark:  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

// Палитри за самостоятелния PMTiles стил — съзнателно приглушени,
// за да изпъкват камионите и маршрутите, а не фонът.
const PALETTE = {
  light: {
    bg: '#eef0f2', water: '#d6e2ec', land: '#f6f7f8', green: '#e5eee2',
    road: '#ffffff', roadCasing: '#e2e6ea', major: '#fdfdfd',
    building: '#e7e9ec', label: '#5a636e', labelHalo: '#ffffff', boundary: '#c8cdd4',
  },
  dark: {
    bg: '#0d1117', water: '#111c27', land: '#12171f', green: '#121d16',
    road: '#232a34', roadCasing: '#1a2029', major: '#2c3540',
    building: '#171d26', label: '#8b949e', labelHalo: '#0d1117', boundary: '#2b323c',
  },
};

function pmtilesStyle(theme) {
  const c = PALETTE[theme];
  return {
    version: 8,
    glyphs: 'https://basemaps.cartocdn.com/gl/positron-gl-style/{fontstack}/{range}.pbf',
    sources: {
      proto: { type: 'vector', url: `pmtiles://${PMTILES_URL}`, attribution: '© OpenStreetMap' },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': c.bg } },
      { id: 'earth', type: 'fill', source: 'proto', 'source-layer': 'earth', paint: { 'fill-color': c.land } },
      { id: 'landuse', type: 'fill', source: 'proto', 'source-layer': 'landuse',
        filter: ['in', 'pmap:kind', 'park', 'forest', 'grass', 'wood'], paint: { 'fill-color': c.green } },
      { id: 'water', type: 'fill', source: 'proto', 'source-layer': 'water', paint: { 'fill-color': c.water } },
      { id: 'buildings', type: 'fill', source: 'proto', 'source-layer': 'buildings',
        minzoom: 13, paint: { 'fill-color': c.building, 'fill-opacity': 0.75 } },
      { id: 'roads-casing', type: 'line', source: 'proto', 'source-layer': 'roads',
        paint: { 'line-color': c.roadCasing,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 7, 1.2, 14, 5, 18, 22] } },
      { id: 'roads', type: 'line', source: 'proto', 'source-layer': 'roads',
        paint: { 'line-color': c.road,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 7, 0.5, 14, 3, 18, 18] } },
      { id: 'roads-major', type: 'line', source: 'proto', 'source-layer': 'roads',
        filter: ['in', 'pmap:kind', 'highway', 'major_road'],
        paint: { 'line-color': c.major,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 6, 1, 14, 5, 18, 24] } },
      { id: 'boundaries', type: 'line', source: 'proto', 'source-layer': 'boundaries',
        paint: { 'line-color': c.boundary, 'line-width': 1, 'line-dasharray': [3, 2] } },
      { id: 'places', type: 'symbol', source: 'proto', 'source-layer': 'places',
        layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 12, 15] },
        paint: { 'text-color': c.label, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.4 } },
    ],
  };
}

export function getMapStyle(theme = 'light') {
  if (SOURCE === 'pmtiles') {
    registerPmtiles();
    return pmtilesStyle(theme);
  }
  return HOSTED[theme] || HOSTED.light;
}

export const MAP_SOURCE = SOURCE;
