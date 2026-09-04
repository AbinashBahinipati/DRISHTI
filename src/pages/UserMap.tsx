import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
  Building2,
  Flame,
  Activity,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  X,
  Thermometer,
  CloudRain,
  Wind,
  Navigation,
  Compass,
  Loader2,
  AlertCircle,
  Home as HomeIcon,
  Map as MapIcon,
  Bell,
  LifeBuoy,
  BookOpen,
  Waves,
  ShieldAlert,
  Flag
} from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { useNearbyFacilities, calculateDistance } from '../hooks/useNearbyFacilities';
import { useLocationAssessment } from '../hooks/useLocationAssessment';
import { InteractiveMap } from '../components/map/InteractiveMap';
import { MapMarker } from '../components/map/MapMarker';
import { MapPopup } from '../components/map/MapPopup';
import { MapRouting } from '../components/map/MapRouting';
import '../styles/UserMap.css';

export const UserMap: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useLocation();

  // Facility filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'hospital' | 'police' | 'fire' | 'shelter'>('all');
  
  // Navigation route target state
  const [routeTarget, setRouteTarget] = useState<[number, number] | null>(null);
  const [routeTitle, setRouteTitle] = useState<string>('');

  // 1. Real GPS User Coordinates
  const hasUserCoords = !!(location.coords && typeof location.coords.latitude === 'number' && typeof location.coords.longitude === 'number');
  const userLat = location.coords?.latitude ?? 20.4625;
  const userLon = location.coords?.longitude ?? 85.8828;
  const userAddress = location.address || (hasUserCoords ? `${userLat.toFixed(3)}°N, ${userLon.toFixed(3)}°E` : null);
  const mapCenter = useMemo<[number, number]>(() => [userLat, userLon], [userLat, userLon]);

  // 2. Real Facilities (OSM Overpass)
  const { facilities } = useNearbyFacilities(userLat, userLon, 15);

  // 3. Location Assessment Hook
  const {
    selectedCoords,
    isLoading: isAssessmentLoading,
    assessmentResult,
    assessLocation,
    clearAssessment
  } = useLocationAssessment();

  // Handle map double-click to pinpoint & assess safety
  const handleMapDoubleClick = (lat: number, lng: number) => {
    assessLocation(lat, lng);
  };

  // Start real turn-by-turn road navigation
  const handleStartNavigation = (targetCoords: [number, number], title?: string) => {
    setRouteTarget(targetCoords);
    setRouteTitle(title || assessmentResult?.locationName || 'Pinpoint Location');
    clearAssessment();
  };

  // Close active navigation route
  const handleCloseNavigation = () => {
    setRouteTarget(null);
    setRouteTitle('');
  };

  // Close assessment drawer
  const handleCloseAssessment = () => {
    clearAssessment();
  };

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'hospital') return f.type === 'hospital' || f.type === 'pharmacy';
      return f.type === activeFilter;
    });
  }, [facilities, activeFilter]);

  // Safety Status Logic for Assessment Panel
  const getSafetyStatus = () => {
    if (!assessmentResult) return null;
    const score = assessmentResult.overallRisk;
    if (score >= 70 || assessmentResult.warningStage === 'Emergency' || assessmentResult.warningStage === 'Warning') {
      return {
        label: 'TAKE ACTION',
        desc: 'A significant hazard is affecting this area.',
        className: 'status-action',
        icon: <AlertOctagon size={18} />
      };
    }
    if (score >= 45 || assessmentResult.warningStage === 'Watch') {
      return {
        label: 'BE ALERT',
        desc: 'Elevated hazard detected near this location.',
        className: 'status-alert',
        icon: <AlertTriangle size={18} />
      };
    }
    return {
      label: 'NORMAL',
      desc: 'No immediate hazards detected at this location.',
      className: 'status-normal',
      icon: <ShieldCheck size={18} />
    };
  };

  const safetyStatus = getSafetyStatus();

  // Check if any telemetry source failed
  const sourceStatuses = assessmentResult?.sourceStatuses;
  const hasSourceFailure = sourceStatuses && (
    sourceStatuses.weather === 'unavailable' ||
    sourceStatuses.firms === 'unavailable' ||
    sourceStatuses.usgs === 'unavailable' ||
    sourceStatuses.glofas === 'unavailable'
  );

  // Distance from user GPS to assessed pin
  const distanceToPinKm = selectedCoords && hasUserCoords
    ? calculateDistance(userLat, userLon, selectedCoords.latitude, selectedCoords.longitude)
    : undefined;

  // Helper to pick marker icon by type
  const getFacilityIcon = (type: string) => {
    switch (type) {
      case 'hospital':
      case 'pharmacy':
        return <Activity size={16} className="text-rose-400" />;
      case 'police':
        return <ShieldAlert size={16} className="text-sky-400" />;
      case 'fire':
        return <Flame size={16} className="text-orange-400" />;
      case 'shelter':
        return <Building2 size={16} className="text-emerald-400" />;
      default:
        return <Building2 size={16} className="text-zinc-300" />;
    }
  };

  return (
    <div className="user-map-page">
      {/* 1. Header */}
      <header className="user-map-header">
        <div className="user-map-header-left">
          <button
            type="button"
            onClick={() => navigate('/user')}
            className="user-map-back-btn"
            title="Return to Citizen Dashboard"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="user-map-header-title-wrap">
            <h1 className="user-map-header-title">Citizen Safety Map</h1>
            <span className={`user-map-location-sub ${!hasUserCoords ? 'unavailable' : ''}`}>
              <MapPin size={11} className="flex-shrink-0" />
              <span>
                {hasUserCoords ? (userAddress || 'GPS Location Active') : 'GPS Unavailable (Tap map to assess)'}
              </span>
            </span>
          </div>
        </div>

        {/* Facility Category Filter Bar */}
        <div className="user-map-filter-bar">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`user-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('hospital')}
            className={`user-filter-pill ${activeFilter === 'hospital' ? 'active' : ''}`}
          >
            <Activity size={12} />
            <span>Hospitals</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('shelter')}
            className={`user-filter-pill ${activeFilter === 'shelter' ? 'active' : ''}`}
          >
            <Building2 size={12} />
            <span>Shelters</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('police')}
            className={`user-filter-pill ${activeFilter === 'police' ? 'active' : ''}`}
          >
            <ShieldAlert size={12} />
            <span>Police</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('fire')}
            className={`user-filter-pill ${activeFilter === 'fire' ? 'active' : ''}`}
          >
            <Flame size={12} />
            <span>Fire</span>
          </button>
        </div>
      </header>

      {/* 2. Interactive Map Container */}
      <div className="user-map-canvas-container">
        {/* Floating Active Navigation Top Banner */}
        {routeTarget && (
          <div className="user-active-route-banner">
            <div className="user-active-route-info">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <span className="user-active-route-title">
                Route to {routeTitle ? `Pinpoint: ${routeTitle}` : 'Selected Destination'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCloseNavigation}
              className="user-cancel-route-btn"
              title="Cancel Navigation Route"
            >
              <X size={14} />
              <span>Cancel Navigation</span>
            </button>
          </div>
        )}

        {!selectedCoords && !routeTarget && (
          <div className="user-map-hint-pill">
            <Compass size={13} className="text-emerald-400 animate-spin-slow" />
            <span>Double-click anywhere on the map to assess location safety</span>
          </div>
        )}

        <InteractiveMap
          center={mapCenter}
          zoom={13}
          onMapDoubleClick={handleMapDoubleClick}
        >
          {/* User's GPS Location Pin */}
          {hasUserCoords && (
            <MapMarker
              position={[userLat, userLon]}
              icon={<MapPin size={18} className="text-emerald-400 drop-shadow-md" />}
              type="user"
              isUser={true}
              pulse={true}
            >
              <MapPopup
                title="Your Current Location"
                type="GPS CITIZEN POSITION"
                metadata={[
                  { label: 'Coordinates', value: `${userLat.toFixed(4)}°N, ${userLon.toFixed(4)}°E` },
                  ...(userAddress ? [{ label: 'Area', value: userAddress }] : []),
                  { label: 'Accuracy', value: 'High Accuracy GPS' }
                ]}
              />
            </MapMarker>
          )}

          {/* Clicked Assessment Marker */}
          {selectedCoords && (
            <MapMarker
              position={[selectedCoords.latitude, selectedCoords.longitude]}
              icon={<MapPin size={20} className="text-rose-400 drop-shadow-lg" />}
              type="target"
              isTarget={true}
              pulse={true}
            >
              <MapPopup
                title={assessmentResult?.locationName || "Assessed Pinpoint"}
                type="CLICK-TO-ASSESS TARGET"
                distance={distanceToPinKm}
                metadata={[
                  { label: 'Coordinates', value: `${selectedCoords.latitude.toFixed(4)}°N, ${selectedCoords.longitude.toFixed(4)}°E` },
                  { label: 'Distance', value: distanceToPinKm !== undefined ? `${distanceToPinKm.toFixed(1)} km away` : 'Distance unavailable' }
                ]}
              />
            </MapMarker>
          )}

          {/* Destination Flag Marker when routing */}
          {routeTarget && (
            <MapMarker
              position={routeTarget}
              icon={<Flag size={18} className="text-white drop-shadow-md fill-white" />}
              type="destination"
              isTarget={true}
              pulse={true}
            >
              <MapPopup
                title={routeTitle ? `Destination: ${routeTitle}` : "Route Destination"}
                type="NAVIGATION TARGET"
              />
            </MapMarker>
          )}

          {/* Real Turn-by-Turn Road Navigation Route to Pinpoint / Facility */}
          {routeTarget && hasUserCoords && (
            <MapRouting
              start={[userLat, userLon]}
              end={routeTarget}
              destinationTitle={routeTitle ? `Pinpoint: ${routeTitle}` : 'Route Destination'}
              urgency="Medium"
              onClose={handleCloseNavigation}
            />
          )}

          {/* Real Nearby Facilities Markers */}
          {filteredFacilities.map(f => {
            const facilityDistanceKm = hasUserCoords
              ? calculateDistance(userLat, userLon, f.lat, f.lon)
              : undefined;

            return (
              <MapMarker
                key={f.id}
                position={[f.lat, f.lon]}
                icon={getFacilityIcon(f.type)}
                type={f.type === 'hospital' ? 'hospital' : f.type === 'police' ? 'police' : f.type === 'fire' ? 'fire' : 'shelter'}
              >
                <MapPopup
                  title={f.name}
                  type={f.type.toUpperCase()}
                  distance={facilityDistanceKm}
                  metadata={[
                    { label: 'Distance', value: facilityDistanceKm !== undefined ? `${facilityDistanceKm.toFixed(1)} km` : 'Distance unavailable' },
                    ...(f.address ? [{ label: 'Address', value: f.address }] : []),
                    ...(f.phone ? [{ label: 'Phone', value: f.phone }] : [])
                  ]}
                  actionLabel="NAVIGATE HERE"
                  onNavigate={() => handleStartNavigation([f.lat, f.lon], f.name)}
                />
              </MapMarker>
            );
          })}
        </InteractiveMap>
      </div>

      {/* 3. Floating Location Assessment Bottom Sheet / Drawer */}
      {selectedCoords && (
        <section className="user-assessment-drawer" aria-label="Location Safety Assessment Result">
          {/* Header */}
          <div className="user-assessment-header">
            <div>
              <h3 className="user-assessment-location-title">
                {assessmentResult?.locationName || 'Assessing Location...'}
              </h3>
              <p className="user-assessment-coords">
                {selectedCoords.latitude.toFixed(4)}°N, {selectedCoords.longitude.toFixed(4)}°E
                {distanceToPinKm !== undefined ? ` • ~${distanceToPinKm.toFixed(1)} km from you` : ' • Distance unavailable'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCloseAssessment}
              className="user-assessment-close-btn"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Loading Progress State */}
          {isAssessmentLoading && (
            <div className="user-loading-progress-box">
              <h4 className="user-loading-title">
                <Loader2 size={16} className="animate-spin text-emerald-400" />
                <span>Checking this location...</span>
              </h4>

              <div className="flex flex-col gap-1.5 mt-1">
                <div className="user-loading-step-row">
                  <span>Fetching live weather...</span>
                  <span className="user-loading-step-status step-loading">Scanning...</span>
                </div>

                <div className="user-loading-step-row">
                  <span>Checking active fires...</span>
                  <span className="user-loading-step-status step-loading">Scanning...</span>
                </div>

                <div className="user-loading-step-row">
                  <span>Checking seismic activity...</span>
                  <span className="user-loading-step-status step-loading">Scanning...</span>
                </div>

                <div className="user-loading-step-row">
                  <span>Checking river conditions...</span>
                  <span className="user-loading-step-status step-loading">Scanning...</span>
                </div>
              </div>
            </div>
          )}

          {/* Assessment Result Details */}
          {!isAssessmentLoading && assessmentResult && safetyStatus && (
            <>
              {/* Safety Status Banner */}
              <div className={`user-safety-status-banner ${safetyStatus.className}`}>
                <div className="user-safety-status-badge">
                  {safetyStatus.icon}
                  <span>{safetyStatus.label}</span>
                </div>
                <span className="text-xs font-semibold">{safetyStatus.desc}</span>
              </div>

              {/* Simple Hazards Grid */}
              <div className="user-hazards-mini-grid">
                <div className="user-hazard-mini-box">
                  <span className="user-hazard-mini-label">
                    <Waves size={11} className="text-cyan-400" />
                    Flood
                  </span>
                  <span className="user-hazard-mini-status">
                    {assessmentResult.assessments.flood.warningStage === 'Normal' ? 'Safe' : assessmentResult.assessments.flood.warningStage}
                  </span>
                </div>

                <div className="user-hazard-mini-box">
                  <span className="user-hazard-mini-label">
                    <Flame size={11} className="text-rose-400" />
                    Fire
                  </span>
                  <span className="user-hazard-mini-status">
                    {assessmentResult.assessments.fire.warningStage === 'Normal' ? 'Safe' : assessmentResult.assessments.fire.warningStage}
                  </span>
                </div>

                <div className="user-hazard-mini-box">
                  <span className="user-hazard-mini-label">
                    <Activity size={11} className="text-amber-400" />
                    Earthquake
                  </span>
                  <span className="user-hazard-mini-status">
                    {assessmentResult.assessments.earthquake.warningStage === 'Normal' ? 'Normal' : assessmentResult.assessments.earthquake.warningStage}
                  </span>
                </div>

                <div className="user-hazard-mini-box">
                  <span className="user-hazard-mini-label">
                    <Wind size={11} className="text-teal-400" />
                    Cyclone
                  </span>
                  <span className="user-hazard-mini-status">
                    {assessmentResult.assessments.cyclone.warningStage === 'Normal' ? 'Safe' : assessmentResult.assessments.cyclone.warningStage}
                  </span>
                </div>
              </div>

              {/* Current Weather Summary at Clicked Location */}
              <div className="user-assessment-weather-row">
                <div className="user-weather-item">
                  <Thermometer size={13} className="text-amber-400" />
                  <span>
                    Temp: {typeof assessmentResult.weatherSummary?.temperature === 'number'
                      ? `${assessmentResult.weatherSummary.temperature.toFixed(1)}°C`
                      : 'Data unavailable'}
                  </span>
                </div>

                <div className="user-weather-item">
                  <CloudRain size={13} className="text-sky-400" />
                  <span>
                    Rain: {typeof assessmentResult.weatherSummary?.precipitation === 'number'
                      ? `${assessmentResult.weatherSummary.precipitation.toFixed(1)} mm`
                      : 'Data unavailable'}
                  </span>
                </div>

                <div className="user-weather-item">
                  <Wind size={13} className="text-teal-400" />
                  <span>
                    Wind: {typeof assessmentResult.weatherSummary?.windSpeed === 'number'
                      ? `${assessmentResult.weatherSummary.windSpeed.toFixed(0)} km/h`
                      : 'Data unavailable'}
                  </span>
                </div>
              </div>

              {/* Data Failure Warning if any source is offline */}
              {hasSourceFailure && (
                <div className="user-data-warning-pill">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  <span>Some live data is currently unavailable.</span>
                </div>
              )}

              {/* Navigate to Pin Button */}
              {hasUserCoords && (
                <button
                  type="button"
                  onClick={() => handleStartNavigation([selectedCoords.latitude, selectedCoords.longitude], assessmentResult.locationName)}
                  className="user-navigate-to-pin-btn"
                >
                  <Navigation size={14} />
                  <span>Navigate From My Location</span>
                </button>
              )}

              {/* Footer Timestamp & Freshness */}
              <div className="user-assessment-footer">
                <span>Evaluated: {new Date(assessmentResult.evaluatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span>Freshness: {assessmentResult.freshness}</span>
              </div>
            </>
          )}
        </section>
      )}

      {/* 4. Citizen Bottom Navigation Bar */}
      <nav className="user-bottom-nav" aria-label="Citizen Navigation Bar">
        <button
          type="button"
          className="user-nav-item"
          onClick={() => navigate('/user')}
        >
          <HomeIcon size={18} />
          <span>HOME</span>
        </button>

        <button
          type="button"
          className="user-nav-item active"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <MapIcon size={18} />
          <span>MAP</span>
        </button>

        <button
          type="button"
          className="user-nav-item"
          onClick={() => navigate('/user/alerts')}
        >
          <Bell size={18} />
          <span>ALERTS</span>
        </button>

        <button
          type="button"
          className="user-nav-item"
          onClick={() => navigate('/user/help')}
        >
          <LifeBuoy size={18} />
          <span>HELP</span>
        </button>

        <button
          type="button"
          className="user-nav-item"
          onClick={() => navigate('/user/prepare')}
        >
          <BookOpen size={18} />
          <span>PREPARE</span>
        </button>
      </nav>
    </div>
  );
};

export default UserMap;
