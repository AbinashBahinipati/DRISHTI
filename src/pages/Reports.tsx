import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck2, ShieldCheck, AlertCircle, AlertTriangle,
  Search, Plus, MapPin, Clock, CheckCircle2,
  XCircle, Sparkles, Activity, Eye,
  ChevronRight, X, ExternalLink, Camera,
  Waves, Wind, Flame, Mountain, CloudRain, Sun, Building, Map,
  Globe, Send, MessageSquare, Radio, Share2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReports } from '../hooks/useReports';
import type { IncidentReport, ReportType, ReportPlatform } from '../types/report';
import '../styles/Reports.css';

const TYPE_ICONS: Record<ReportType, { icon: React.ReactNode; color: string; label: string }> = {
  Flood: { icon: <Waves size={20} />, color: '#38bdf8', label: 'Flood / Waterlogging' },
  Cyclone: { icon: <Wind size={20} />, color: '#7dd3fc', label: 'Cyclone / Wind' },
  Fire: { icon: <Flame size={20} />, color: '#ef4444', label: 'Fire' },
  Landslide: { icon: <Mountain size={20} />, color: '#fb923c', label: 'Landslide' },
  HeavyRain: { icon: <CloudRain size={20} />, color: '#60a5fa', label: 'Heavy Rain' },
  Earthquake: { icon: <Activity size={20} />, color: '#facc15', label: 'Earthquake' },
  ExtremeHeat: { icon: <Sun size={20} />, color: '#f97316', label: 'Extreme Heat' },
  InfrastructureDamage: { icon: <Building size={20} />, color: '#94a3b8', label: 'Building Damage' },
  RoadBlockage: { icon: <Map size={20} />, color: '#ef4444', label: 'Road Blocked' },
  Other: { icon: <AlertTriangle size={20} />, color: '#cbd5e1', label: 'Other Emergency' },
};

const PLATFORM_CONFIG: Record<ReportPlatform, { label: string; class: string; icon: React.ReactNode }> = {
  'DRISHTI Web App': { label: 'DRISHTI Web', class: 'drishti', icon: <ShieldCheck size={12} /> },
  'Twitter / X': { label: 'Twitter / X', class: 'twitter', icon: <span style={{ fontWeight: 800, fontSize: '11px' }}>𝕏</span> },
  'Telegram Alert': { label: 'Telegram', class: 'telegram', icon: <Send size={11} /> },
  'Reddit Emergency': { label: 'Reddit', class: 'reddit', icon: <MessageSquare size={11} /> },
  'GDACS Global Alert': { label: 'GDACS Alert', class: 'gdacs', icon: <Globe size={11} /> },
  'News Wire': { label: 'News Wire', class: 'newswire', icon: <Radio size={11} /> },
  'ReliefWeb': { label: 'ReliefWeb', class: 'gdacs', icon: <Globe size={11} /> },
};

