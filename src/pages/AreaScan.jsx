import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle, Play, Search, MapPin, X, AlertTriangle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

/* ── helper: fly map to searched location ── */
function FlyToLocation({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 15, { duration: 1.5 });
  }, [target, map]);
  return null;
}

/* ── search bar using Nominatim ── */
function LocationSearch({ onSelect, disabled }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim() || q.length < 3) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        setResults(await r.json());
      } catch { setResults([]); }
      setLoading(false);
    }, 400);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={15} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 36, paddingRight: query ? 36 : 12 }}
          placeholder="Search area (e.g. Pune University, Andheri, Mumbai)…"
          value={query}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }}
            style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {(results.length > 0 || loading) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: 'white', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden'
        }}>
          {loading && <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>Searching…</div>}
          {results.map((r, i) => (
            <button key={i}
              style={{ width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              onClick={() => {
                onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), name: r.display_name });
                setQuery(r.display_name.split(',')[0]);
                setResults([]);
              }}>
              <MapPin size={13} style={{ flexShrink: 0, marginTop: 2, color: '#4F46E5' }} />
              <span>{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── subscription tiers ── */
const TIERS = {
  minor: {
    label: 'Minor Scan',
    price: '$49/mo',
    drones: 2,
    radius: 0.008,  // ~0.8 km box
    desc: 'Deploy 2 drones. Perfect for single buildings, small gardens, and compact areas up to 2 acres.',
    features: ['HD Photography', 'Basic AI Damage Detection'],
    missing: ['Thermal Imaging', 'Structural 3D Map'],
    photos: 120,
    duration: 12000,
  },
  major: {
    label: 'Major Scan',
    price: '$199/mo',
    drones: 3,
    radius: 0.018,  // ~2 km box
    desc: 'Deploy 3 drones. Engineered for large societies, universities, and industrial zones up to 15 acres.',
    features: ['4K Video & Photography', 'Advanced AI Analytics', 'Thermal Imaging', 'Structural 3D Map'],
    missing: [],
    photos: 850,
    duration: 12000,
  }
};

function TickIcon() {
  return <CheckCircle size={14} color="#10B981" style={{ flexShrink: 0 }} />;
}
function CrossIcon() {
  return <svg width={14} height={14} style={{ flexShrink: 0, color: '#9CA3AF' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}

/* ── main component ── */
export default function AreaScan() {
  const [selectedTier, setSelectedTier] = useState('minor');
  const [mapTarget, setMapTarget] = useState(null);     // { lat, lng, name }
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [report, setReport] = useState(null);
  const [drones, setDrones] = useState([]);
  const [scanArea, setScanArea] = useState(null);       // [[s,w],[n,e]]
  const [locationName, setLocationName] = useState('');

  const tier = TIERS[selectedTier];

  // When a location is chosen, compute scan bounds
  const handleLocationSelect = (loc) => {
    setMapTarget(loc);
    setLocationName(loc.name.split(',').slice(0, 2).join(', '));
    setScanArea([
      [loc.lat - tier.radius, loc.lng - tier.radius],
      [loc.lat + tier.radius, loc.lng + tier.radius]
    ]);
    setScanComplete(false);
    setReport(null);
  };

  // Regenerate bounds when tier changes if a location already selected
  useEffect(() => {
    if (mapTarget) {
      setScanArea([
        [mapTarget.lat - tier.radius, mapTarget.lng - tier.radius],
        [mapTarget.lat + tier.radius, mapTarget.lng + tier.radius]
      ]);
    }
  }, [selectedTier]);

  const startScan = () => {
    if (!mapTarget) { alert('Please search and select a location first.'); return; }
    const initDrones = Array.from({ length: tier.drones }, (_, i) => ({
      id: i + 1,
      lat: mapTarget.lat + (Math.random() - 0.5) * tier.radius,
      lng: mapTarget.lng + (Math.random() - 0.5) * tier.radius,
    }));
    setDrones(initDrones);
    setScanComplete(false);
    setReport(null);
    setScanning(true);
  };

  // Animate drones
  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      setDrones(prev => prev.map(d => ({
        ...d,
        lat: d.lat + (Math.random() - 0.5) * tier.radius * 0.3,
        lng: d.lng + (Math.random() - 0.5) * tier.radius * 0.3,
      })));
    }, 500);

    const done = setTimeout(() => {
      clearInterval(interval);
      setScanning(false);
      setScanComplete(true);
      const issuesFound = selectedTier === 'minor'
        ? Math.floor(Math.random() * 4) + 1
        : Math.floor(Math.random() * 12) + 5;
      setReport({
        location: locationName || 'Selected Area',
        area: tier.label,
        issuesFound,
        photosTaken: tier.photos + Math.floor(Math.random() * 50),
        healthScore: Math.max(40, 100 - issuesFound * (selectedTier === 'minor' ? 8 : 4)),
        droneFleet: tier.drones,
      });
    }, tier.duration);

    return () => { clearInterval(interval); clearTimeout(done); };
  }, [scanning]);

  const droneIcon = L.divIcon({
    html: `<div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));animation:drone-pulse 1s infinite alternate;">🚁</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], className: ''
  });

  return (
    <div className="animate-in" style={{ maxWidth: 1060, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Infrastructure Area Scan</h2>
        <p className="text-secondary">Search any location, select a subscription tier, then deploy your drone swarm for a live aerial inspection.</p>
      </div>

      {/* ─── Subscription Tiers ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }}>
        {Object.entries(TIERS).map(([key, t]) => (
          <div key={key}
            onClick={() => !scanning && setSelectedTier(key)}
            className="card"
            style={{
              cursor: scanning ? 'not-allowed' : 'pointer',
              border: `2px solid ${selectedTier === key ? '#4F46E5' : 'var(--border)'}`,
              background: selectedTier === key ? '#F5F3FF' : 'white',
              transition: 'all 0.2s',
              opacity: scanning && selectedTier !== key ? 0.45 : 1,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#4338CA' }}>{t.label}</h3>
              <span className="badge" style={{ background: '#EEF2FF', color: '#4338CA', fontWeight: 700 }}>{t.price}</span>
            </div>
            <p className="text-secondary text-sm" style={{ marginBottom: 12 }}>{t.desc}</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13 }}>
              {t.features.map(f => <li key={f} style={{ display:'flex', gap:6, alignItems:'center' }}><TickIcon />{f}</li>)}
              {t.missing.map(f => <li key={f} style={{ display:'flex', gap:6, alignItems:'center', color:'#9CA3AF' }}><CrossIcon />{f}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* ─── Location Search ─── */}
      <div className="card" style={{ marginBottom: 18 }}>
        <h4 className="font-semibold" style={{ marginBottom: 10 }}>
          <MapPin size={15} style={{ marginRight: 6, color: '#4F46E5', verticalAlign: 'middle' }} />
          Select Scan Area
        </h4>
        <LocationSearch onSelect={handleLocationSelect} disabled={scanning} />
        {mapTarget && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#EEF2FF', borderRadius: 8, fontSize: 13, color: '#4338CA', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} />
            <strong>Area locked:</strong>&nbsp;{locationName}
            &nbsp;—&nbsp;{tier.drones} drones&nbsp;·&nbsp;~{selectedTier === 'minor' ? '0.8' : '2'} km radius
          </div>
        )}
      </div>

      {/* ─── Map + Launch ─── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 className="font-semibold">
            Live Mission Map
            {scanning && <span style={{ marginLeft: 10, fontSize: 12, color: '#10B981', fontWeight: 400 }}>● Scanning in progress…</span>}
          </h4>
          <button
            onClick={startScan}
            disabled={scanning || !mapTarget}
            className="btn btn-dark"
            style={{ padding: '7px 18px', opacity: !mapTarget ? 0.5 : 1 }}
          >
            <Play size={14} style={{ marginRight: 6 }} />
            {scanning ? `Deploying ${tier.drones} drones…` : `Launch ${tier.label}`}
          </button>
        </div>

        <div style={{ height: 450, position: 'relative' }}>
          <MapContainer
            center={mapTarget ? [mapTarget.lat, mapTarget.lng] : [18.5204, 73.8567]}
            zoom={mapTarget ? 15 : 5}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            {mapTarget && <FlyToLocation target={mapTarget} />}
            {scanArea && (
              <Rectangle
                bounds={scanArea}
                pathOptions={{
                  color: scanning ? '#10B981' : '#4F46E5',
                  weight: 2,
                  fillOpacity: scanning ? 0.08 : 0.05,
                  dashArray: '6, 10',
                }}
              />
            )}
            {drones.map(d => (
              <Marker key={d.id} position={[d.lat, d.lng]} icon={droneIcon} />
            ))}
          </MapContainer>

          {!mapTarget && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.6)', zIndex: 500, pointerEvents: 'none',
            }}>
              <div style={{ textAlign: 'center', color: '#6B7280' }}>
                <Search size={36} style={{ marginBottom: 10, opacity: 0.5 }} />
                <p style={{ fontWeight: 600, fontSize: 15 }}>Search a location above to begin</p>
                <p style={{ fontSize: 13 }}>Then click <strong>Launch Scan</strong></p>
              </div>
            </div>
          )}

          {/* Report Overlay */}
          {scanComplete && report && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.88)',
              zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ background: 'white', padding: 32, borderRadius: 16, boxShadow: '0 12px 48px rgba(0,0,0,0.12)', maxWidth: 420, width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <CheckCircle size={52} color="#10B981" style={{ margin: '0 auto 10px' }} />
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Scan Complete</h3>
                  <p className="text-secondary text-sm">Fleet returned safely. Full report below.</p>
                </div>

                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                  {[
                    ['Location', report.location],
                    ['Scan Plan', report.area],
                    ['Drones Deployed', `${report.droneFleet} units`],
                    ['Photos Taken', report.photosTaken],
                    ['Incidents Flagged', report.issuesFound, report.issuesFound > 3 ? '#EF4444' : '#F59E0B'],
                  ].map(([k, v, col]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{k}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: col || 'inherit' }}>{v}</span>
                    </div>
                  ))}
                  <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #E5E7EB' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Infrastructure Score</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: report.healthScore >= 75 ? '#10B981' : report.healthScore >= 55 ? '#F59E0B' : '#EF4444' }}>
                      {report.healthScore}/100
                    </span>
                  </div>
                </div>

                {report.issuesFound > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    {report.issuesFound} potential infrastructure issue{report.issuesFound > 1 ? 's' : ''} detected. Consider filing reports for verified damage.
                  </div>
                )}

                <button className="btn btn-dark" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setScanComplete(false)}>
                  Close Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
