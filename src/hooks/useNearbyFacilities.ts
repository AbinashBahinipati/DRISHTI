import { useState, useEffect, useRef } from 'react';
import { resolveFacilityPhoto } from '../utils/facilityPhotoResolver';

export interface Facility {
  id: number | string;
  type: 'hospital' | 'police' | 'fire' | 'shelter' | 'pharmacy';
  name: string;
  lat: number;
  lon: number;
  distance?: number;
  address?: string;
  phone?: string;
  capacity?: string;
  status?: string;
  image?: string | null;
  photoAttribution?: string;
  photoLoading?: boolean;
  tags?: Record<string, any>;
}

// Haversine formula to calculate exact distance in km
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return Number((R * c).toFixed(2));
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

const SEARCH_QUERIES = [
  { type: 'hospital' as const, q: 'hospital' },
  { type: 'hospital' as const, q: 'clinic' },
  { type: 'police' as const, q: 'police station' },
  { type: 'fire' as const, q: 'fire station' },
  { type: 'pharmacy' as const, q: 'pharmacy' },
  { type: 'shelter' as const, q: 'shelter' }
];

export const useNearbyFacilities = (lat?: number, lon?: number, radiusKm: number = 15) => {
  const currentLat = lat ?? 20.4625;
  const currentLon = lon ?? 85.8830;

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedCoordsRef = useRef<string>('');

  useEffect(() => {
    // Re-fetch only when coordinates change by more than ~100m
    const coordKey = `${currentLat.toFixed(3)}_${currentLon.toFixed(3)}_${radiusKm}`;
    if (fetchedCoordsRef.current === coordKey) return;
    fetchedCoordsRef.current = coordKey;

    setLoading(true);
    setError(null);

    const controller = new AbortController();

    const fetchLivePOIs = async () => {
      const liveItems: Facility[] = [];
      const seenCoords = new Set<string>();

      const radiusMeters = Math.min(30000, Math.max(3000, Math.round(radiusKm * 1000)));

      // 1. Query Live Spatial Overpass API around User's Exact Location
      const overpassQuery = `[out:json][timeout:15];
(
  node["amenity"~"hospital|clinic|police|fire_station|pharmacy"](around:${radiusMeters}, ${currentLat}, ${currentLon});
  way["amenity"~"hospital|clinic|police|fire_station|pharmacy"](around:${radiusMeters}, ${currentLat}, ${currentLon});
  node["emergency"~"ambulance_station|disaster_response"](around:${radiusMeters}, ${currentLat}, ${currentLon});
  node["shelter_type"](around:${radiusMeters}, ${currentLat}, ${currentLon});
);
out center tags 60;`;

      let overpassSuccess = false;

      for (const endpoint of OVERPASS_ENDPOINTS) {
        if (overpassSuccess || controller.signal.aborted) break;
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'User-Agent': 'DRISHTI-DisasterApp/1.0 (contact@drishti.org)',
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            body: 'data=' + encodeURIComponent(overpassQuery),
            signal: controller.signal
          });

          if (res.ok) {
            const data = await res.json();
            if (data.elements && Array.isArray(data.elements) && data.elements.length > 0) {
              for (const el of data.elements) {
                const elLat = el.lat ?? el.center?.lat;
                const elLon = el.lon ?? el.center?.lon;
                if (!elLat || !elLon || isNaN(elLat) || isNaN(elLon)) continue;

                const tags = el.tags || {};
                const name = tags.name || tags['name:en'] || tags.operator || tags.brand;
                if (!name) continue;

                const coordKey = `${elLat.toFixed(4)}_${elLon.toFixed(4)}`;
                if (seenCoords.has(coordKey)) continue;
                seenCoords.add(coordKey);

                let facilityType: Facility['type'] = 'hospital';
                if (tags.amenity === 'police') facilityType = 'police';
                else if (tags.amenity === 'fire_station' || tags.emergency === 'fire_hydrant') facilityType = 'fire';
                else if (tags.amenity === 'pharmacy') facilityType = 'pharmacy';
                else if (tags.amenity === 'hospital' || tags.amenity === 'clinic' || tags.healthcare) facilityType = 'hospital';
                else if (tags.shelter_type || tags.amenity === 'shelter' || tags.building === 'shelter') facilityType = 'shelter';

                const dist = calculateDistance(currentLat, currentLon, elLat, elLon);

                const addressParts = [
                  tags['addr:street'],
                  tags['addr:suburb'] || tags['addr:neighbourhood'],
                  tags['addr:city'] || tags['addr:district']
                ].filter(Boolean);

                // Direct image from OSM tags if present
                let directImg: string | null = null;
                if (typeof tags.image === 'string' && tags.image.startsWith('http')) {
                  directImg = tags.image;
                }

                liveItems.push({
                  id: `osm-${el.type}-${el.id}`,
                  type: facilityType,
                  name: name,
                  lat: elLat,
                  lon: elLon,
                  distance: dist,
                  address: addressParts.length > 0 ? addressParts.join(', ') : `${dist.toFixed(1)} km from your location`,
                  phone: tags.phone || tags['contact:phone'] || (facilityType === 'police' ? '112 / 100' : facilityType === 'fire' ? '101' : facilityType === 'hospital' ? '108' : undefined),
                  capacity: tags.beds ? `${tags.beds} Beds • Emergency Ward` : tags['emergency:capacity'] || 'Operational Emergency Hub',
                  status: 'Verified Live OSM Facility',
                  image: directImg,
                  photoLoading: !directImg,
                  tags: tags
                });
              }

              if (liveItems.length > 0) {
                overpassSuccess = true;
              }
            }
          }
        } catch {
          // Try next mirror
        }
      }

      // 2. Fallback to Photon / OSM Geocoder if Overpass was unavailable
      if (liveItems.length === 0 && !controller.signal.aborted) {
        const fetchPromises = SEARCH_QUERIES.map(async ({ type, q }) => {
          try {
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${currentLat}&lon=${currentLon}&limit=10`;
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) return;
            const data = await res.json();
            if (!data.features || !Array.isArray(data.features)) return;

            for (const feature of data.features) {
              const [fLon, fLat] = feature.geometry.coordinates;
              const p = feature.properties;
              if (!fLat || !fLon || isNaN(fLat) || isNaN(fLon)) continue;

              const dist = calculateDistance(currentLat, currentLon, fLat, fLon);
              if (dist > radiusKm + 5) continue;

              const name = p.name || p.street;
              if (!name) continue;

              const key = `${fLat.toFixed(3)}_${fLon.toFixed(3)}`;
              if (seenCoords.has(key)) continue;
              seenCoords.add(key);

              let detectedType = type;
              if (p.osm_value === 'police' || /police|thana/i.test(p.name || '')) detectedType = 'police';
              else if (p.osm_value === 'fire_station' || /fire/i.test(p.name || '')) detectedType = 'fire';
              else if (p.osm_value === 'pharmacy' || /pharmacy|chemist/i.test(p.name || '')) detectedType = 'pharmacy';
              else if (p.osm_value === 'hospital' || /hospital|clinic/i.test(p.name || '')) detectedType = 'hospital';

              const addrParts = [p.street, p.city || p.district, p.state].filter(Boolean);

              liveItems.push({
                id: `live-${p.osm_id || Math.random().toString(36).substring(2, 9)}`,
                type: detectedType,
                name: name,
                lat: fLat,
                lon: fLon,
                distance: dist,
                address: addrParts.length > 0 ? addrParts.join(', ') : `${dist.toFixed(1)} km from your location`,
                status: 'Verified Live OSM POI',
                phone: detectedType === 'police' ? '112 / 100' : detectedType === 'fire' ? '101' : detectedType === 'hospital' ? '108' : undefined,
                image: null,
                photoLoading: true
              });
            }
          } catch {}
        });

        await Promise.all(fetchPromises);
      }

      // Sort strictly by actual distance from the user's coordinates
      liveItems.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      if (liveItems.length > 0) {
        setFacilities(liveItems);

        // Asynchronously resolve authentic photos from Wikimedia Commons for the top facilities
        const topToResolve = liveItems.slice(0, 10);
        Promise.all(
          topToResolve.map(async (fac) => {
            if (fac.image) return fac;
            const photoInfo = await resolveFacilityPhoto(fac, currentLat, currentLon);
            return {
              ...fac,
              image: photoInfo.photoUrl,
              photoAttribution: photoInfo.photoAttribution,
              photoLoading: false
            };
          })
        ).then((resolvedTop) => {
          if (!controller.signal.aborted) {
            setFacilities((prev) => {
              const mapById = new Map(resolvedTop.map((r) => [r.id, r]));
              return prev.map((item) => mapById.get(item.id) || { ...item, photoLoading: false });
            });
          }
        }).catch(() => {
          if (!controller.signal.aborted) {
            setFacilities((prev) => prev.map((item) => ({ ...item, photoLoading: false })));
          }
        });

        try {
          const { dbPutBatch } = await import('../utils/indexedDB');
          await dbPutBatch('facilities', liveItems);
        } catch {}
      } else {
        // If live fetches returned 0 results, load from IndexedDB cache
        try {
          const { dbGetAll } = await import('../utils/indexedDB');
          const cached = await dbGetAll<Facility>('facilities');
          if (cached && cached.length > 0) {
            const withDist = cached
              .map((f) => ({
                ...f,
                distance: calculateDistance(currentLat, currentLon, f.lat, f.lon),
                photoLoading: false
              }))
              .filter((f) => (f.distance || 0) <= radiusKm + 10)
              .sort((a, b) => (a.distance || 0) - (b.distance || 0));

            if (withDist.length > 0) {
              setFacilities(withDist);
            }
          }
        } catch {}
      }

      setLoading(false);
    };

    fetchLivePOIs();

    return () => {
      controller.abort();
    };
  }, [currentLat, currentLon, radiusKm]);

  return { facilities, loading, error };
};
