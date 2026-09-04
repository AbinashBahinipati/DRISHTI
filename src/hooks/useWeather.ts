import { useState, useEffect } from 'react';

export interface HourlyForecastItem {
  time: string;
  hour: string;
  temp: number;
  weatherCode: number;
  precipProb?: number;
}

export interface DailyForecastItem {
  date: string;
  dayName: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  precipProb?: number;
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts?: number;
  precipitation: number;
  precipitationAccumulation24h?: number;
  forecastPrecipitation24h?: number;
  precipitationProbability?: number;
  surfacePressure?: number;
  pressureMsl?: number;
  cloudCover?: number;
  visibility?: number;
  weatherCode: number;
  cape?: number;
  isDay: boolean;
  source: 'Open-Meteo Global Environmental Telemetry';
  observedTimestamp: string;
  freshness: 'LIVE' | 'RECENT' | 'AGING' | 'STALE' | 'UNAVAILABLE';
  hourlyForecast?: HourlyForecastItem[];
  dailyForecast?: DailyForecastItem[];
  hourlyHistory?: {
    temperature: number[];
    humidity: number[];
    precipitation: number[];
    windSpeed: number[];
  };
}

interface WeatherState {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Map WMO weather codes to descriptions (subset)
export const getWeatherDescription = (code: number) => {
  if (code === 0) return 'Clear sky';
  if (code === 1 || code === 2 || code === 3) return 'Mainly clear, partly cloudy';
  if (code === 45 || code === 48) return 'Fog & mist';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 75) return 'Snow fall';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Overcast';
};

export const useWeather = (latitude?: number, longitude?: number) => {
  const [weather, setWeather] = useState<WeatherState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const fetchWeather = async (lat: number, lon: number) => {
    setWeather(prev => ({ ...prev, loading: true, error: null }));
    const cacheKey = `drishti_weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;

    try {
      // Open-Meteo endpoint with real-time current, 24h hourly, and 7-day daily forecast
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,surface_pressure,pressure_msl,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=precipitation,rain,showers,temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_gusts_10m,precipitation_probability,weather_code,cape&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&past_hours=24&forecast_hours=48&timezone=auto`;
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();
      const current = data.current;
      const hourly = data.hourly;
      const daily = data.daily;

      // Real rolling 24h precipitation sum from past hourly measurements
      let real24hAccumulation = 0;
      let real24hForecast = 0;
      if (hourly && Array.isArray(hourly.precipitation)) {
        const pastPrecip = hourly.precipitation.slice(0, 24);
        real24hAccumulation = pastPrecip.reduce((sum: number, p: number) => sum + (typeof p === 'number' && p > 0 ? p : 0), 0);

        const forecastPrecip = hourly.precipitation.slice(24, 48);
        real24hForecast = forecastPrecip.reduce((sum: number, p: number) => sum + (typeof p === 'number' && p > 0 ? p : 0), 0);
      }

      // Parse next 12-24 hours forecast
      const hourlyForecast: HourlyForecastItem[] = [];
      if (hourly && Array.isArray(hourly.time)) {
        const startIndex = 24; // Current/upcoming hours
        const count = Math.min(24, hourly.time.length - startIndex);
        for (let i = startIndex; i < startIndex + count; i++) {
          const rawTime = hourly.time[i];
          const d = new Date(rawTime);
          hourlyForecast.push({
            time: rawTime,
            hour: d.toLocaleTimeString([], { hour: 'numeric', hour12: true }),
            temp: Math.round(hourly.temperature_2m?.[i] ?? 0),
            weatherCode: hourly.weather_code?.[i] ?? 0,
            precipProb: hourly.precipitation_probability?.[i]
          });
        }
      }

      // Parse next 5-7 days daily forecast
      const dailyForecast: DailyForecastItem[] = [];
      if (daily && Array.isArray(daily.time)) {
        for (let i = 0; i < daily.time.length; i++) {
          const rawDate = daily.time[i];
          const d = new Date(rawDate);
          const isToday = i === 0;
          const isTomorrow = i === 1;
          const dayName = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short' });

          dailyForecast.push({
            date: rawDate,
            dayName,
            maxTemp: Math.round(daily.temperature_2m_max?.[i] ?? 0),
            minTemp: Math.round(daily.temperature_2m_min?.[i] ?? 0),
            weatherCode: daily.weather_code?.[i] ?? 0,
            precipProb: daily.precipitation_probability_max?.[i]
          });
        }
      }

      const currentCape = hourly && Array.isArray(hourly.cape) ? hourly.cape[24] : undefined;
      const currentPrecipProb = hourly && Array.isArray(hourly.precipitation_probability) ? hourly.precipitation_probability[24] : undefined;
      const observedTimestamp = current.time ? new Date(current.time).toISOString() : new Date().toISOString();

      const weatherData: WeatherData = {
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature ?? current.temperature_2m,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        windGusts: current.wind_gusts_10m,
        precipitation: current.precipitation ?? 0,
        precipitationAccumulation24h: parseFloat(real24hAccumulation.toFixed(1)),
        forecastPrecipitation24h: parseFloat(real24hForecast.toFixed(1)),
        precipitationProbability: currentPrecipProb,
        surfacePressure: current.surface_pressure,
        pressureMsl: current.pressure_msl,
        cloudCover: current.cloud_cover,
        visibility: current.visibility,
        weatherCode: current.weather_code ?? 0,
        cape: currentCape,
        isDay: current.is_day === 1,
        source: 'Open-Meteo Global Environmental Telemetry',
        observedTimestamp,
        freshness: 'LIVE',
        hourlyForecast,
        dailyForecast,
        hourlyHistory: hourly ? {
          temperature: Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m.slice(0, 24) : [],
          humidity: Array.isArray(hourly.relative_humidity_2m) ? hourly.relative_humidity_2m.slice(0, 24) : [],
          precipitation: Array.isArray(hourly.precipitation) ? hourly.precipitation.slice(0, 24) : [],
          windSpeed: Array.isArray(hourly.wind_speed_10m) ? hourly.wind_speed_10m.slice(0, 24) : []
        } : undefined
      };

      // Cache to localStorage for offline use
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data: weatherData, timestamp: Date.now() }));
      } catch {}

      setWeather({
        data: weatherData,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err) {
      // Try to load from localStorage cache when offline
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          cachedData.freshness = 'STALE';
          setWeather({
            data: cachedData,
            loading: false,
            error: null,
            lastUpdated: new Date(timestamp),
          });
          return;
        }
      } catch {}

      setWeather(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error fetching weather',
      }));
    }
  };

  useEffect(() => {
    const targetLat = latitude ?? 20.2961;
    const targetLon = longitude ?? 85.8245;

    fetchWeather(targetLat, targetLon);

    // Poll every 5 minutes (300000 ms) for live weather
    const interval = setInterval(() => {
      fetchWeather(targetLat, targetLon);
    }, 300000);

    return () => clearInterval(interval);
  }, [latitude, longitude]);

  const forceRefresh = () => {
    const targetLat = latitude ?? 20.2961;
    const targetLon = longitude ?? 85.8245;
    fetchWeather(targetLat, targetLon);
  };

  return { ...weather, forceRefresh };
};
