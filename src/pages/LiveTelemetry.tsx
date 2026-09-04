import React, { useEffect } from 'react';
import { useLocation } from '../hooks/useLocation';
import { LiveReadingsCard } from '../components/dashboard/LiveReadingsCard';
import { ConfidenceRadarChart } from '../components/dashboard/ConfidenceRadarChart';
import { ClimateNewsFeed } from '../components/dashboard/ClimateNewsFeed';
import '../styles/LiveTelemetry.css';

export const LiveTelemetry: React.FC = () => {
  const { location, requestLocation } = useLocation();

  useEffect(() => {
    if (location.status === 'prompt') {
      requestLocation();
    }
  }, [location.status, requestLocation]);

  return (
    <div className="telemetry-container max-w-[1400px] mx-auto p-4 md:p-8">
      {/* Main Grid: Left side (Readings & Live News/Seismic Feed), Right side (Hazard Vector Radar) */}
      <div className="telemetry-dashboard-grid">
        
        {/* Left Column (Spans 2 columns) */}
        <div className="telemetry-left-col">
          <div className="telemetry-panel-readings">
            <LiveReadingsCard 
              latitude={location.coords?.latitude}
              longitude={location.coords?.longitude}
              address={location.address}
            />
          </div>
          <div className="telemetry-panel-feed">
            <ClimateNewsFeed />
          </div>
        </div>

        {/* Right Column (Spans 1 column) */}
        <div className="telemetry-right-col">
          <div className="telemetry-panel-radar">
            <ConfidenceRadarChart 
              latitude={location.coords?.latitude}
              longitude={location.coords?.longitude}
            />
          </div>
        </div>
        
      </div>
    </div>
  );
};

