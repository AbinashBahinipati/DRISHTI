/**
 * DRISHTI Authentic Open-Source Facility Photo Resolver
 *
 * 100% FREE & ZERO-API-KEY PHOTO SOURCE HIERARCHY:
 * Priority 1: `image=*` (Direct URL in OSM tag)
 * Priority 2: `wikimedia_commons=*` (Exact Wikimedia Commons File/Category tag or Wikidata P18 claim)
 * Priority 3: `mapillary=*` (Exact Mapillary image key)
 * Priority 4: `panoramax=*` (Exact Panoramax picture ID)
 * Priority 5: Fallback -> null ("PHOTO UNAVAILABLE")
 *
 * STRICT DATA INTEGRITY:
 * - NEVER uses generic or stock photos.
 * - NEVER uses Google Places API.
 * - NEVER reuses another facility's photo.
 * - If no exact verified photo tag exists in OSM data, returns null ("PHOTO UNAVAILABLE").
 */

import type { Facility } from '../hooks/useNearbyFacilities';

const PHOTO_CACHE_PREFIX = 'drishti_osm_photo_v4_';

export interface ResolvedPhotoInfo {
  photoUrl: string | null;
  sourceType: 'osm_image' | 'wikimedia_commons' | 'wikidata' | 'mapillary' | 'panoramax' | 'none';
  photoAttribution?: string;
  reason?: string;
}

// In-memory cache to prevent repeated network lookups during session
const memoryPhotoCache = new Map<string, ResolvedPhotoInfo>();

/**
 * Generate a deterministic cache key for a facility
 */
function getFacilityCacheKey(facility: Partial<Facility>): string {
  const nameSlug = (facility.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const latStr = typeof facility.lat === 'number' ? facility.lat.toFixed(4) : '0';
  const lonStr = typeof facility.lon === 'number' ? facility.lon.toFixed(4) : '0';
  return `${PHOTO_CACHE_PREFIX}${facility.id || nameSlug}_${latStr}_${lonStr}`;
}

/**
 * 1. Priority 1: Direct `image=*` tag
 */
async function resolveFromDirectOsmImage(tags?: Record<string, any>): Promise<ResolvedPhotoInfo | null> {
  if (!tags) return null;
  const rawImage = tags.image || tags['contact:image'];
  if (typeof rawImage !== 'string' || !rawImage.trim()) return null;

  const trimmed = rawImage.trim();

  // If it's a direct HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      photoUrl: trimmed,
      sourceType: 'osm_image',
      photoAttribution: 'OpenStreetMap Community (image tag)'
    };
  }

  // If it's a Wikimedia Commons File reference inside the image tag (e.g. "File:Hospital.jpg")
  if (/^(File|Image):/i.test(trimmed) || /\.(jpe?g|png|webp)$/i.test(trimmed)) {
    const fileName = trimmed.replace(/^(File|Image):/i, '').trim();
    try {
      const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
      const res = await fetch(wikiUrl);
      if (res.ok) {
        const data = await res.json();
        const pages = data.query?.pages;
        if (pages) {
          const page = Object.values(pages)[0] as any;
          const imgUrl = page?.imageinfo?.[0]?.url;
          if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
            return {
              photoUrl: imgUrl,
              sourceType: 'osm_image',
              photoAttribution: 'Wikimedia Commons (via OSM image tag)'
            };
          }
        }
      }
    } catch {}
  }

  return null;
}

/**
 * 2. Priority 2: `wikimedia_commons=*` or `wikidata=*` tag
 */
async function resolveFromWikimediaTag(tags?: Record<string, any>): Promise<ResolvedPhotoInfo | null> {
  if (!tags) return null;

  // 2A. Direct wikimedia_commons tag
  const commonsTag = tags.wikimedia_commons || tags['wikimedia:commons'];
  if (typeof commonsTag === 'string' && commonsTag.trim()) {
    const rawTag = commonsTag.trim();
    try {
      if (/^(File|Image):/i.test(rawTag) || /\.(jpe?g|png|webp)$/i.test(rawTag)) {
        const fileName = rawTag.replace(/^(File|Image):/i, '').trim();
        const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
        const res = await fetch(wikiUrl);
        if (res.ok) {
          const data = await res.json();
          const pages = data.query?.pages;
          if (pages) {
            const page = Object.values(pages)[0] as any;
            const imgUrl = page?.imageinfo?.[0]?.url;
            if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
              return {
                photoUrl: imgUrl,
                sourceType: 'wikimedia_commons',
                photoAttribution: 'Wikimedia Commons'
              };
            }
          }
        }
      }

      if (/^Category:/i.test(rawTag)) {
        const catUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(rawTag)}&gcmnamespace=6&gcmlimit=3&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
        const res = await fetch(catUrl);
        if (res.ok) {
          const data = await res.json();
          const pages = data.query?.pages;
          if (pages) {
            for (const p of Object.values(pages) as any[]) {
              const url = p?.imageinfo?.[0]?.url;
              const mime = p?.imageinfo?.[0]?.mime;
              if (typeof url === 'string' && url.startsWith('http') && mime && !mime.includes('svg')) {
                return {
                  photoUrl: url,
                  sourceType: 'wikimedia_commons',
                  photoAttribution: 'Wikimedia Commons'
                };
              }
            }
          }
        }
      }
    } catch {}
  }

  // 2B. Wikidata tag (official P18 image claim)
  if (typeof tags.wikidata === 'string' && tags.wikidata.trim() && /^Q\d+$/.test(tags.wikidata.trim())) {
    const qid = tags.wikidata.trim();
    try {
      const claimUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json&origin=*`;
      const res = await fetch(claimUrl);
      if (res.ok) {
        const data = await res.json();
        const fileName = data.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (typeof fileName === 'string' && fileName.trim()) {
          const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
          const photoRes = await fetch(wikiUrl);
          if (photoRes.ok) {
            const photoData = await photoRes.json();
            const pages = photoData.query?.pages;
            if (pages) {
              const page = Object.values(pages)[0] as any;
              const imgUrl = page?.imageinfo?.[0]?.url;
              if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                return {
                  photoUrl: imgUrl,
                  sourceType: 'wikidata',
                  photoAttribution: 'Wikidata (P18) / Wikimedia Commons'
                };
              }
            }
          }
        }
      }
    } catch {}
  }

  return null;
}

/**
 * 3. Priority 3: `mapillary=*` tag
 */
function resolveFromMapillaryTag(tags?: Record<string, any>): ResolvedPhotoInfo | null {
  if (!tags) return null;
  const mapillaryTag = tags.mapillary || tags['mapillary:image'];
  if (typeof mapillaryTag === 'string' && mapillaryTag.trim()) {
    const key = mapillaryTag.trim().replace(/^https?:\/\/.*mapillary\.com\/app\/\?pKey=/i, '').replace(/[^0-9a-zA-Z_-]/g, '');
    if (key) {
      return {
        photoUrl: `https://images.mapillary.com/${key}/thumb-1024.jpg`,
        sourceType: 'mapillary',
        photoAttribution: 'Mapillary Street-level Imagery'
      };
    }
  }
  return null;
}

