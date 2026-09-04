import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Waves, Wind, Flame, Mountain, CloudRain,
  Activity, Sun, Building, Map, AlertTriangle,
  MapPin, Camera, X, CheckCircle2, ChevronRight,
  ShieldAlert, Loader2, MessageSquare, Upload,
  TriangleAlert, CheckCircle, AlertCircle, ArrowLeft
} from 'lucide-react';
import { useLocation as useReactRouterLocation, useNavigate } from 'react-router-dom';
import { useLocation } from '../hooks/useLocation';
import { useReports } from '../hooks/useReports';
import { useUserAuth } from '../hooks/useUserAuth';
import type { ReportType, ReportUrgency, IncidentReport } from '../types/report';
import '../styles/ReportIncident.css';

interface IncidentTypeConfig {
  id: ReportType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const INCIDENT_TYPES: IncidentTypeConfig[] = [
  { id: 'Flood', label: 'Flood /\nWaterlogging', icon: <Waves size={26} />, color: '#38bdf8' },
  { id: 'Cyclone', label: 'Cyclone /\nWind', icon: <Wind size={26} />, color: '#7dd3fc' },
  { id: 'Fire', label: 'Fire', icon: <Flame size={26} />, color: '#ef4444' },
  { id: 'Landslide', label: 'Landslide', icon: <Mountain size={26} />, color: '#fb923c' },
  { id: 'HeavyRain', label: 'Heavy Rain', icon: <CloudRain size={26} />, color: '#60a5fa' },
  { id: 'Earthquake', label: 'Earthquake', icon: <Activity size={26} />, color: '#facc15' },
  { id: 'ExtremeHeat', label: 'Extreme Heat', icon: <Sun size={26} />, color: '#f97316' },
  { id: 'InfrastructureDamage', label: 'Building Damage', icon: <Building size={26} />, color: '#94a3b8' },
  { id: 'RoadBlockage', label: 'Road Blocked', icon: <Map size={26} />, color: '#ef4444' },
  { id: 'Other', label: 'Other Emergency', icon: <AlertTriangle size={26} />, color: '#cbd5e1' },
];

const QUICK_TAGS = [
  'People trapped', 'Water rising', 'Road blocked',
  'Power outage', 'Medical emergency', 'Building damaged', 'Immediate assistance needed'
];

export const ReportIncident: React.FC = () => {
  const navigate = useNavigate();
  const routerLocation = useReactRouterLocation();
  const prefill = routerLocation.state?.prefill;

  const { location, requestLocation } = useLocation();
  const { reports, submitReport } = useReports();
  const { user, isAuthenticated } = useUserAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [selectedType, setSelectedType] = useState<ReportType | null>(prefill?.type || null);
  const [manualLocation, setManualLocation] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [description, setDescription] = useState(prefill?.label || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(prefill?.tag ? [prefill.tag] : []);
  const [urgency, setUrgency] = useState<ReportUrgency | null>(prefill?.urgency || null);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<IncidentReport | null>(null);
  const [viewingReport, setViewingReport] = useState<IncidentReport | null>(null);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > 800) {
          height = Math.round((height * 800) / width);
          width = 800;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setMediaPreview(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!selectedType) return alert('Please select an incident type.');
    if (!location.coords && !manualLocation) return alert('Please provide a location.');
    if (!urgency) return alert('Please select an urgency level.');

    setIsSubmitting(true);

    const fullDesc = [description, ...selectedTags.map(t => `#${t.replace(/\s+/g, '')}`)].filter(Boolean).join('\n\n');
    const locName = manualLocation || location.address || (location.coords ? `Lat: ${location.coords.latitude.toFixed(4)}, Lon: ${location.coords.longitude.toFixed(4)}` : 'Unknown Location');

    const authorName = isAuthenticated && user ? user.fullName : 'Citizen / Guest';
    const authorHandle = isAuthenticated && user ? user.emailOrPhone : '@citizen_guest';

    const result = await submitReport({
      type: selectedType,
      locationName: locName,
      coordinates: location.coords ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : null,
      description: fullDesc,
      mediaBase64: mediaPreview,
      urgency,
      peopleAffected: selectedTags.includes('People trapped') ? 'Unknown (Trapped)' : 'Unknown',
      tags: selectedTags,
      sourceInfo: {
        platform: 'DRISHTI Web App',
        authorName,
        authorHandle,
        verifiedUser: isAuthenticated,
        engagementStats: { shares: 1, corroborations: 1 }
      }
    });

    setIsSubmitting(false);
    setSubmittedReport(result);
  };

  const resetForm = () => {
    setSelectedType(null);
    setManualLocation('');
    setMediaPreview(null);
    setDescription('');
    setSelectedTags([]);
    setUrgency(null);
    setSubmittedReport(null);
  };

  const locationDisplayText = location.address || (location.coords ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : 'Locating GPS...');

  if (submittedReport) {
    const analysis = submittedReport.aiAnalysis;
    const verdict = analysis?.verdict || 'Needs Review';
    const ml = submittedReport.mlAssessment;
    const hasMl = ml && ml.status === 'completed';
    const isMlPending = submittedReport.status === 'PendingSync' || (ml && ml.status === 'pending');
    const isMlUnavailable = !hasMl && !isMlPending;

    const mlPredictionLabel = hasMl
      ? (ml.prediction === 'informative' ? 'Informative Report' : 'Low Information Content')
      : isMlPending
        ? 'AI assessment pending network synchronization'
        : 'AI assessment unavailable';

    const mlScore = hasMl
      ? Number((ml.informative_probability * 100).toFixed(1))
      : null;

    const mlColor = hasMl
      ? (ml.prediction === 'informative' ? '#22c55e' : '#f97316')
      : '#94a3b8';

    return (
      <div className="report-container">
        <div className="success-card">
          <div className="success-icon-wrapper">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="success-title">
            {submittedReport.status === 'PendingSync' ? 'Report Saved Offline' : 'Incident Report Submitted'}
          </h2>
          <p className="success-desc">
            {submittedReport.status === 'PendingSync' 
              ? 'Report saved locally in IndexedDB. Waiting for connection to synchronize with regional dispatch.'
              : 'Your report has been submitted to the emergency network and queued for official verification.'}
          </p>

          {/* AI Content Assessment Banner on Success */}
          <div style={{
            width: '100%',
            background: hasMl
              ? (ml.prediction === 'informative' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(249, 115, 22, 0.1)')
              : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${
              hasMl
                ? (ml.prediction === 'informative' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)')
                : 'rgba(255, 255, 255, 0.15)'
            }`,
            borderRadius: '10px',
            padding: '14px 18px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: mlColor,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                🤖 AI CONTENT ASSESSMENT: {mlPredictionLabel.toUpperCase()}
              </span>
              {hasMl && mlScore !== null && (
                <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>
                  AI Report Relevance: {mlScore}%
                </span>
              )}
            </div>

            {hasMl && (
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                Report situational relevance analyzed via CrisisMMD disaster model. Final verification decision rests with authorized emergency personnel.
              </p>
            )}

            {isMlPending && (
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#f59e0b', lineHeight: 1.4 }}>
                Report saved locally offline. Content assessment will run automatically once network connectivity is restored.
              </p>
            )}

            {isMlUnavailable && (
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                AI assessment unavailable. Your report is preserved safely and queued for human dispatcher review.
              </p>
            )}

            {/* Preserved ground evidence reasoning if present */}
            {analysis?.reasoning?.[0] && (
              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
                Ground correlation: {analysis.reasoning[0]}
              </p>
            )}
          </div>

          <div className="success-meta">
            <div className="meta-row">
              <span className="meta-label">Report ID</span>
              <span className="meta-value" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{submittedReport.id}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Timestamp</span>
              <span className="meta-value">{new Date(submittedReport.timestamp).toLocaleString()}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Location</span>
              <span className="meta-value">{submittedReport.locationName}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Status</span>
              <span className="meta-value" style={{ color: submittedReport.status === 'PendingSync' ? '#f59e0b' : submittedReport.status === 'Submitted' ? '#38bdf8' : verdict === 'Genuine' ? '#22c55e' : '#ef4444' }}>
                {submittedReport.status === 'PendingSync' ? 'SAVED OFFLINE (PENDING SYNC)' : submittedReport.status === 'Submitted' ? 'SUBMITTED (UNDER REVIEW)' : submittedReport.status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="success-actions">
            <button className="success-btn btn-secondary" onClick={() => navigate('/user')}>
              Return to Citizen Safety
            </button>
            <button className="success-btn btn-secondary" onClick={() => navigate('/user/map')}>
              View on Citizen Map
            </button>
            <button className="success-btn btn-primary" onClick={resetForm}>
              Report Another Incident
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page-wrapper">
      <div className="report-container">

        {/* ── Top Navigation / Return to Citizen Home ── */}
        <div className="report-top-nav-bar">
          <button
            type="button"
            className="report-back-btn"
            onClick={() => navigate('/user')}
            title="Back to Citizen Dashboard"
          >
            <ArrowLeft size={16} />
            <span>Back to Citizen Home</span>
          </button>
        </div>

        {/* ── Header Top Row ── */}
        <div className="report-header-top">
          <header className="report-header">
            <h1 className="report-title">
              Report an <span className="report-title-accent">Incident</span>
            </h1>
            <p className="report-subtitle">Help responders understand what is happening on the ground.</p>
            <div className="report-trust-note">
              <ShieldAlert size={14} />
              Only report genuine emergencies and disaster-related situations.
            </div>

            {/* Reporter Identity Info */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary, #64748b)',
                backgroundColor: 'var(--color-bg, #f8fafc)',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #e2e8f0)'
              }}
            >
              <CheckCircle2 size={14} color="#10b981" />
              <span>
                Reporting as: <strong style={{ color: 'var(--color-text, #0f172a)' }}>{isAuthenticated && user ? user.fullName : 'Anonymous Citizen (Guest)'}</strong>
              </span>
            </div>
          </header>

          <div className="report-location-badge">
            <MapPin size={14} />
            <span>{locationDisplayText}</span>
          </div>
        </div>

        {/* ── 1. Incident Type (Full Width Responsive Grid) ── */}
        <section className="report-section">
          <h3 className="section-label">WHAT IS HAPPENING?</h3>
          <div className="incident-type-grid">
            {INCIDENT_TYPES.map(type => (
              <div
                key={type.id}
                className={`type-card ${selectedType === type.id ? 'selected' : ''}`}
                onClick={() => setSelectedType(type.id)}
              >
                <div
                  className="type-icon-wrapper"
                  style={{ color: type.color }}
                >
                  {type.icon}
                </div>
                <span className="type-label" style={{ whiteSpace: 'pre-line' }}>{type.label}</span>
                {selectedType === type.id && <CheckCircle2 size={16} className="type-check" />}
              </div>
            ))}
          </div>
        </section>

        {/* ── 2. Location ── */}
        <section className="report-section">
          <h3 className="section-label">
            <MapPin size={16} />
            INCIDENT LOCATION
          </h3>

          {!location.coords && location.status !== 'denied' && (
            <button className="location-btn" onClick={requestLocation}>
              <MapPin size={16} /> Use My Current Location
            </button>
          )}

          {location.coords && (
            <>
              <div className="location-detected-row">
                <div className="location-detected-dot" />
                <span className="location-detected-label">Current location detected</span>
              </div>
              <div className="location-split">
                <div className="location-coords">
                  <div className="location-coord-row"><strong>Latitude:</strong> {location.coords.latitude.toFixed(6)}</div>
                  <div className="location-coord-row"><strong>Longitude:</strong> {location.coords.longitude.toFixed(6)}</div>
                  <div className="location-coord-row"><strong>Accuracy:</strong> ±{Math.round(location.coords.accuracy)}m</div>
                </div>
                <div className="location-map-mini">
                  <svg className="location-map-svg" viewBox="0 0 300 130" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="300" height="130" fill="#090b0e" />
                    {/* Grid and road network pattern */}
                    <path d="M0 30 H300 M0 65 H300 M0 100 H300" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <path d="M50 0 V130 M110 0 V130 M170 0 V130 M230 0 V130 M280 0 V130" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <path d="M-20 80 L180 15 M70 140 L250 15 M150 140 L320 40" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" strokeDasharray="4 4" />
                    <path d="M0 60 Q 130 80, 300 45" stroke="rgba(255,255,255,0.16)" strokeWidth="3" />
                    <path d="M80 0 Q 160 65, 220 130" stroke="rgba(255,255,255,0.16)" strokeWidth="3" />

                    {/* Pulsing red pin marker */}
                    <circle cx="150" cy="65" r="18" fill="rgba(239, 68, 68, 0.2)" />
                    <circle cx="150" cy="65" r="9" fill="rgba(239, 68, 68, 0.4)" />
                    <g transform="translate(140, 44)">
                      <path
                        d="M10 0 C4.5 0 0 4.5 0 10 C0 17 10 26 10 26 C10 26 20 17 20 10 C20 4.5 15.5 0 10 0 Z"
                        fill="#ef4444"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
                      />
                      <circle cx="10" cy="9" r="3.5" fill="#ffffff" />
                    </g>
                  </svg>
                </div>
              </div>
            </>
          )}

          {(location.status === 'denied' || location.status === 'unavailable') && (
            <div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
                Location access unavailable. Please enter manually.
              </p>
              <input
                type="text"
                className="manual-location-input"
                placeholder="e.g. Near Cuttack Railway Station, Odisha"
                value={manualLocation}
                onChange={e => setManualLocation(e.target.value)}
              />
            </div>
          )}
        </section>

        {/* ── 3. Evidence ── */}
        <section className="report-section">
          <h3 className="section-label">
            <Camera size={16} />
            ADD EVIDENCE <span style={{ fontWeight: 400, opacity: 0.45, marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>(Optional)</span>
          </h3>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleMediaUpload}
          />

          {!mediaPreview ? (
            <div className="evidence-upload" onClick={() => fileInputRef.current?.click()}>
              <Upload size={34} className="evidence-upload-icon" />
              <span className="evidence-upload-main">Upload Photo / Video</span>
              <span className="evidence-upload-sub">or Take Photo</span>
            </div>
          ) : (
            <div className="evidence-upload has-file">
              <img src={mediaPreview} alt="Evidence preview" className="evidence-preview" />
              <button className="evidence-remove" onClick={(e) => { e.stopPropagation(); setMediaPreview(null); }}>
                <X size={14} />
              </button>
            </div>
          )}
          <p className="evidence-note">Photos and videos help responders verify the situation better.</p>
        </section>

        {/* ── 4. Description ── */}
        <section className="report-section">
          <h3 className="section-label">
            <MessageSquare size={16} />
            WHAT SHOULD RESPONDERS KNOW?
          </h3>
          <textarea
            className="report-textarea"
            placeholder="Describe what you are seeing..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <p className="tags-label">Quick tags</p>
          <div className="tags-container">
            {QUICK_TAGS.map(tag => (
              <button
                key={tag}
                className={`tag-btn ${selectedTags.includes(tag) ? 'selected' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        {/* ── 5. Urgency ── */}
        <section className="report-section">
          <h3 className="section-label">
            <TriangleAlert size={16} />
            HOW URGENT IS THIS?
          </h3>
          <div className="urgency-grid">
            <div
              className={`urgency-card urgency-low ${urgency === 'Low' ? 'selected' : ''}`}
              onClick={() => setUrgency('Low')}
            >
              <div className="urgency-card-top">
                <div className="urgency-icon low"><CheckCircle size={14} /></div>
                <span className="urgency-label">LOW</span>
              </div>
              <span className="urgency-desc">Situation observed, no immediate danger</span>
            </div>
            <div
              className={`urgency-card urgency-medium ${urgency === 'Medium' ? 'selected' : ''}`}
              onClick={() => setUrgency('Medium')}
            >
              <div className="urgency-card-top">
                <div className="urgency-icon medium"><AlertCircle size={14} /></div>
                <span className="urgency-label">MEDIUM</span>
              </div>
              <span className="urgency-desc">People/property may be at risk</span>
            </div>
            <div
              className={`urgency-card urgency-critical ${urgency === 'Critical' ? 'selected' : ''}`}
              onClick={() => setUrgency('Critical')}
            >
              <div className="urgency-card-top">
                <div className="urgency-icon critical"><TriangleAlert size={14} /></div>
                <span className="urgency-label">CRITICAL</span>
              </div>
              <span className="urgency-desc">Immediate danger / life-threatening situation</span>
            </div>
          </div>
        </section>

        <button className="submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="animate-spin" size={20} /> SUBMITTING & ANALYZING CONTENT...</>
          ) : (
            'SUBMIT INCIDENT'
          )}
        </button>

        {/* ── My Reports ── */}
        <section className="my-reports-section">
          <h3 className="my-reports-title">MY RECENT REPORTS</h3>
          {reports.length === 0 ? (
            <div className="reports-empty">
              <p style={{ fontWeight: 600, marginBottom: 4 }}>No reports yet</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Reports you submit will appear here.</p>
            </div>
          ) : (
            <div className="reports-list">
              {reports.map(report => (
                <div key={report.id} className="report-item" onClick={() => setViewingReport(report)}>
                  <div className="report-item-left">
                    {report.mediaBase64 ? (
                      <img src={report.mediaBase64} alt="" className="report-item-thumb" />
                    ) : (
                      <div className="report-item-thumb">
                        <Camera size={16} />
                      </div>
                    )}
                    <div className="report-item-info">
                      <h4>{INCIDENT_TYPES.find(t => t.id === report.type)?.label.replace('\n', ' ') || report.type}</h4>
                      <p>
                        <MapPin size={10} />
                        {report.locationName.substring(0, 25)}{report.locationName.length > 25 ? '…' : ''} &bull; {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`report-status-badge status-${report.status.toLowerCase()}`}>
                      {report.status}
                    </span>
                    <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.25)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Report Detail Drawer ── */}
        <AnimatePresence>
          {viewingReport && (
            <div className="intel-drawer-overlay" onClick={(e) => {
              if (e.target === e.currentTarget) setViewingReport(null);
            }}>
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="intel-drawer"
              >
                <div className="drawer-header">
                  <span className={`report-status-badge status-${viewingReport.status.toLowerCase()}`}>
                    {viewingReport.status}
                  </span>
                  <button className="drawer-close" onClick={() => setViewingReport(null)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="drawer-content">
                  {viewingReport.mediaBase64 && (
                    <img src={viewingReport.mediaBase64} alt="Evidence" style={{ width: '100%', borderRadius: 8, objectFit: 'contain', maxHeight: 256, background: '#000' }} />
                  )}
                  <div>
                    <h2 className="drawer-title">{INCIDENT_TYPES.find(t => t.id === viewingReport.type)?.label.replace('\n', ' ') || viewingReport.type}</h2>
                    <div className="drawer-meta-grid">
                      <div className="drawer-meta-item">
                        <span className="drawer-meta-label">Location</span>
                        <span className="drawer-meta-value"><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />{viewingReport.locationName}</span>
                      </div>
                      <div className="drawer-meta-item">
                        <span className="drawer-meta-label">Reported Time</span>
                        <span className="drawer-meta-value">{new Date(viewingReport.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="drawer-meta-item">
                        <span className="drawer-meta-label">Urgency</span>
                        <span className="drawer-meta-value" style={{ fontWeight: 700, color: viewingReport.urgency === 'Critical' ? '#ef4444' : viewingReport.urgency === 'Medium' ? '#f97316' : '#22c55e' }}>
                          {viewingReport.urgency}
                        </span>
                      </div>
                      <div className="drawer-meta-item">
                        <span className="drawer-meta-label">Sync Status</span>
                        <span className="drawer-meta-value" style={{ color: viewingReport.status === 'PendingSync' ? '#f59e0b' : '#22c55e' }}>
                          {viewingReport.status === 'PendingSync' ? 'Offline - Waiting' : 'Synced'}
                        </span>
                      </div>
                    </div>

                    {/* AI Content Assessment in Drawer */}
                    <div style={{ marginTop: 16 }}>
                      <h3 className="drawer-section-title">AI Content Assessment</h3>
                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        padding: '12px 14px',
                        marginTop: 8
                      }}>
                        {viewingReport.mlAssessment?.status === 'completed' ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
                              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Classification:</span>
                              <strong style={{ color: viewingReport.mlAssessment.prediction === 'informative' ? '#22c55e' : '#f97316' }}>
                                {viewingReport.mlAssessment.prediction === 'informative' ? 'Informative Report' : 'Low Information Content'}
                              </strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                              <span style={{ color: 'rgba(255,255,255,0.6)' }}>AI Report Relevance:</span>
                              <strong style={{ color: '#38bdf8' }}>
                                {(viewingReport.mlAssessment.informative_probability * 100).toFixed(1)}%
                              </strong>
                            </div>
                            <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                              * Situational relevance probability evaluated via CrisisMMD disaster model.
                            </div>
                          </>
                        ) : viewingReport.status === 'PendingSync' || viewingReport.mlAssessment?.status === 'pending' ? (
                          <div style={{ color: '#f59e0b', fontSize: '0.8rem' }}>
                            ⏳ Saved offline. AI assessment pending network synchronization.
                          </div>
                        ) : (
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                            ⚠️ AI assessment unavailable.
                          </div>
                        )}
                      </div>
                    </div>

                    {viewingReport.description && (
                      <div style={{ marginTop: 16 }}>
                        <h3 className="drawer-section-title">Description</h3>
                        <p className="drawer-desc" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{viewingReport.description}</p>
                      </div>
                    )}
                    <div style={{ marginTop: 24 }}>
                      <h3 className="drawer-section-title">Response Updates</h3>
                      <p className="drawer-desc" style={{ marginTop: 8 }}>No response updates yet.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
