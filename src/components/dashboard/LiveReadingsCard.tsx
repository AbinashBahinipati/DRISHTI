import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { Thermometer, Droplets, Wind, CloudRain, MapPin, RefreshCw, Radio } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';

interface LiveReadingsCardProps {
  latitude?: number;
  longitude?: number;
  address?: string | null;
}

const Sparkline = ({ data, color, height = 48 }: { data: { value: number }[], color: string, height?: number }) => (
  <div style={{ width: '100%', height: `${height}px`, marginTop: '6px' }}>
    <ResponsiveContainer width="100%" height="100%" className="animated-sparkline">
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`color-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.45} />
            <stop offset="95%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fillOpacity={1}
          fill={`url(#color-${color})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
    <style>{`
      @keyframes breath-chart {
        0% { opacity: 0.75; }
        50% { opacity: 1; }
        100% { opacity: 0.75; }
      }
      .animated-sparkline path.recharts-area-area,
      .animated-sparkline path.recharts-area-curve {
        animation: breath-chart 4s ease-in-out infinite;
      }
    `}</style>
  </div>
);

export const LiveReadingsCard: React.FC<LiveReadingsCardProps> = ({ latitude, longitude, address }) => {
  const effectiveLat = latitude ?? 20.2961;
  const effectiveLon = longitude ?? 85.8245;

  const { data: weather, loading, forceRefresh } = useWeather(effectiveLat, effectiveLon);

  // Use genuine 24h past hourly measurements from Open-Meteo
  const tempData = useMemo(() => {
    if (weather?.hourlyHistory?.temperature && weather.hourlyHistory.temperature.length > 0) {
      return weather.hourlyHistory.temperature.map(t => ({ value: t }));
    }
    if (weather?.temperature !== undefined) {
      return Array(24).fill(0).map(() => ({ value: weather.temperature }));
    }
    return [];
  }, [weather]);

  const humData = useMemo(() => {
    if (weather?.hourlyHistory?.humidity && weather.hourlyHistory.humidity.length > 0) {
      return weather.hourlyHistory.humidity.map(h => ({ value: h }));
    }
    if (weather?.humidity !== undefined) {
      return Array(24).fill(0).map(() => ({ value: weather.humidity }));
    }
    return [];
  }, [weather]);

  const precipData = useMemo(() => {
    if (weather?.hourlyHistory?.precipitation && weather.hourlyHistory.precipitation.length > 0) {
      return weather.hourlyHistory.precipitation.map(p => ({ value: Math.max(0, p) }));
    }
    if (weather?.precipitation !== undefined) {
      return Array(24).fill(0).map(() => ({ value: weather.precipitation }));
    }
    return [];
  }, [weather]);

  const valueStyle: React.CSSProperties = {
    fontSize: '1.9rem',
    fontWeight: 700,
    color: 'var(--color-text, #ffffff)',
    lineHeight: 1,
    letterSpacing: '-0.02em',
    marginBottom: '4px'
  };

  const axisLabelsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.52rem',
    color: 'var(--color-text-muted, #64748b)',
    marginTop: '3px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {/* Live Coordinate Status Bar */}
      <div className="live-reading-glass-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text, #cbd5e1)' }}>
          <MapPin size={12} className="text-orange-400" />
          <span style={{ fontWeight: 600 }}>
            {address || `${effectiveLat.toFixed(4)}°N, ${effectiveLon.toFixed(4)}°E (Bhubaneswar)`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: 700, fontSize: '0.65rem' }}>
            <Radio size={10} className="animate-pulse" />
            <span>REAL-TIME SENSOR FEED</span>
          </div>

          <button
            onClick={forceRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              padding: '3px 8px',
              color: 'var(--color-text-secondary, #94a3b8)',
              fontSize: '0.65rem',
              cursor: 'pointer'
            }}
            title="Force refresh live weather telemetry"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* 4 Telemetry Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', width: '100%' }}>
        {/* 1. Temperature Card */}
        <div className="live-reading-glass-card">
          <div className="live-reading-glass-header">
            <h3 style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary, #94a3b8)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>Temperature</h3>
            <Thermometer size={13} className="text-orange-400" />
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={valueStyle}>
              {weather?.temperature !== undefined ? `${weather.temperature.toFixed(1)}°C` : loading ? '...' : '--'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary, #94a3b8)', marginBottom: '6px' }}>
              Feels like: <strong style={{ color: 'var(--color-text, #e2e8f0)' }}>{weather?.feelsLike !== undefined ? `${weather.feelsLike.toFixed(1)}°C` : '--'}</strong>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <Sparkline data={tempData} color="#f97316" height={44} />
              <div style={axisLabelsStyle}>
                <span>-24h</span><span>-18h</span><span>-12h</span><span>-6h</span><span>Now</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Humidity Card */}
        <div className="live-reading-glass-card">
          <div className="live-reading-glass-header">
            <h3 style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary, #94a3b8)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>Humidity</h3>
            <Droplets size={13} className="text-sky-400" />
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={valueStyle}>
              {weather?.humidity !== undefined ? `${weather.humidity}%` : loading ? '...' : '--'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary, #94a3b8)', marginBottom: '6px' }}>
              Pressure: <strong style={{ color: 'var(--color-text, #e2e8f0)' }}>{weather?.surfacePressure !== undefined ? `${weather.surfacePressure.toFixed(0)} hPa` : '--'}</strong>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <Sparkline data={humData} color="#38bdf8" height={44} />
              <div style={axisLabelsStyle}>
                <span>-24h</span><span>-18h</span><span>-12h</span><span>-6h</span><span>Now</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Precipitation Card */}
        <div className="live-reading-glass-card">
          <div className="live-reading-glass-header">
            <h3 style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary, #94a3b8)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>Precipitation</h3>
            <CloudRain size={13} className="text-emerald-400" />
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={valueStyle}>
              {weather?.precipitation !== undefined ? `${weather.precipitation.toFixed(1)} mm` : loading ? '...' : '--'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary, #94a3b8)', marginBottom: '6px' }}>
              24h Total: <strong style={{ color: 'var(--color-text, #e2e8f0)' }}>{weather?.precipitationAccumulation24h !== undefined ? `${weather.precipitationAccumulation24h.toFixed(1)} mm` : '0.0 mm'}</strong>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <Sparkline data={precipData} color="#10b981" height={44} />
              <div style={axisLabelsStyle}>
                <span>-24h</span><span>-18h</span><span>-12h</span><span>-6h</span><span>Now</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Wind Velocity Card */}
        <div className="live-reading-glass-card">
          <div className="live-reading-glass-header">
            <h3 style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary, #94a3b8)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>Wind Velocity</h3>
            <Wind size={13} className="text-amber-400" />
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={valueStyle}>
              {weather?.windSpeed !== undefined ? `${weather.windSpeed.toFixed(1)}` : loading ? '...' : '--'} <span style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary, #94a3b8)', fontWeight: 500 }}>km/h</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary, #94a3b8)', marginBottom: '6px' }}>
              Direction: <strong style={{ color: 'var(--color-text, #e2e8f0)' }}>{weather?.windDirection !== undefined ? `${weather.windDirection}°` : '--'}</strong>
            </div>
            <div className="live-reading-gust-box">
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text, #cbd5e1)', fontWeight: 600 }}>
                {weather?.windGusts !== undefined ? `Gusts: ${weather.windGusts.toFixed(1)} km/h` : 'Calm Conditions'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveReadingsCard;
