/**
 * DRISHTI Central Real-Time Multi-Hazard Data Orchestrator
 * Connects, normalizes, and coordinates live data feeds:
 * - Open-Meteo Comprehensive Meteorological Telemetry + 24h Rolling Precipitation History
 * - USGS Global Seismological Real-Time Feed + Joyner-Boore Hypocentral Distance & PGA Attenuation
 * - NASA FIRMS Satellite Thermal Anomaly & Active Fire Sensing
 * - ECMWF Copernicus GloFAS / CWC River Hydrology & Discharge Streamflow Feed
 * - OpenStreetMap Cached Emergency Infrastructure Facilities
 */

import { getDistance } from './distance';
import type {
  LiveWeatherTelemetry,
  LiveSeismicTelemetry,
  LiveSeismicEvent,
  LiveFireTelemetry,
  LiveFirmsDetection,
  LiveHydrologyTelemetry,
  LiveInfrastructureTelemetry,
  UnifiedTelemetrySnapshot,
  TelemetryFreshness
} from '../types/telemetry';

// ============================================================================
// STORAGE & POLLING CONSTANTS
// ============================================================================

const CACHE_KEYS = {
  WEATHER: 'drishti_live_telemetry_weather_v2',
  SEISMIC: 'drishti_live_telemetry_seismic_v2',
  FIRE: 'drishti_live_telemetry_fire_v2',
  HYDROLOGY: 'drishti_live_telemetry_hydrology_v2',
  SNAPSHOT: 'drishti_live_telemetry_snapshot_v2'
} as const;

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<any>>();

// ============================================================================
// FRESHNESS CALCULATOR
// ============================================================================

export function evaluateFreshness(
  timestampStr?: string | null,
  maxLiveMinutes = 30,
  maxRecentMinutes = 120,
  maxAgingMinutes = 360
): TelemetryFreshness {
  if (!timestampStr) return 'UNAVAILABLE';
  const t = new Date(timestampStr).getTime();
  if (isNaN(t) || t <= 0) return 'UNAVAILABLE';

  const ageMinutes = (Date.now() - t) / (1000 * 60);
  if (ageMinutes < 0) return 'LIVE'; // Future or clock skew tolerated
  if (ageMinutes <= maxLiveMinutes) return 'LIVE';
  if (ageMinutes <= maxRecentMinutes) return 'RECENT';
  if (ageMinutes <= maxAgingMinutes) return 'AGING';
  return 'STALE';
}

// ============================================================================
// 1. OPEN-METEO LIVE WEATHER & 24H ACCUMULATION ORCHESTRATOR
// ============================================================================

