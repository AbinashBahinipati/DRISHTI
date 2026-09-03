import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import {
  MapPin,
  RefreshCw,
  WifiOff,
  Radio,
  AlertOctagon,
  Clock
} from 'lucide-react';
import { useEarlyWarning } from '../hooks/useEarlyWarning';
import { useLocation } from '../hooks/useLocation';
import { useSettings } from '../hooks/useSettings';
import { RiskGauge } from '../components/earlywarning/RiskGauge';
import { HazardRiskCard } from '../components/earlywarning/HazardRiskCard';
import { EarlyWarningBulletin } from '../components/earlywarning/EarlyWarningBulletin';
import { EvidenceSources } from '../components/earlywarning/EvidenceSources';
import { LiveDataStatusPanel } from '../components/earlywarning/LiveDataStatusPanel';
import type { HazardRiskAssessment, Audience } from '../types/earlyWarning';
import '../styles/EarlyWarning.css';

export const EarlyWarning: React.FC = () => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const assessmentLocation = routerLocation.state?.assessmentLocation as [number, number] | undefined;
  const customLocationName = routerLocation.state?.locationName as string | undefined;

  const { location } = useLocation();
  const { settings } = useSettings();
  const {
    assessments,
    highestRisk,
    alertEventState,
    weatherData,
    fireTelemetry,
    hydrologyTelemetry,
    seismicTelemetry,
    lastUpdated,
    isLoading,
    isOffline,
    hasData,
    dataQuality,
    refreshAll
  } = useEarlyWarning(5.0, assessmentLocation, customLocationName);

  // Selected assessment for deep-dive inspection (defaults to overall/highest hazard)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('overall');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Map user role from Settings to Audience ('citizen' -> 'Citizen', 'volunteer' -> 'Responder')
  const defaultAudience: Audience = useMemo(() => {
    return settings.role === 'volunteer' ? 'Responder' : 'Citizen';
  }, [settings.role]);

  const activeAssessment: HazardRiskAssessment = useMemo(() => {
    if (selectedAssessmentId === 'overall') return assessments.overall;
    if (selectedAssessmentId === 'flood') return assessments.flood;
    if (selectedAssessmentId === 'fire') return assessments.fire;
    if (selectedAssessmentId === 'earthquake') return assessments.earthquake;
    if (selectedAssessmentId === 'cyclone') return assessments.cyclone;
    return highestRisk;
  }, [selectedAssessmentId, assessments, highestRisk]);

  const handleViewOnMap = (targetAssessment: HazardRiskAssessment) => {
    const radius = targetAssessment.impactRadiusKm || 5;
    const zoomLevel = radius > 25 ? 10 : radius > 12 ? 11 : 12;

    navigate('/app/map', {
      state: {
        center: targetAssessment.centerCoordinates,
        zoom: zoomLevel,
        earlyWarningZone: targetAssessment,
        fireTelemetry
      }
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const getFreshnessClass = (freshness: string) => {
    switch (freshness.toLowerCase()) {
      case 'fresh': return 'fresh';
      case 'aging': return 'aging';
      case 'stale': return 'stale';
      default: return 'unavailable';
    }
  };

  return (
    <div className="early-warning-page-wrapper">
      {/* 1. Header Section */}
      <header className="early-warning-header">
        <div className="early-warning-header-left">
          <h1 className="early-warning-title">Early Warning Center</h1>
          <p className="early-warning-subtitle">
            Real-time multi-hazard risk assessment and early warning
          </p>
        </div>

        <div className="early-warning-header-right">
          {/* Real-Time / Assessment Location Pill */}
          {assessmentLocation ? (
            <div className="ew-location-pill" style={{ borderColor: 'rgba(249, 115, 22, 0.4)', background: 'rgba(249, 115, 22, 0.1)' }}>
              <MapPin size={13} className="text-orange-400 flex-shrink-0 animate-pulse" />
              <span className="truncate max-w-[220px] font-bold text-orange-200">
                ASSESSMENT: {customLocationName || `${assessmentLocation[0].toFixed(4)}°N, ${assessmentLocation[1].toFixed(4)}°E`}
              </span>
              <button
                type="button"
                onClick={() => navigate('/app/map')}
                className="ml-1 text-[10px] bg-orange-500/20 hover:bg-orange-500/40 px-1.5 py-0.5 rounded text-orange-200 cursor-pointer"
                title="Return to Disaster Map"
              >
                Map
              </button>
            </div>
          ) : (
            <div className="ew-location-pill">
              <MapPin size={13} className="text-zinc-400 flex-shrink-0" />
              <span className="truncate max-w-[260px] sm:max-w-xs">{location.address || (location.coords ? `${location.coords.latitude.toFixed(3)}°N, ${location.coords.longitude.toFixed(3)}°E` : 'Live GPS Location')}</span>
            </div>
          )}

          {/* Data Freshness Indicator */}
          <div className={`ew-freshness-pill ${getFreshnessClass(dataQuality.freshness)}`}>
            <Radio size={11} className={dataQuality.freshness === 'Fresh' ? 'animate-pulse' : ''} />
            <span>{dataQuality.freshness} TELEMETRY</span>
          </div>

          {/* Last Updated Pill */}
          {lastUpdated && (
            <div className="ew-location-pill text-[11px] text-zinc-400">
              <Clock size={11} className="flex-shrink-0" />
              <span>{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            className="ew-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            title="Refresh All Early Warning Telemetry"
          >
            <RefreshCw size={13} className={isRefreshing || isLoading ? 'animate-spin' : ''} />
            <span>{isRefreshing || isLoading ? 'Syncing...' : 'Live Sync'}</span>
          </button>
        </div>
      </header>

      {/* 2. Compact Live Sensor Status Strip */}
      <LiveDataStatusPanel
        dataQuality={dataQuality}
        weatherData={weatherData}
        fireTelemetry={fireTelemetry}
        hydrologyTelemetry={hydrologyTelemetry}
        seismicTelemetry={seismicTelemetry}
        lastUpdated={lastUpdated}
        isLoading={isRefreshing || isLoading}
        onRefresh={handleRefresh}
      />

      {/* 3. Data Quality & Offline Advisory Banners */}
      {isOffline && hasData && (
        <div className="ew-data-quality-banner">
          <WifiOff size={16} className="text-amber-400 flex-shrink-0" />
          <span>
            <strong>OFFLINE:</strong> Risk assessment based on last synchronized data. Live sensor connection paused.
          </span>
        </div>
      )}

      {isOffline && !hasData && (
        <div className="ew-data-quality-banner critical-notice">
          <AlertOctagon size={16} className="text-red-400 flex-shrink-0" />
          <span>
            <strong>OFFLINE:</strong> Risk assessment unavailable offline (no prior synchronized observations found).
          </span>
        </div>
      )}

      {/* 4. Top Hero Section: Risk Dial Gauge + Action Bulletin */}
      <section className="ew-top-hero-grid">
        {/* Left: Dual Risk / Confidence Gauge */}
        <RiskGauge
          riskScore={activeAssessment.riskScore}
          confidence={activeAssessment.confidence}
          riskLevel={activeAssessment.riskLevel}
          warningStage={activeAssessment.warningStage}
          hazardTitle={selectedAssessmentId === 'overall' ? 'COMPOSITE LOCAL RISK' : `${activeAssessment.hazardType.toUpperCase()} HAZARD RISK`}
        />

        {/* Right: Early Warning Bulletin & Action Protocols */}
        <EarlyWarningBulletin
          assessment={activeAssessment}
          defaultAudience={defaultAudience}
          eventState={alertEventState}
          onViewOnMap={handleViewOnMap}
        />
      </section>

      {/* 5. Multi-Hazard Category Grid */}
      <section className="multi-hazard-section">
        <div className="section-header-row">
          <h2 className="section-main-heading">MULTI-HAZARD RISK ASSESSMENTS</h2>
          <span className="text-xs text-zinc-400">
            Click any hazard card below to inspect underlying evidence & action protocols
          </span>
        </div>

        <div className="multi-hazard-cards-grid">
          {/* Flood Card */}
          <HazardRiskCard
            assessment={assessments.flood}
            isSelected={selectedAssessmentId === 'flood'}
            onSelect={() => setSelectedAssessmentId((prev: string) => prev === 'flood' ? 'overall' : 'flood')}
          />

          {/* Fire Card */}
          <HazardRiskCard
            assessment={assessments.fire}
            isSelected={selectedAssessmentId === 'fire'}
            onSelect={() => setSelectedAssessmentId((prev: string) => prev === 'fire' ? 'overall' : 'fire')}
          />

          {/* Earthquake (Detected Seismic Activity) Card */}
          <HazardRiskCard
            assessment={assessments.earthquake}
            isSelected={selectedAssessmentId === 'earthquake'}
            onSelect={() => setSelectedAssessmentId((prev: string) => prev === 'earthquake' ? 'overall' : 'earthquake')}
          />

          {/* Cyclone / Gale Storm Card */}
          <HazardRiskCard
            assessment={assessments.cyclone}
            isSelected={selectedAssessmentId === 'cyclone'}
            onSelect={() => setSelectedAssessmentId((prev: string) => prev === 'cyclone' ? 'overall' : 'cyclone')}
          />
        </div>
      </section>

      {/* 6. Direct Evidence & Signal Proof */}
      <section className="evidence-section">
        <EvidenceSources
          sources={activeAssessment.evidenceSources}
          assessmentTitle={selectedAssessmentId === 'overall' ? 'Unified Multi-Hazard Consensus' : activeAssessment.hazardType}
        />
      </section>
    </div>
  );
};

export default EarlyWarning;
