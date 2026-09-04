import { useState, useEffect, useRef, useCallback } from 'react';

interface LocationState {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  status: 'granting' | 'granted' | 'denied' | 'unavailable' | 'prompt';
  address?: string | null;
  lastUpdated: Date | null;
  error: string | null;
}

// Reverse geocode a lat/lon to a human-readable address name
const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  // Strategy 1: BigDataCloud Client Reverse Geocoder (High speed, CORS friendly)
  try {
    const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const parts = [
        bdcData.locality || bdcData.city,
        bdcData.principalSubdivision || bdcData.countryName
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch {}

  // Strategy 2: OpenStreetMap Nominatim Geocoder
  try {
    const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`);
    if (osmRes.ok) {
      const data = await osmRes.json();
      if (data.address) {
        const parts = [
          data.address.suburb || data.address.neighbourhood || data.address.road || data.address.village,
          data.address.city || data.address.town || data.address.county,
          data.address.state
        ].filter(Boolean);
        const uniqueParts = parts.filter((val: string, idx: number, arr: string[]) => idx === 0 || val !== arr[idx - 1]);
        if (uniqueParts.length > 0) {
          return uniqueParts.join(', ');
        }
      }
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 2).join(', ');
      }
    }
  } catch {}

  // Strategy 3: Coordinates fallback
  return `${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`;
};

export const useLocation = () => {
  // Try loading cached location on init
  const getInitialState = (): LocationState => {
    try {
      const cached = localStorage.getItem('drishti_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only use cache if it's less than 10 minutes old
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < 600000) {
          return {
            coords: parsed.coords,
            status: 'granted',
            address: parsed.address || null,
            lastUpdated: parsed.timestamp ? new Date(parsed.timestamp) : null,
            error: null,
          };
        }
        // Still return stale coords as initial, but mark as needing refresh
        return {
          coords: parsed.coords,
          status: 'granted',
          address: parsed.address || null,
          lastUpdated: parsed.timestamp ? new Date(parsed.timestamp) : null,
          error: null,
        };
      }
    } catch {}
    return {
      coords: null,
      status: 'prompt',
      lastUpdated: null,
      error: null,
    };
  };

  const [location, setLocation] = useState<LocationState>(getInitialState());
  const retryCountRef = useRef(0);
  const maxRetries = 2;

  const handlePositionSuccess = useCallback(async (position: GeolocationPosition) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    retryCountRef.current = 0; // Reset retry counter on success

    const addressName = await reverseGeocode(lat, lon);

    const newState: LocationState = {
      coords: {
        latitude: lat,
        longitude: lon,
        accuracy: position.coords.accuracy,
      },
      address: addressName,
      status: 'granted',
      lastUpdated: new Date(),
      error: null,
    };

    // Cache for offline use
    try {
      localStorage.setItem('drishti_location', JSON.stringify({
        coords: newState.coords,
        address: newState.address,
        timestamp: Date.now(),
      }));
    } catch {}

    setLocation(newState);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, status: 'unavailable', error: 'Geolocation is not supported by your browser' }));
      return;
    }

    setLocation(prev => ({ ...prev, status: 'granting', error: null }));

    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      (error) => {
        let errorMsg = 'An unknown error occurred.';
        let newStatus: LocationState['status'] = 'unavailable';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'User denied the request for Geolocation.';
            newStatus = 'denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location information is unavailable.';
            newStatus = 'unavailable';
            break;
          case error.TIMEOUT:
            errorMsg = 'The request to get user location timed out.';
            newStatus = 'unavailable';
            break;
        }

        // On timeout, retry with lower accuracy (faster) before giving up
        if (error.code === error.TIMEOUT && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          navigator.geolocation.getCurrentPosition(
            handlePositionSuccess,
            () => {
              // Final failure: use cached location if available, otherwise set error
              setLocation(prev => {
                if (!navigator.onLine && prev.coords) {
                  // Offline with cached coords — keep using them silently
                  return prev;
                }
                if (prev.coords) {
                  // Online but GPS failed — keep cached coords, just note the error
                  return { ...prev, error: errorMsg };
                }
                return { ...prev, status: newStatus, error: errorMsg, address: null };
              });
            },
            {
              enableHighAccuracy: false, // Fallback to cell/WiFi triangulation (much faster)
              timeout: 20000,
              maximumAge: 60000 // Accept up to 1 min old cached position
            }
          );
          return;
        }

        // Use functional updater to avoid stale closure bug
        setLocation(prev => {
          if (!navigator.onLine && prev.coords) {
            // Offline with cached coords — keep using them
            return prev;
          }
          return { ...prev, status: newStatus, error: errorMsg, address: null };
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000 // Accept up to 30s old cached position to avoid unnecessary waits
      }
    );
  }, [handlePositionSuccess]);

  useEffect(() => {
    // Always attempt a location fetch on mount
    requestLocation();

    // Set up periodic refresh every 5 minutes when online
    const refreshInterval = setInterval(() => {
      if (navigator.onLine) {
        requestLocation();
      }
    }, 300000); // 5 minutes

    return () => clearInterval(refreshInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { location, requestLocation };
};
