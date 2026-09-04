import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
  Building2,
  Flame,
  Activity,
  Phone,
  Navigation,
  Compass,
  Home as HomeIcon,
  Map as MapIcon,
  Bell,
  LifeBuoy,
  BookOpen,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { useNearbyFacilities, calculateDistance, type Facility } from '../hooks/useNearbyFacilities';
import '../styles/UserHelp.css';

type FacilityTab = 'all' | 'hospital' | 'police' | 'fire' | 'shelter';

export const UserHelp: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useLocation();

  // Active facility tab
  const [activeTab, setActiveTab] = useState<FacilityTab>('all');

  // 1. Real GPS User Coordinates
  const hasUserCoords = !!(location.coords && typeof location.coords.latitude === 'number' && typeof location.coords.longitude === 'number');
  const userLat = location.coords?.latitude ?? 20.4625;
  const userLon = location.coords?.longitude ?? 85.8828;
  const userAddress = location.address || (hasUserCoords ? `${userLat.toFixed(3)}°N, ${userLon.toFixed(3)}°E` : 'Bhubaneswar, Odisha');

  // 2. Real Facilities (OSM Overpass)
  const { facilities, loading: facilitiesLoading } = useNearbyFacilities(userLat, userLon, 15);

  // 3. Process each facility with individual Haversine distance calculation and sorting
  const processedFacilities = useMemo(() => {
    return facilities
      .filter(f => typeof f.lat === 'number' && typeof f.lon === 'number' && !isNaN(f.lat) && !isNaN(f.lon))
      .map(f => {
        const dist = hasUserCoords
          ? calculateDistance(userLat, userLon, f.lat, f.lon)
          : undefined;
        return {
          ...f,
          calculatedDistance: dist
        };
      })
      .sort((a, b) => {
        if (a.calculatedDistance === undefined) return 1;
        if (b.calculatedDistance === undefined) return -1;
        return a.calculatedDistance - b.calculatedDistance;
      });
  }, [facilities, userLat, userLon, hasUserCoords]);

  // Filter facilities by active tab
  const filteredFacilities = useMemo(() => {
    if (activeTab === 'all') return processedFacilities;
    if (activeTab === 'hospital') return processedFacilities.filter(f => f.type === 'hospital' || f.type === 'pharmacy');
    return processedFacilities.filter(f => f.type === activeTab);
  }, [processedFacilities, activeTab]);

  // Helper to pick facility icon and style
  const getFacilityStyle = (type: Facility['type']) => {
    switch (type) {
      case 'hospital':
      case 'pharmacy':
        return {
          icon: <Activity size={20} />,
          className: 'type-hospital',
          label: 'Hospital / Medical Centre'
        };
      case 'police':
        return {
          icon: <ShieldAlert size={20} />,
          className: 'type-police-dept',
          label: 'Police Station'
        };
      case 'fire':
        return {
          icon: <Flame size={20} />,
          className: 'type-fire-dept',
          label: 'Fire Station'
        };
      case 'shelter':
        return {
          icon: <Building2 size={20} />,
          className: 'type-shelter-point',
          label: 'Relief Shelter / Evacuation Point'
        };
      default:
        return {
          icon: <Building2 size={20} />,
          className: 'type-shelter-point',
          label: 'Emergency Facility'
        };
    }
  };

  return (
    <div className="user-help-container">
      {/* 1. Header */}
      <header className="user-help-header">
        <div className="user-help-header-left">
          <button
            type="button"
            onClick={() => navigate('/user')}
            className="user-help-back-btn"
            title="Return to Citizen Dashboard"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="user-help-header-title-wrap">
            <h1 className="user-help-header-title">Get Emergency Help</h1>
            <span className="user-help-location-sub">
              <MapPin size={11} className="flex-shrink-0 text-emerald-400" />
              <span>{userAddress}</span>
            </span>
          </div>
        </div>
      </header>

      {/* 2. Main Page Content */}
      <main className="user-help-content">
        {/* Primary Priority: Emergency 112 Dispatch */}
        <section aria-label="National Emergency Dispatch">
          <div className="user-emergency-primary-card">
            <div className="user-emergency-primary-left">
              <div className="user-emergency-pulse-icon">
                <Phone size={26} />
              </div>
              <div>
                <h2 className="user-emergency-primary-title">Emergency 112</h2>
                <p className="user-emergency-primary-desc">
                  National emergency response for police, ambulance, or fire in life-threatening situations (24×7 toll-free).
                </p>
              </div>
            </div>

            <a
              href="tel:112"
              className="user-emergency-primary-btn"
              title="Call National Emergency 112"
            >
              <Phone size={18} />
              <span>Call 112 Now</span>
            </a>
          </div>
        </section>

        {/* Specialized Emergency Helplines Grid */}
        <section aria-label="Direct Emergency Helplines">
          <div className="user-helplines-grid">
            {/* Medical Help: 108 */}
            <a
              href="tel:108"
              className="user-helpline-box type-ambulance"
              title="Call Ambulance 108"
            >
              <div className="user-helpline-info">
                <div className="user-helpline-icon-wrap">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="user-helpline-title">Medical Help</h3>
                  <p className="user-helpline-desc">Direct Ambulance Service</p>
                </div>
              </div>
              <span className="user-helpline-num-pill">108</span>
            </a>

            {/* Police: 112 / 100 */}
            <a
              href="tel:112"
              className="user-helpline-box type-police"
              title="Call Police 112"
            >
              <div className="user-helpline-info">
                <div className="user-helpline-icon-wrap">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="user-helpline-title">Police</h3>
                  <p className="user-helpline-desc">Law Enforcement & Safety</p>
                </div>
              </div>
              <span className="user-helpline-num-pill">112</span>
            </a>

            {/* Fire: 101 */}
            <a
              href="tel:101"
              className="user-helpline-box type-fire"
              title="Call Fire 101"
            >
              <div className="user-helpline-info">
                <div className="user-helpline-icon-wrap">
                  <Flame size={20} />
                </div>
                <div>
                  <h3 className="user-helpline-title">Fire & Rescue</h3>
                  <p className="user-helpline-desc">Fire Brigade Operations</p>
                </div>
              </div>
              <span className="user-helpline-num-pill">101</span>
            </a>
          </div>
        </section>

        {/* Nearby Verified Emergency Facilities (Real OSM Overpass Data) */}
        <section aria-label="Nearby Emergency Facilities">
          <div className="user-help-section-header">
            <h2 className="user-help-section-title">
              <Building2 size={16} className="text-emerald-400" />
              <span>Nearby Emergency Services</span>
            </h2>

            {/* Category Filter Tabs */}
            <div className="user-help-facility-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`user-help-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              >
                All Nearby
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hospital')}
                className={`user-help-tab-btn ${activeTab === 'hospital' ? 'active' : ''}`}
              >
                Hospitals
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('police')}
                className={`user-help-tab-btn ${activeTab === 'police' ? 'active' : ''}`}
              >
                Police
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fire')}
                className={`user-help-tab-btn ${activeTab === 'fire' ? 'active' : ''}`}
              >
                Fire
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('shelter')}
                className={`user-help-tab-btn ${activeTab === 'shelter' ? 'active' : ''}`}
              >
                Shelters
              </button>
            </div>
          </div>

          {/* Facilities List */}
          <div className="user-help-facilities-list">
            {filteredFacilities.length > 0 ? (
              filteredFacilities.map(f => {
                const style = getFacilityStyle(f.type);
                const hasValidPhone = Boolean(f.phone && f.phone.trim().length > 3);

                return (
                  <article
                    key={f.id}
                    className="user-help-facility-card"
                    aria-label={`${f.name} (${style.label})`}
                  >
                    <div className="user-help-facility-card-left">
                      <div className={`user-help-facility-type-icon ${style.className}`}>
                        {style.icon}
                      </div>

                      <div className="user-help-facility-text">
                        <h3 className="user-help-facility-name">{f.name}</h3>
                        <span className="user-help-facility-dist-pill">
                          <MapPin size={11} />
                          <span>
                            {f.calculatedDistance !== undefined
                              ? `${f.calculatedDistance} km away`
                              : 'Distance unavailable'}
                            {' • '}{style.label}
                          </span>
                        </span>
                        {f.address && (
                          <p className="user-help-facility-address">{f.address}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions: Navigate and Call (only if verified phone exists) */}
                    <div className="user-help-facility-actions">
                      {hasValidPhone && (
                        <a
                          href={`tel:${f.phone}`}
                          className="user-help-call-btn"
                          title={`Call ${f.name}`}
                        >
                          <Phone size={13} />
                          <span>Call</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => navigate('/user/map', {
                          state: {
                            center: [f.lat, f.lon]
                          }
                        })}
                        className="user-help-nav-btn"
                        title="Navigate on Citizen Map"
                      >
                        <Navigation size={13} />
                        <span>Navigate</span>
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="user-helpline-box">
                <div className="flex items-center gap-3">
                  <Compass size={18} className="text-emerald-400" />
                  <div>
                    <h4 className="user-helpline-title">
                      {facilitiesLoading ? 'Locating nearest regional emergency facilities...' : 'Scanning Nearby Emergency Facilities'}
                    </h4>
                    <p className="user-helpline-desc">
                      Connecting to regional municipal database. You can also dial 112 for immediate dispatch.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Quick Citizen Incident Report Submission */}
        <section aria-label="Submit Incident Report">
          <div className="user-help-report-banner">
            <div className="user-help-report-text">
              <h3 className="user-help-report-title">Need Rescue, Evacuation, or Relief?</h3>
              <p className="user-help-report-sub">
                Submit an urgent citizen report to municipal emergency coordinators.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/user/report')}
              className="user-help-report-btn"
            >
              <span>Submit Report</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      </main>

      {/* 3. Citizen Bottom Navigation Bar */}
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
          className="user-nav-item"
          onClick={() => navigate('/user/map')}
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
          className="user-nav-item active"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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

export default UserHelp;
