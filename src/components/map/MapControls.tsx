import React from 'react';
import { Plus, Minus, Crosshair, Layers, Globe } from 'lucide-react';
import L from 'leaflet';
import type { MapLayerType } from './InteractiveMap';

interface MapControlsProps {
  map: L.Map;
  currentLayer?: MapLayerType;
  onToggleSatellite?: () => void;
  onToggleLayerMenu?: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  map,
  currentLayer = 'street',
  onToggleSatellite,
  onToggleLayerMenu
}) => {
  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleLocate = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.flyTo([position.coords.latitude, position.coords.longitude], 16, {
            animate: true,
            duration: 1.2
          });
        },
        () => {
          map.locate({ setView: true, maxZoom: 16 });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    } else {
      map.locate({ setView: true, maxZoom: 16 });
    }
  };

  const isSatellite = currentLayer === 'satellite';

  return (
    <div className="map-custom-controls">
      {/* Zoom Controls */}
      <div className="map-control-group">
        <button
          className="map-control-btn"
          onClick={handleZoomIn}
          aria-label="Zoom In"
          title="Zoom In"
        >
          <Plus size={16} />
        </button>
        <button
          className="map-control-btn"
          onClick={handleZoomOut}
          aria-label="Zoom Out"
          title="Zoom Out"
        >
          <Minus size={16} />
        </button>
      </div>

      {/* Recenter / Geolocation */}
      <div className="map-control-group">
        <button
          className="map-control-btn"
          onClick={handleLocate}
          aria-label="Locate Me"
          title="Recenter to My Location"
        >
          <Crosshair size={16} />
        </button>
      </div>

      {/* Satellite / Layer Toggle Button */}
      <div className="map-control-group">
        <button
          className={`map-control-btn transition-all ${isSatellite
              ? 'bg-accent/25 text-accent border-accent/40 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
              : 'hover:text-white'
            }`}
          onClick={onToggleSatellite || onToggleLayerMenu}
          aria-label="Toggle Satellite"
          title={isSatellite ? "Switch back to Street Map" : "Switch to Satellite Imagery"}
        >
          {isSatellite ? <Globe size={16} className="animate-spin-slow text-accent" /> : <Layers size={16} />}
        </button>
      </div>
    </div>
  );
};
