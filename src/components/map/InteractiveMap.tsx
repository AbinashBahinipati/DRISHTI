import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapStyles.css';
import { Globe, Plus, Minus, Crosshair, Layers } from 'lucide-react';

interface InteractiveMapProps {
  center: [number, number];
  zoom?: number;
  children?: React.ReactNode;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
  onMapDoubleClick?: (lat: number, lng: number) => void;
}

export type MapLayerType = 'street' | 'satellite' | 'dark';

// Fix for default Leaflet icons missing in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TILE_LAYERS: Record<MapLayerType, { url: string; attribution: string; maxZoom: number; subdomains?: string[] }> = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 19
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c', 'd']
  }
};

const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  const prevCenterRef = useRef<[number, number] | null>(null);
  const prevZoomRef = useRef<number | null>(null);

  const [lat, lng] = center;

  useEffect(() => {
    const prev = prevCenterRef.current;
    const prevZ = prevZoomRef.current;

    const hasCoordsChanged = !prev || Math.abs(prev[0] - lat) > 0.00001 || Math.abs(prev[1] - lng) > 0.00001;
    const hasZoomChanged = prevZ !== null && prevZ !== zoom;

    if (hasCoordsChanged || hasZoomChanged) {
      prevCenterRef.current = [lat, lng];
      prevZoomRef.current = zoom;
      map.setView([lat, lng], zoom, { animate: true });
    }

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    });

    resizeObserver.observe(map.getContainer());

    const timeout1 = setTimeout(() => map.invalidateSize(), 100);
    const timeout2 = setTimeout(() => map.invalidateSize(), 400);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [lat, lng, zoom, map]);
  return null;
};

// Handle Map Click & Double-Click Events to Pinpoint & Assess Location
const MapClickHandler = ({
  onMapClick,
  onMapDoubleClick
}: {
  onMapClick?: (lat: number, lng: number) => void;
  onMapDoubleClick?: (lat: number, lng: number) => void;
}) => {
  const map = useMap();

  useEffect(() => {
    map.doubleClickZoom.disable();
  }, [map]);

  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
    dblclick(e) {
      if (onMapDoubleClick) {
        onMapDoubleClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
};

// Top-Right Tactical Controls Portal inside Leaflet Control Container
const LeafletTopRightControls: React.FC<{
  mapType: MapLayerType;
  onToggleSatellite: () => void;
}> = ({
  mapType,
  onToggleSatellite
}) => {
  const map = useMap();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const mapEl = map.getContainer();
    const corner = mapEl.querySelector('.leaflet-top.leaflet-right') as HTMLElement;
    if (corner) {
      setContainer(corner);
    }
  }, [map]);

  if (!container) return null;

  const handleLocate = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { animate: true, duration: 1.2 });
        },
        () => {
          map.locate({ setView: true, maxZoom: 16 });
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      map.locate({ setView: true, maxZoom: 16 });
    }
  };

  return ReactDOM.createPortal(
    <div className="leaflet-control drishti-map-controls-container">
      {/* Tactical Button Controls (Zoom +, Zoom -, Locate Me, Toggle Satellite) */}
      <div className="drishti-tool-stack">
        {/* Zoom In & Out */}
        <div className="drishti-tool-group">
          <button
            type="button"
            className="drishti-tool-btn"
            onClick={() => map.zoomIn()}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            className="drishti-tool-btn"
            onClick={() => map.zoomOut()}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus size={18} />
          </button>
        </div>

        {/* Locate Me Button */}
        <div className="drishti-tool-group">
          <button
            type="button"
            className="drishti-tool-btn"
            onClick={handleLocate}
            title="Center on My Exact GPS Location"
            aria-label="Locate Me"
          >
            <Crosshair size={18} />
          </button>
        </div>

        {/* Quick Satellite Toggle Button */}
        <div className="drishti-tool-group">
          <button
            type="button"
            className={`drishti-tool-btn ${mapType === 'satellite' ? 'active' : ''}`}
            onClick={onToggleSatellite}
            title={mapType === 'satellite' ? 'Switch back to Street Map' : 'Switch to Satellite Map'}
            aria-label="Toggle Satellite"
          >
            {mapType === 'satellite' ? (
              <Globe size={18} className="text-orange-400 animate-spin" />
            ) : (
              <Layers size={18} />
            )}
          </button>
        </div>
      </div>
    </div>,
    container
  );
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center,
  zoom = 13,
  children,
  className = "",
  onMapClick,
  onMapDoubleClick
}) => {
  const [mapType, setMapType] = useState<MapLayerType>('street');

  const toggleSatellite = () => {
    setMapType(prev => (prev === 'satellite' ? 'street' : 'satellite'));
  };

  return (
    <div className={`map-wrapper absolute inset-0 ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        doubleClickZoom={false}
        style={{ width: '100%', height: '100%', background: '#090b0c', zIndex: 1 }}
        attributionControl={false}
      >
        <MapClickHandler onMapClick={onMapClick} onMapDoubleClick={onMapDoubleClick} />
        
        {/* Native React-Leaflet TileLayer with dynamic key for instantaneous clean layer replacement */}
        <TileLayer
          key={mapType}
          url={TILE_LAYERS[mapType].url}
          attribution={TILE_LAYERS[mapType].attribution}
          maxZoom={TILE_LAYERS[mapType].maxZoom}
          subdomains={TILE_LAYERS[mapType].subdomains || ['a', 'b', 'c']}
        />

        <MapUpdater center={center} zoom={zoom} />
        
        {/* Top-Right Tactical Controls: Zoom + Locate + Satellite Toggle */}
        <LeafletTopRightControls
          mapType={mapType}
          onToggleSatellite={toggleSatellite}
        />

        {children}
      </MapContainer>
    </div>
  );
};

export default InteractiveMap;
