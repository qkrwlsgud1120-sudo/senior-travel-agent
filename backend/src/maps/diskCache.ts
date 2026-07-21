import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger';

// Persists the same Geocode/Directions/Places lookups the in-memory caches
// already dedupe within one process — but survives across process restarts
// (tsx watch restarts often during dev; each restart used to re-pay for every
// lookup from scratch). Purely a local dev/test convenience: best-effort, and
// safe to delete at any time (a missing or corrupt file just falls back to
// empty caches, same as before this existed).
const CACHE_PATH = path.resolve(__dirname, '../../.cache/maps-cache.json');

export interface MapsCacheShape {
  geocode: Record<string, unknown>;
  route: Record<string, unknown>;
  places: Record<string, unknown>;
}

function empty(): MapsCacheShape {
  return { geocode: {}, route: {}, places: {} };
}

export function loadMapsCache(): MapsCacheShape {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

export function saveMapsCache(data: MapsCacheShape): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data));
  } catch (err) {
    logger.warn('maps disk cache write failed (non-fatal, re-fetches next time)', err);
  }
}

// Same shape as the in-memory Maps this replaces (has/get/set), plus a
// toRecord() for serializing back to disk. Keeps GoogleMapsProvider's call
// sites unchanged.
export class PersistedCache<V> {
  private map: Map<string, V>;

  constructor(initial: Record<string, V>, private onChange: () => void) {
    this.map = new Map(Object.entries(initial));
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  get(key: string): V | undefined {
    return this.map.get(key);
  }

  set(key: string, value: V): void {
    this.map.set(key, value);
    this.onChange();
  }

  toRecord(): Record<string, V> {
    return Object.fromEntries(this.map);
  }
}