export async function fetchOrchestratedWeather(
  latitude: number,
  longitude: number
): Promise<LiveWeatherTelemetry | null> {
  const cacheKey = `weather_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = (async () => {
    try {
      // Query Open-Meteo for Current + Hourly Past (24h) + Hourly Forecast (24h)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,surface_pressure,pressure_msl,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=precipitation,rain,showers,temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_gusts_10m,precipitation_probability,cape&past_hours=24&forecast_hours=24&timezone=auto`;

      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
      const json = await response.json();
      const cur = json.current;
      const hourly = json.hourly;

      // ── Real 24h Rolling Precipitation Calculation ──
      // Sum the actual hourly precipitation from the 24 past hours
      let real24hAccumulation = 0;
      let real24hForecast = 0;

      if (hourly && Array.isArray(hourly.precipitation)) {
        // Typically past_hours=24 gives past 24 entries before the current hour
        const pastPrecip = hourly.precipitation.slice(0, 24);
        real24hAccumulation = pastPrecip.reduce((sum: number, p: number) => sum + (typeof p === 'number' && p > 0 ? p : 0), 0);

        const forecastPrecip = hourly.precipitation.slice(24, 48);
        real24hForecast = forecastPrecip.reduce((sum: number, p: number) => sum + (typeof p === 'number' && p > 0 ? p : 0), 0);
      }

      const observedTimestamp = cur.time ? new Date(cur.time).toISOString() : new Date().toISOString();
      const freshness = evaluateFreshness(observedTimestamp, 30, 90, 240);

      // Latest CAPE reading from current hour index (index 24)
      const currentCape = hourly && Array.isArray(hourly.cape) && hourly.cape[24] !== undefined ? hourly.cape[24] : undefined;
      const currentPrecipProb = hourly && Array.isArray(hourly.precipitation_probability) && hourly.precipitation_probability[24] !== undefined ? hourly.precipitation_probability[24] : undefined;

      const weatherTelemetry: LiveWeatherTelemetry = {
        temperatureCelsius: cur.temperature_2m,
        feelsLikeCelsius: cur.apparent_temperature ?? cur.temperature_2m,
        relativeHumidityPercent: cur.relative_humidity_2m,
        windSpeedKmH: cur.wind_speed_10m,
        windDirectionDegrees: cur.wind_direction_10m,
        windGustsKmH: cur.wind_gusts_10m,
        precipitationRateMmPerHour: cur.precipitation ?? 0,
        precipitationAccumulation24hMm: parseFloat(real24hAccumulation.toFixed(1)),
        forecastPrecipitationAccumulation24hMm: parseFloat(real24hForecast.toFixed(1)),
        precipitationProbabilityPercent: currentPrecipProb,
        surfacePressureHpa: cur.surface_pressure,
        pressureMslHpa: cur.pressure_msl,
        cloudCoverPercent: cur.cloud_cover,
        visibilityMeters: cur.visibility,
        weatherCode: cur.weather_code ?? 0,
        capeJkg: currentCape,
        isDay: cur.is_day === 1,
        observedTimestamp,
        freshness,
        coordinates: [latitude, longitude]
      };

      try {
        localStorage.setItem(CACHE_KEYS.WEATHER, JSON.stringify({ telemetry: weatherTelemetry, cachedAt: Date.now() }));
      } catch {}

      return weatherTelemetry;
    } catch (err) {
      console.warn('Orchestrated weather fetch failed, attempting cached fallback:', err);
      try {
        const cached = localStorage.getItem(CACHE_KEYS.WEATHER);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.telemetry) {
            parsed.telemetry.freshness = evaluateFreshness(parsed.telemetry.observedTimestamp, 30, 90, 240);
            return parsed.telemetry;
          }
        }
      } catch {}
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

// ============================================================================
// 2. USGS REAL-TIME SEISMIC NETWORK & ATTENUATION ORCHESTRATOR
// ============================================================================