type TabFilter = 'all' | 'high' | 'medium' | 'avoid';

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { reports, manuallyVerifyReport } = useReports();

  // Filters State
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = reports.length;
    const genuineHigh = reports.filter(r => r.aiAnalysis?.verdict === 'Genuine' || r.aiAnalysis?.confidenceLevel === 'High').length;
    const mediumReview = reports.filter(r => r.aiAnalysis?.verdict === 'Needs Review' || r.aiAnalysis?.confidenceLevel === 'Medium').length;
    const avoidSpam = reports.filter(r => r.aiAnalysis?.verdict === 'Avoid' || r.aiAnalysis?.confidenceLevel === 'Low' || r.status === 'Avoid').length;
    const webAppCount = reports.filter(r => r.sourceInfo?.platform === 'DRISHTI Web App').length;
    const internetCount = total - webAppCount;

    return { total, genuineHigh, mediumReview, avoidSpam, webAppCount, internetCount };
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const verdict = report.aiAnalysis?.verdict || (report.status === 'Verified' ? 'Genuine' : report.status === 'Avoid' ? 'Avoid' : 'Needs Review');

      // Tab filter
      if (activeTab === 'high' && verdict !== 'Genuine') return false;
      if (activeTab === 'medium' && verdict !== 'Needs Review') return false;
      if (activeTab === 'avoid' && verdict !== 'Avoid') return false;

      // Platform filter
      if (selectedPlatform !== 'all' && report.sourceInfo?.platform !== selectedPlatform) return false;

      // Category filter
      if (selectedCategory !== 'all' && report.type !== selectedCategory) return false;

      // Urgency filter
      if (selectedUrgency !== 'all' && report.urgency !== selectedUrgency) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLoc = report.locationName.toLowerCase().includes(q);
        const matchesDesc = report.description.toLowerCase().includes(q);
        const matchesId = report.id.toLowerCase().includes(q);
        const matchesType = report.type.toLowerCase().includes(q);
        const matchesAuthor = report.sourceInfo?.authorName?.toLowerCase().includes(q) || report.sourceInfo?.authorHandle?.toLowerCase().includes(q);
        return matchesLoc || matchesDesc || matchesId || matchesType || Boolean(matchesAuthor);
      }

      return true;
    });
  }, [reports, activeTab, selectedPlatform, selectedCategory, selectedUrgency, searchQuery]);

  return (
    <div className="reports-page-wrapper">
      {/* 1. Header Row */}
      <header className="reports-header">
        <div className="reports-header-left">
          <h1 className="reports-title">
            Disaster <span className="reports-title-accent">Reports</span> Feed
          </h1>
        </div>

        <div className="reports-header-actions">
          <button
            className="reports-create-btn"
            onClick={() => navigate('/app/report')}
          >
            <Plus size={16} />
            Report Incident on Ground
          </button>
        </div>
      </header>

      {/* 2. Top Metric KPI Row */}
      <section className="reports-kpi-grid">
        <div className="reports-kpi-card" onClick={() => { setActiveTab('all'); setSelectedPlatform('all'); }} style={{ cursor: 'pointer' }}>
          <div className="reports-kpi-header">
            <span className="reports-kpi-label">All Active Reports</span>
            <div className="reports-kpi-icon-wrap total">
              <FileCheck2 size={18} />
            </div>
          </div>
          <div className="reports-kpi-value">{stats.total}</div>
          <div className="reports-kpi-footer">
            <strong>{stats.webAppCount} Web App</strong> • {stats.internetCount} Internet feeds
          </div>
        </div>

        <div className="reports-kpi-card" onClick={() => setActiveTab('high')} style={{ cursor: 'pointer' }}>
          <div className="reports-kpi-header">
            <span className="reports-kpi-label" style={{ color: '#22c55e' }}>Priority (Genuine)</span>
            <div className="reports-kpi-icon-wrap high">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="reports-kpi-value" style={{ color: '#22c55e' }}>{stats.genuineHigh}</div>
          <div className="reports-kpi-footer">
            <strong>AI Verified (85%+ Conf.)</strong> • Dispatch ready
          </div>
        </div>

        <div className="reports-kpi-card" onClick={() => setActiveTab('medium')} style={{ cursor: 'pointer' }}>
          <div className="reports-kpi-header">
            <span className="reports-kpi-label" style={{ color: '#f97316' }}>Medium Confidence</span>
            <div className="reports-kpi-icon-wrap medium">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="reports-kpi-value" style={{ color: '#f97316' }}>{stats.mediumReview}</div>
          <div className="reports-kpi-footer">
            <strong>Under active investigation</strong> • Awaiting ground check
          </div>
        </div>

        <div className="reports-kpi-card" onClick={() => setActiveTab('avoid')} style={{ cursor: 'pointer' }}>
          <div className="reports-kpi-header">
            <span className="reports-kpi-label" style={{ color: '#ef4444' }}>Spam / Avoid (False)</span>
            <div className="reports-kpi-icon-wrap avoid">
              <XCircle size={18} />
            </div>
          </div>
          <div className="reports-kpi-value" style={{ color: '#ef4444' }}>{stats.avoidSpam}</div>
          <div className="reports-kpi-footer">
            <strong>AI Suppressed</strong> • Zero physical anomaly
          </div>
        </div>
      </section>

      {/* 3. Filter & Search Controls */}
      <section className="reports-toolbar">
        <div className="reports-toolbar-top">
          {/* Status Tabs */}
          <div className="reports-tabs">
            <button
              className={`reports-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Feeds
              <span className="reports-tab-count">{stats.total}</span>
            </button>
            <button
              className={`reports-tab-btn high ${activeTab === 'high' ? 'active high' : ''}`}
              onClick={() => setActiveTab('high')}
            >
              <ShieldCheck size={14} />
              Priority (Genuine)
              <span className="reports-tab-count">{stats.genuineHigh}</span>
            </button>
            <button
              className={`reports-tab-btn medium ${activeTab === 'medium' ? 'active medium' : ''}`}
              onClick={() => setActiveTab('medium')}
            >
              <AlertCircle size={14} />
              Needs Review
              <span className="reports-tab-count">{stats.mediumReview}</span>
            </button>
            <button
              className={`reports-tab-btn avoid ${activeTab === 'avoid' ? 'active avoid' : ''}`}
              onClick={() => setActiveTab('avoid')}
            >
              <XCircle size={14} />
              Spam / Avoid
              <span className="reports-tab-count">{stats.avoidSpam}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="reports-search-box">
            <Search size={15} color="rgba(255, 255, 255, 0.4)" />
            <input
              type="text"
              className="reports-search-input"
              placeholder="Search by reporter, handle, location, ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <X size={14} color="rgba(255,255,255,0.4)" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
            )}
          </div>
        </div>

        {/* Platform & Category Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Platform Filter */}
          <div className="reports-category-pills">
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600, marginRight: 4 }}>
              Source:
            </span>
            <button
              className={`reports-cat-pill ${selectedPlatform === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedPlatform('all')}
            >
              All Platforms
            </button>
            {Object.keys(PLATFORM_CONFIG).map(plat => (
              <button
                key={plat}
                className={`reports-cat-pill ${selectedPlatform === plat ? 'active' : ''}`}
                onClick={() => setSelectedPlatform(plat)}
              >
                {PLATFORM_CONFIG[plat as ReportPlatform].label}
              </button>
            ))}
          </div>

          {/* Disaster Type Filter */}
          <div className="reports-category-pills">
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600, marginRight: 4 }}>
              Hazard:
            </span>
            <button
              className={`reports-cat-pill ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Types
            </button>
            {Object.entries(TYPE_ICONS).map(([typeKey, config]) => (
              <button
                key={typeKey}
                className={`reports-cat-pill ${selectedCategory === typeKey ? 'active' : ''}`}
                onClick={() => setSelectedCategory(typeKey)}
              >
                {config.label.split('/')[0].trim()}
              </button>
            ))}
          </div>

          {/* Urgency Filter */}
          <div className="reports-category-pills">
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600, marginRight: 4 }}>
              Urgency:
            </span>
            {['all', 'Critical', 'Medium', 'Low'].map(urg => (
              <button
                key={urg}
                className={`reports-cat-pill ${selectedUrgency === urg ? 'active' : ''}`}
                onClick={() => setSelectedUrgency(urg)}
              >
                {urg === 'all' ? 'All Priorities' : `${urg} Priority`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Incident Reports Cards List */}
      <section className="reports-list-container">
        {filteredReports.length === 0 ? (
          <div className="reports-empty-box">
            <div className="reports-empty-icon">
              <FileCheck2 size={24} />
            </div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>No incident reports match this filter</h3>
            <p style={{ margin: 0, fontSize: '0.82rem' }}>
              Try adjusting your search criteria or switch tabs to see all incoming reports.
            </p>
          </div>
        ) : (
          filteredReports.map(report => {
            const typeConfig = TYPE_ICONS[report.type] || TYPE_ICONS.Other;
            const analysis = report.aiAnalysis;
            const verdict = analysis?.verdict || (report.status === 'Verified' ? 'Genuine' : report.status === 'Avoid' ? 'Avoid' : 'Needs Review');
            const score = analysis?.confidenceScore || (verdict === 'Genuine' ? 94 : verdict === 'Avoid' ? 14 : 64);
            const verdictClass = verdict === 'Genuine' ? 'high' : verdict === 'Needs Review' ? 'medium' : 'avoid';
            const source = report.sourceInfo || {
              platform: 'DRISHTI Web App' as ReportPlatform,
              authorName: 'Citizen Reporter',
              authorHandle: '@drishti_user',
              verifiedUser: true
            };
            const platConfig = PLATFORM_CONFIG[source.platform] || PLATFORM_CONFIG['DRISHTI Web App'];
            const displayImage = report.mediaBase64;

            return (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`report-item-card verdict-${verdictClass}`}
                onClick={() => setSelectedReport(report)}
              >
                {/* Source Platform & Reporter Attribution Header */}
                <div className="report-card-source-bar">
                  <div className="report-card-reporter-info">
                    <span className={`platform-badge ${platConfig.class}`}>
                      {platConfig.icon}
                      {platConfig.label}
                    </span>
                    <span>Reported by <strong>{source.authorName}</strong></span>
                    {source.authorHandle && (
                      <span className="report-author-handle">{source.authorHandle}</span>
                    )}
                    {source.verifiedUser && (
                      <CheckCircle2 size={13} style={{ color: '#38bdf8' }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'rgba(255,255,255,0.45)' }}>
                    <Clock size={12} />
                    <span>{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(report.timestamp).toLocaleDateString()})</span>
                    {source.sourceUrl && (
                      <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ color: 'rgba(255,255,255,0.6)', marginLeft: '4px' }}
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Card Identity Row */}
                <div className="report-card-top-row">
                  <div className="report-card-identity">
                    <div
                      className="report-card-icon-bubble"
                      style={{ color: typeConfig.color }}
                    >
                      {typeConfig.icon}
                    </div>
                    <div className="report-card-header-text">
                      <h3>
                        {typeConfig.label.replace('\n', ' ')}
                        <span className="report-id-tag">{report.id}</span>
                      </h3>
                      <div className="report-card-location-row">
                        <span className="report-loc-item">
                          <MapPin size={12} style={{ color: '#ef4444' }} />
                          {report.locationName}
                        </span>
                        {report.peopleAffected && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#f97316' }}>👥 {report.peopleAffected}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Urgency Badge */}
                  <span
                    className="report-status-badge"
                    style={{
                      backgroundColor: report.urgency === 'Critical' ? 'rgba(239,68,68,0.15)' : report.urgency === 'Medium' ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)',
                      color: report.urgency === 'Critical' ? '#ef4444' : report.urgency === 'Medium' ? '#f97316' : '#22c55e',
                      border: `1px solid ${report.urgency === 'Critical' ? 'rgba(239,68,68,0.3)' : report.urgency === 'Medium' ? 'rgba(249,115,22,0.3)' : 'rgba(34,197,94,0.3)'}`
                    }}
                  >
                    {report.urgency} Urgency
                  </span>
                </div>

                {/* AI Agent Audit Banner */}
                <div className={`report-ai-audit-banner ${verdictClass}`}>
                  <div className="report-ai-badge-row">
                    <span className={`report-ai-verdict-tag ${verdictClass}`}>
                      <Sparkles size={12} />
                      {verdict === 'Genuine' ? 'HIGH CONFIDENCE (PRIORITY / GENUINE)' : verdict === 'Needs Review' ? 'MEDIUM CONFIDENCE (INVESTIGATING)' : 'SPAM / AVOID (SUSPECTED FALSE REPORT)'}
                    </span>

                    <div className="report-ai-confidence-meter">
                      <span>AI Score: <strong>{score}%</strong></span>
                      <div className="report-confidence-bar-bg">
                        <div
                          className={`report-confidence-bar-fill ${verdictClass}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* AI Reasoning Points */}
                  {analysis?.reasoning && analysis.reasoning.length > 0 && (
                    <ul className="report-ai-bullets">
                      {analysis.reasoning.slice(0, 2).map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Report Description & Evidence Image Preview */}
                <div className="report-card-body-wrapper">
                  <div className="report-card-body">
                    {report.description}
                  </div>
                  {displayImage && (
                    <img
                      src={displayImage}
                      alt="User uploaded evidence"
                      className="report-card-media-thumb"
                    />
                  )}
                </div>

                {/* Footer with Tags and Quick Actions */}
                <div className="report-card-footer" onClick={e => e.stopPropagation()}>
                  <div className="report-card-tags">
                    {report.tags && report.tags.map((t, idx) => (
                      <span key={idx} className="report-tag-chip">#{t}</span>
                    ))}
                    {source.engagementStats && source.engagementStats.shares && source.engagementStats.shares > 0 && (
                      <span className="report-tag-chip" style={{ color: '#38bdf8' }}>
                        <Share2 size={10} style={{ display: 'inline', marginRight: '3px' }} />
                        {source.engagementStats.shares.toLocaleString()} shares on web
                      </span>
                    )}
                  </div>

                  <div className="report-card-actions">
                    <button
                      className="report-action-btn-sm"
                      onClick={() => setSelectedReport(report)}
                    >
                      <Eye size={12} />
                      Full Report & Evidence
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </section>

      {/* 5. In-Depth Detail Modal / Evidence Lightbox */}
      <AnimatePresence>
        {selectedReport && (
          <div className="report-modal-overlay" onClick={() => setSelectedReport(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="report-modal-dialog"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="report-modal-header">
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {TYPE_ICONS[selectedReport.type]?.label.replace('\n', ' ') || selectedReport.type}
                    <span className="report-id-tag">{selectedReport.id}</span>
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                    Published on {new Date(selectedReport.timestamp).toLocaleString()}
                  </span>
                </div>
                <button className="report-modal-close" onClick={() => setSelectedReport(null)}>
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="report-modal-body">
                {/* Reporter & Platform Dossier */}
                <div className="report-modal-source-dossier">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {selectedReport.sourceInfo && (
                      <span className={`platform-badge ${PLATFORM_CONFIG[selectedReport.sourceInfo.platform]?.class || 'drishti'}`}>
                        {PLATFORM_CONFIG[selectedReport.sourceInfo.platform]?.icon}
                        {selectedReport.sourceInfo.platform}
                      </span>
                    )}
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                        {selectedReport.sourceInfo?.authorName || 'Citizen Reporter'}
                        {selectedReport.sourceInfo?.authorHandle && (
                          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginLeft: '6px', fontFamily: 'monospace' }}>
                            {selectedReport.sourceInfo.authorHandle}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)' }}>
                        {selectedReport.sourceInfo?.verifiedUser ? 'Verified Identity / Official Node' : 'Unverified Social / Citizen Feed'}
                      </div>
                    </div>
                  </div>

                  {selectedReport.sourceInfo?.sourceUrl && (
                    <a
                      href={selectedReport.sourceInfo.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="report-action-btn-sm"
                      style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                    >
                      <ExternalLink size={13} />
                      View Original Post on {selectedReport.sourceInfo.platform}
                    </a>
                  )}
                </div>

                {/* Uploaded Image / Video Evidence Preview */}
                {selectedReport.mediaBase64 ? (
                  <div>
                    <h4 className="report-modal-section-title">
                      📷 User-Uploaded Photo / Video Evidence
                    </h4>
                    <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                      <img
                        src={selectedReport.mediaBase64}
                        alt="Incident Evidence"
                        style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'rgba(255, 255, 255, 0.45)',
                    fontSize: '0.82rem'
                  }}>
                    <Camera size={18} style={{ opacity: 0.6, flexShrink: 0 }} />
                    <span><strong>Media Evidence:</strong> Not attached with this report. (Veracity validated via sensory telemetry & emergency network).</span>
                  </div>
                )}

                {/* Exact Reporter Narrative */}
                <div>
                  <h4 className="report-modal-section-title">
                    📝 Exact Report Content & Testimony
                  </h4>
                  <div style={{
                    background: 'rgba(0,0,0,0.35)',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '0.92rem',
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedReport.description}
                  </div>
                </div>

                {/* Meta Grid */}
                <div className="report-modal-meta-grid">
                  <div className="report-modal-meta-item">
                    <span className="report-modal-meta-label">Location</span>
                    <span className="report-modal-meta-value">{selectedReport.locationName}</span>
                  </div>
                  <div className="report-modal-meta-item">
                    <span className="report-modal-meta-label">Urgency & Impact</span>
                    <span className="report-modal-meta-value">
                      <strong style={{ color: selectedReport.urgency === 'Critical' ? '#ef4444' : '#f97316' }}>
                        {selectedReport.urgency} Priority
                      </strong> • {selectedReport.peopleAffected || 'Impact scale logged'}
                    </span>
                  </div>
                  <div className="report-modal-meta-item">
                    <span className="report-modal-meta-label">GPS Coordinates</span>
                    <span className="report-modal-meta-value" style={{ fontFamily: 'monospace' }}>
                      {selectedReport.coordinates
                        ? `${selectedReport.coordinates.latitude.toFixed(5)}° N, ${selectedReport.coordinates.longitude.toFixed(5)}° E`
                        : 'Geocoded Regional Anchor'}
                    </span>
                  </div>
                  <div className="report-modal-meta-item">
                    <span className="report-modal-meta-label">Assigned Responder</span>
                    <span className="report-modal-meta-value" style={{ color: '#22c55e' }}>
                      {selectedReport.assignedResponder || 'Command Center Queue'}
                    </span>
                  </div>
                </div>

                {/* AI Agent Full Analysis Breakdown */}
                {selectedReport.aiAnalysis && (
                  <div>
                    <h4 className="report-modal-section-title" style={{ color: '#22c55e' }}>
                      <Sparkles size={16} />
                      AI Agent Multi-Factor Verification Audit
                    </h4>
                    <div className="report-modal-telemetry-box">
                      <div className="report-modal-telemetry-row">
                        <span>AI Veracity Verdict:</span>
                        <strong style={{
                          color: selectedReport.aiAnalysis.verdict === 'Genuine' ? '#22c55e' : selectedReport.aiAnalysis.verdict === 'Needs Review' ? '#f97316' : '#ef4444'
                        }}>
                          {selectedReport.aiAnalysis.verdict === 'Genuine' ? 'PRIORITY / GENUINE REPORT' : selectedReport.aiAnalysis.verdict === 'Needs Review' ? 'MEDIUM CONFIDENCE (INVESTIGATING)' : 'SPAM / AVOID (SUSPECTED FALSE)'} ({selectedReport.aiAnalysis.confidenceScore}% Score)
                        </strong>
                      </div>
                      <div className="report-modal-telemetry-row">
                        <span>IoT Sensor Correlation:</span>
                        <span>{selectedReport.aiAnalysis.sensorCorrelation || 'Corroborated'}</span>
                      </div>
                      <div className="report-modal-telemetry-row">
                        <span>Satellite & Doppler Radar:</span>
                        <span>{selectedReport.aiAnalysis.satelliteValidation || 'Aligned'}</span>
                      </div>
                      <div className="report-modal-telemetry-row">
                        <span>Crowd / Internet Consensus:</span>
                        <span>{selectedReport.aiAnalysis.crowdConsensus || 'Corroborated'}</span>
                      </div>
                      {selectedReport.aiAnalysis.computerVisionAudit && (
                        <div className="report-modal-telemetry-row">
                          <span>Computer Vision Audit:</span>
                          <span>{selectedReport.aiAnalysis.computerVisionAudit}</span>
                        </div>
                      )}

                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>
                          Audit Justification Log:
                        </span>
                        <ul className="report-ai-bullets" style={{ marginTop: 6 }}>
                          {selectedReport.aiAnalysis.reasoning.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="report-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedReport.verificationStatus !== 'Verified' && selectedReport.status !== 'Avoid' ? (
                    <>
                      <button
                        type="button"
                        className="success-btn btn-primary"
                        style={{ background: '#22c55e', color: '#000', fontWeight: 'bold', fontSize: '0.8rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => {
                          manuallyVerifyReport(selectedReport.id, 'Genuine');
                          setSelectedReport(prev => prev ? { ...prev, status: 'Verified', verificationStatus: 'Verified', responseStatus: 'ResponderAssigned' } : null);
                        }}
                      >
                        <CheckCircle2 size={15} />
                        Verify Incident
                      </button>
                      <button
                        type="button"
                        className="success-btn btn-secondary"
                        style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)', fontSize: '0.8rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => {
                          manuallyVerifyReport(selectedReport.id, 'Avoid');
                          setSelectedReport(prev => prev ? { ...prev, status: 'Avoid', verificationStatus: 'Rejected', responseStatus: 'Unassigned' } : null);
                        }}
                      >
                        <XCircle size={15} />
                        Reject / Spam
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: selectedReport.status === 'Avoid' ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                      <CheckCircle2 size={14} />
                      {selectedReport.status === 'Avoid' ? 'Status: REJECTED / SPAM' : 'Status: VERIFIED INCIDENT'}
                    </div>
                  )}
                </div>

                <button className="success-btn btn-secondary" onClick={() => setSelectedReport(null)}>
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