/**
 * 4. Priority 4: `panoramax=*` tag
 */
function resolveFromPanoramaxTag(tags?: Record<string, any>): ResolvedPhotoInfo | null {
  if (!tags) return null;
  const panoramaxTag = tags.panoramax || tags['panoramax:picture'];
  if (typeof panoramaxTag === 'string' && panoramaxTag.trim()) {
    const raw = panoramaxTag.trim();
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return {
        photoUrl: raw,
        sourceType: 'panoramax',
        photoAttribution: 'Panoramax Open Street Imagery'
      };
    }
    const pictureId = raw.replace(/[^0-9a-fA-F-]/g, '');
    if (pictureId) {
      return {
        photoUrl: `https://panoramax.ign.fr/api/pictures/${pictureId}/sd.jpg`,
        sourceType: 'panoramax',
        photoAttribution: 'Panoramax Open Street Imagery'
      };
    }
  }
  return null;
}

/**
 * Main Facility Photo Resolver
 */
export async function resolveFacilityPhoto(
  facility: Facility,
  _userLat?: number,
  _userLon?: number
): Promise<ResolvedPhotoInfo> {
  // If the facility record already has a verified photo assigned, retain it
  if (facility.image) {
    return {
      photoUrl: facility.image,
      sourceType: 'osm_image',
      photoAttribution: facility.photoAttribution
    };
  }

  const cacheKey = getFacilityCacheKey(facility);

  // Check in-memory session cache
  if (memoryPhotoCache.has(cacheKey)) {
    return memoryPhotoCache.get(cacheKey)!;
  }

  // Check sessionStorage
  try {
    const cachedStr = sessionStorage.getItem(cacheKey);
    if (cachedStr) {
      const parsed: ResolvedPhotoInfo = JSON.parse(cachedStr);
      memoryPhotoCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {}

  const tags = facility.tags || (facility as any).tags || {};

  let resolved: ResolvedPhotoInfo = {
    photoUrl: null,
    sourceType: 'none',
    reason: 'No verified OSM photo tag (image, wikimedia_commons, mapillary, panoramax) exists for this facility'
  };

  // Priority 1: image=*
  const osmDirect = await resolveFromDirectOsmImage(tags);
  if (osmDirect) {
    resolved = osmDirect;
  } else {
    // Priority 2: wikimedia_commons=* / wikidata=*
    const wikimedia = await resolveFromWikimediaTag(tags);
    if (wikimedia) {
      resolved = wikimedia;
    } else {
      // Priority 3: mapillary=*
      const mapillary = resolveFromMapillaryTag(tags);
      if (mapillary) {
        resolved = mapillary;
      } else {
        // Priority 4: panoramax=*
        const panoramax = resolveFromPanoramaxTag(tags);
        if (panoramax) {
          resolved = panoramax;
        }
      }
    }
  }

  // Safe debugging output (No API keys or sensitive data)
  console.log(
    `[DRISHTI Facility Photo]\n` +
    `  Facility name: "${facility.name}"\n` +
    `  OSM image tag: ${tags.image || 'none'}\n` +
    `  Wikimedia Commons: ${tags.wikimedia_commons || tags['wikimedia:commons'] || 'none'}\n` +
    `  Wikidata: ${tags.wikidata || 'none'}\n` +
    `  Mapillary: ${tags.mapillary || tags['mapillary:image'] || 'none'}\n` +
    `  Panoramax: ${tags.panoramax || tags['panoramax:picture'] || 'none'}\n` +
    `  Selected photo source: ${resolved.sourceType}\n` +
    `  Selected photo URL: ${resolved.photoUrl || 'none'}\n` +
    `  Photo status: ${resolved.photoUrl ? 'Verified Photo' : 'PHOTO UNAVAILABLE (' + resolved.reason + ')'}`
  );

  // Cache resolution in memory & sessionStorage (including nulls to avoid redundant lookups)
  memoryPhotoCache.set(cacheKey, resolved);
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(resolved));
  } catch {}

  return resolved;
}