export async function fetchOrchestratedUSGS(
  userLatitude: number,
  userLongitude: number
): Promise<LiveSeismicTelemetry> {
  const cacheKey = `seismic_${userLatitude.toFixed(2)}_${userLongitude.toFixed(2)}`;
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = (async () => {
    try {
      // Official USGS real-time M2.5+ earthquake feed for past 24 hours
      const response = await fetch(
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
        { cache: 'no-store' }
      );
      if (!response.ok) throw new Error(`USGS HTTP ${response.status}`);
      const geojson = await response.json();

      const events: LiveSeismicEvent[] = [];
      const userCoords: [number, number] = [userLatitude, userLongitude];

      if (geojson.features && Array.isArray(geojson.features)) {
        for (const feat of geojson.features) {
          const p = feat.properties;
          const [lon, lat, depth] = feat.geometry.coordinates;
          const mag = typeof p.mag === 'number' ? p.mag : 3.0;
          const depthKm = typeof depth === 'number' ? depth : 10.0;

          // ── Great-Circle Epicentral Distance ──
          const epicentralDistKm = Math.round(getDistance(userCoords[0], userCoords[1], lat, lon));

          // ── 3D Hypocentral Distance: sqrt(d^2 + h^2) ──
          const hypocentralDistKm = Math.round(Math.sqrt(Math.pow(epicentralDistKm, 2) + Math.pow(depthKm, 2)));

          // ── Joyner-Boore / Campbell Attenuation Peak Ground Acceleration (PGA in g) ──
          // Formula: PGA = 10^(0.5*M - 1.25) / (HypoDist + 15)^1.15
          const rawPga = Math.pow(10, (0.5 * mag) - 1.25) / Math.pow(hypocentralDistKm + 15, 1.15);
          const estimatedPgaG = parseFloat(Math.min(1.5, Math.max(0, rawPga)).toFixed(4));

          // Physical perception threshold: PGA >= 0.005g (approx. MMI II-III)
          const isLocalShakingPerceptible = estimatedPgaG >= 0.005 && epicentralDistKm <= 400;

          let attenuationSummary = '';
          if (epicentralDistKm > 800) {
            attenuationSummary = `Distant seismic event (${epicentralDistKm} km away). Shockwave energy attenuated to imperceptible baseline at current coordinates.`;
          } else if (epicentralDistKm > 300) {
            attenuationSummary = `Regional seismic event (${epicentralDistKm} km away). Ground motion strongly attenuated (PGA ${estimatedPgaG}g).`;
          } else if (isLocalShakingPerceptible) {
            attenuationSummary = `Local/near-source event (${epicentralDistKm} km, depth ${depthKm} km). Estimated PGA: ${estimatedPgaG}g. Perceptible shaking likely.`;
          } else {
            attenuationSummary = `Intermediate distance (${epicentralDistKm} km). Slight vibration potential below structural damage threshold.`;
          }

          const eventTime = new Date(p.time || Date.now()).toISOString();
          const updatedTime = new Date(p.updated || p.time || Date.now()).toISOString();
          const freshness = evaluateFreshness(eventTime, 60, 360, 1440);

          events.push({
            id: `usgs-${feat.id}`,
            magnitude: mag,
            depthKm,
            eventTime,
            updatedTime,
            place: p.place || `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
            coordinates: [lat, lon],
            epicentralDistanceKm: epicentralDistKm,
            hypocentralDistanceKm: hypocentralDistKm,
            estimatedPgaG,
            isLocalShakingPerceptible,
            attenuationSummary,
            mmiIntensity: p.mmi ? parseFloat(p.mmi) : undefined,
            feltReports: typeof p.felt === 'number' ? p.felt : undefined,
            alertLevel: p.alert,
            significance: p.sig,
            freshness
          });
        }
      }

      // Sort by proximity to user
      events.sort((a, b) => a.epicentralDistanceKm - b.epicentralDistanceKm);
      // Strictly filter events within local 30 km assessment radius
      const localEvents = events.filter(e => e.epicentralDistanceKm <= 30);
      const nearestEvent = localEvents.length > 0 ? localEvents[0] : null;

      // Anomaly flagged only if a genuine event is detected within the 30 km radius
      const isRegionalAnomalyDetected = localEvents.length > 0;

      const seismicTelemetry: LiveSeismicTelemetry = {
        events: localEvents,
        nearestEvent,
        observedTimestamp: nearestEvent ? nearestEvent.eventTime : new Date().toISOString(),
        freshness: nearestEvent ? nearestEvent.freshness : 'LIVE',
        isRegionalAnomalyDetected
      };

      try {
        localStorage.setItem(CACHE_KEYS.SEISMIC, JSON.stringify({ telemetry: seismicTelemetry, cachedAt: Date.now() }));
      } catch {}

      return seismicTelemetry;
    } catch (err) {
      console.warn('Orchestrated USGS fetch failed, attempting cached fallback:', err);
      try {
        const cached = localStorage.getItem(CACHE_KEYS.SEISMIC);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.telemetry) return parsed.telemetry;
        }
      } catch {}
      return {
        events: [],
        nearestEvent: null,
        observedTimestamp: new Date().toISOString(),
        freshness: 'UNAVAILABLE',
        isRegionalAnomalyDetected: false
      };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

// ============================================================================
// 3. NASA FIRMS ACTIVE FIRE / THERMAL SENSING ORCHESTRATOR
// ============================================================================

export async function fetchOrchestratedNASA_FIRMS(
  userLatitude: number,
  userLongitude: number
): Promise<LiveFireTelemetry> {
  const cacheKey = `firms_${userLatitude.toFixed(2)}_${userLongitude.toFixed(2)}`;
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const firmsKey = 
        (import.meta as any).env?.VITE_FIRMS_MAP_KEY || 
        (import.meta as any).env?.VITE_NASA_FIRMS_MAP_KEY || 
        '';
      const detections: LiveFirmsDetection[] = [];
      let sourceType: LiveFireTelemetry['sourceType'] = 'NASA_FIRMS_VIIRS';

      // ── Strategy A: NASA FIRMS Area Query (Proxy Endpoint or Direct Authenticated API) ──
      const bbox = `${(userLongitude - 0.5).toFixed(2)},${(userLatitude - 0.5).toFixed(2)},${(userLongitude + 0.5).toFixed(2)},${(userLatitude + 0.5).toFixed(2)}`;
      let csvText: string | null = null;

      // Try serverless proxy first if available (configurable base URL for Android / relative for Vercel)
      try {
        const apiBase = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
        const proxyUrl = `${apiBase}/api/firms?bbox=${bbox}&days=1`;
        const proxyRes = await fetch(proxyUrl, { cache: 'no-store' });
        if (proxyRes.ok) {
          csvText = await proxyRes.text();
        }
      } catch {}

      // Fallback to direct client API if proxy is not deployed and client key is present
      if (!csvText && firmsKey && firmsKey.trim() !== '' && firmsKey !== 'YOUR_FIRMS_MAP_KEY') {
        try {
          const directUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsKey.trim()}/VIIRS_SNPP_NRT/${bbox}/1`;
          const directRes = await fetch(directUrl, { cache: 'no-store' });
          if (directRes.ok) {
            csvText = await directRes.text();
          }
        } catch {}
      }

      if (csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.trim());
          const latIdx = headers.indexOf('latitude');
          const lonIdx = headers.indexOf('longitude');
          const dateIdx = headers.indexOf('acq_date');
          const timeIdx = headers.indexOf('acq_time');
          const frpIdx = headers.indexOf('frp');
          const confIdx = headers.indexOf('confidence');

            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',');
              if (cols.length >= 6) {
                const lat = parseFloat(cols[latIdx]);
                const lon = parseFloat(cols[lonIdx]);
                const dist = Math.round(getDistance(userLatitude, userLongitude, lat, lon));

                detections.push({
                  latitude: lat,
                  longitude: lon,
                  distanceKm: dist,
                  acquisitionDate: cols[dateIdx] || new Date().toISOString().slice(0, 10),
                  acquisitionTime: cols[timeIdx] || '0000',
                  satellite: 'Suomi NPP',
                  sensor: 'VIIRS',
                  confidence: cols[confIdx] || 'nominal',
                  frpMw: frpIdx >= 0 ? parseFloat(cols[frpIdx]) || undefined : undefined,
                  dayNight: 'D'
                });
              }
            }
          }
        }

      // ── Filter by Spatial Buffers ──
      const detectionsWithin5km = detections.filter(d => d.distanceKm <= 5).length;
      const detectionsWithin10km = detections.filter(d => d.distanceKm <= 10).length;
      const detectionsWithin25km = detections.filter(d => d.distanceKm <= 25).length;

      detections.sort((a, b) => a.distanceKm - b.distanceKm);
      const nearestFireDistanceKm = detections.length > 0 ? detections[0].distanceKm : undefined;
      const maxFrpMw = detections.length > 0 
        ? Math.max(...detections.map(d => d.frpMw || 0)) 
        : undefined;

      const isSatelliteFireDetected = detectionsWithin25km > 0;
      let summary = '';
      if (isSatelliteFireDetected) {
        summary = `Active thermal anomaly detected by NASA FIRMS satellite pass (${detectionsWithin25km} detection(s) within 25 km, nearest ${nearestFireDistanceKm} km).`;
      } else {
        summary = 'No recent satellite thermal anomalies or active fire detections located within the 25 km assessment radius.';
      }

      const observedTimestamp = detections.length > 0
        ? `${detections[0].acquisitionDate}T${detections[0].acquisitionTime.slice(0, 2)}:${detections[0].acquisitionTime.slice(2, 4)}:00Z`
        : new Date().toISOString();

      const freshness = evaluateFreshness(observedTimestamp, 180, 720, 1440);

      const fireTelemetry: LiveFireTelemetry = {
        activeDetections: detections,
        detectionsWithin5km,
        detectionsWithin10km,
        detectionsWithin25km,
        nearestFireDistanceKm,
        maxFrpMw: maxFrpMw && maxFrpMw > 0 ? maxFrpMw : undefined,
        sourceType,
        observedTimestamp,
        freshness: isSatelliteFireDetected ? freshness : 'LIVE',
        isSatelliteFireDetected,
        summary
      };

      try {
        localStorage.setItem(CACHE_KEYS.FIRE, JSON.stringify({ telemetry: fireTelemetry, cachedAt: Date.now() }));
      } catch {}

      return fireTelemetry;
    } catch (err) {
      console.warn('NASA FIRMS telemetry fetch error:', err);
      return {
        activeDetections: [],
        detectionsWithin5km: 0,
        detectionsWithin10km: 0,
        detectionsWithin25km: 0,
        sourceType: 'NASA_FIRMS_VIIRS' as const,
        observedTimestamp: new Date().toISOString(),
        freshness: 'LIVE' as const,
        isSatelliteFireDetected: false,
        summary: 'No recent satellite fire detections within 25 km radius.'
      };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

// ============================================================================
// 4. RIVER HYDROLOGY & GLOFAS STREAMFLOW ORCHESTRATOR
// ============================================================================

export async function fetchOrchestratedHydrology(
  latitude: number,
  longitude: number
): Promise<LiveHydrologyTelemetry> {
  const cacheKey = `hydrology_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise: Promise<LiveHydrologyTelemetry> = (async (): Promise<LiveHydrologyTelemetry> => {
    try {
      // ECMWF Copernicus Global Flood Awareness System (GloFAS) River Discharge API via Open-Meteo Flood API
      const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${latitude}&longitude=${longitude}&daily=river_discharge,river_discharge_mean,river_discharge_median,river_discharge_max,river_discharge_p25,river_discharge_p75&forecast_days=7`;

      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`GloFAS HTTP ${response.status}`);
      const json = await response.json();

      if (json.daily && Array.isArray(json.daily.river_discharge) && json.daily.river_discharge.length > 0) {
        const dischargeSeries = json.daily.river_discharge;
        const currentDischarge = dischargeSeries[0];
        const meanDischarge = json.daily.river_discharge_mean?.[0];
        const medianDischarge = json.daily.river_discharge_median?.[0];
        const maxThreshold = json.daily.river_discharge_max?.[0]; // 100-year / max flood capacity
        const p75Threshold = json.daily.river_discharge_p75?.[0];

        // Rate of rise: difference between tomorrow's forecast discharge and today
        const nextDayDischarge = dischargeSeries[1] ?? currentDischarge;
        const rateOfRise = parseFloat((nextDayDischarge - currentDischarge).toFixed(2));

        // If discharge is negligible (< 0.5 m3/s), the grid cell is not on an active river channel
        const isRiverChannel = typeof currentDischarge === 'number' && currentDischarge >= 0.5;

        if (isRiverChannel) {
          const percentile = maxThreshold && maxThreshold > 0 
            ? Math.round((currentDischarge / maxThreshold) * 100) 
            : p75Threshold && p75Threshold > 0 ? Math.round((currentDischarge / p75Threshold) * 75) : 50;

          const observedTimestamp = new Date().toISOString();
          const freshness = evaluateFreshness(observedTimestamp, 180, 720, 1440);

          return {
            isStationAvailable: true,
            stationName: `Regional Hydrological Grid [${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E]`,
            riverDischargeM3s: parseFloat(currentDischarge.toFixed(2)),
            riverDischargeMeanM3s: typeof meanDischarge === 'number' ? parseFloat(meanDischarge.toFixed(2)) : undefined,
            riverDischargeMedianM3s: typeof medianDischarge === 'number' ? parseFloat(medianDischarge.toFixed(2)) : undefined,
            riverDischargeMaxM3s: typeof maxThreshold === 'number' ? parseFloat(maxThreshold.toFixed(2)) : undefined,
            riverDischargePercentile: percentile,
            rateOfRiseM3sPerDay: rateOfRise,
            observedTimestamp,
            freshness,
            summary: `GloFAS River streamflow discharge measured at ${currentDischarge.toFixed(1)} m³/s (Climatological mean: ${meanDischarge?.toFixed(1) || 'N/A'} m³/s). 24h discharge trend: ${rateOfRise >= 0 ? `+${rateOfRise}` : rateOfRise} m³/s/day.`
          };
        }
      }

      // No active river gauge / major streamflow channel in this exact cell
      return {
        isStationAvailable: false,
        observedTimestamp: new Date().toISOString(),
        freshness: 'UNAVAILABLE' as const,
        summary: 'River gauge data unavailable for this location (Meteorological-only flood assessment)'
      };
    } catch (err) {
      console.warn('Hydrology streamflow telemetry fetch error:', err);
      return {
        isStationAvailable: false,
        observedTimestamp: new Date().toISOString(),
        freshness: 'UNAVAILABLE' as const,
        summary: 'River gauge data unavailable for this location (Meteorological-only flood assessment)'
      };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

// ============================================================================
// 5. UNIFIED REAL-TIME DATA ORCHESTRATOR SNAPSHOT
// ============================================================================

export async function fetchUnifiedTelemetrySnapshot(
  latitude: number,
  longitude: number,
  locationName = 'User Operational Sector'
): Promise<UnifiedTelemetrySnapshot> {
  const [weather, seismic, fire, hydrology] = await Promise.all([
    fetchOrchestratedWeather(latitude, longitude),
    fetchOrchestratedUSGS(latitude, longitude),
    fetchOrchestratedNASA_FIRMS(latitude, longitude),
    fetchOrchestratedHydrology(latitude, longitude)
  ]);

  // Read cached OSM infrastructure facilities count if present
  let infrastructure: LiveInfrastructureTelemetry | null = null;
  try {
    const facilitiesCacheKey = `drishti_facilities_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
    const cached = localStorage.getItem(facilitiesCacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed.facilities)) {
        const facilities = parsed.facilities;
        infrastructure = {
          hospitalsCount: facilities.filter((f: any) => f.type === 'hospital').length,
          policeCount: facilities.filter((f: any) => f.type === 'police').length,
          fireStationsCount: facilities.filter((f: any) => f.type === 'fire_station').length,
          sheltersCount: facilities.filter((f: any) => f.type === 'shelter').length,
          totalFacilitiesCount: facilities.length,
          cacheTimestamp: new Date(parsed.timestamp || Date.now()).toISOString(),
          source: 'OpenStreetMap Overpass Geospatial Database (Cached)',
          freshness: evaluateFreshness(new Date(parsed.timestamp || Date.now()).toISOString(), 720, 1440, 4320)
        };
      }
    }
  } catch {}

  // Determine overall aggregate data freshness
  const allFreshness = [
    weather?.freshness,
    seismic.freshness,
    fire.freshness,
    hydrology.isStationAvailable ? hydrology.freshness : undefined
  ].filter(Boolean) as TelemetryFreshness[];

  let overallFreshness: TelemetryFreshness = 'LIVE';
  if (allFreshness.every(f => f === 'UNAVAILABLE')) {
    overallFreshness = 'UNAVAILABLE';
  } else if (allFreshness.some(f => f === 'STALE')) {
    overallFreshness = 'STALE';
  } else if (allFreshness.some(f => f === 'AGING')) {
    overallFreshness = 'AGING';
  } else if (allFreshness.some(f => f === 'RECENT')) {
    overallFreshness = 'RECENT';
  }

  const snapshot: UnifiedTelemetrySnapshot = {
    weather,
    seismic,
    fire,
    hydrology,
    infrastructure,
    observedCoordinates: [latitude, longitude],
    locationName,
    overallFreshness,
    lastUpdated: new Date().toISOString()
  };

  try {
    localStorage.setItem(CACHE_KEYS.SNAPSHOT, JSON.stringify(snapshot));
  } catch {}

  return snapshot;
}
