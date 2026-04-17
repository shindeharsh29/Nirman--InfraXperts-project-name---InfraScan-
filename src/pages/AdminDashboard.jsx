import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { ShieldAlert, CheckCircle, Clock, AlertTriangle, Send, Eye, CheckSquare, MapPin, X, Upload, TrendingUp, Activity } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const STATUS_STYLE = {
  'Pending':          { bg: '#FFFBEB', color: '#D97706' },
  'Under Review':     { bg: '#F5F3FF', color: '#7C3AED' },
  'Drone Dispatched': { bg: '#EFF6FF', color: '#2563EB' },
  'Verified':         { bg: '#ECFEFF', color: '#0891B2' },
  'Resolved':         { bg: '#F0FDF4', color: '#16A34A' },
  'Rejected (Duplicate)': { bg: '#FEF2F2', color: '#DC2626' },
};

const PRIORITY_COLOR = { Critical: '#EF4444', High: '#F97316', Medium: '#EAB308', Low: '#22C55E' };
const STATUS_ORDER = ['Pending', 'Under Review', 'Drone Dispatched', 'Verified', 'Resolved'];

function Badge({ status }) {
  const s = STATUS_STYLE[status] || { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: s.color, marginRight: 5 }} />
      {status}
    </span>
  );
}

export default function AdminDashboard({ view = 'overview' }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [previewComplaint, setPreviewComplaint] = useState(null);
  const [droneId, setDroneId] = useState(null);
  const [droneFile, setDroneFile] = useState(null);
  const [droneLoading, setDroneLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  useEffect(() => { fetchComplaints(); }, []);

  const fetchComplaints = async () => {
    try {
      const { data } = await axios.get('http://localhost:8000/api/complaints');
      setComplaints(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, newStatus) => {
    setActionId(id);
    try {
      await axios.put(`http://localhost:8000/api/complaints/${id}/status?status=${encodeURIComponent(newStatus)}`);
      await fetchComplaints();
    } catch (e) { console.error(e); }
    setActionId(null);
  };

  const submitDroneVerify = async () => {
    if (!droneFile) return;
    setDroneLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', droneFile);
      await axios.post(`http://localhost:8000/api/complaints/${droneId}/verify`, fd);
      await fetchComplaints();
      setDroneId(null); setDroneFile(null);
    } catch (e) { console.error(e); }
    setDroneLoading(false);
  };

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'Pending').length,
    dispatched: complaints.filter(c => c.status === 'Drone Dispatched').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
    critical: complaints.filter(c => c.priority_level === 'Critical').length,
  };

  const chartData = Object.entries(PRIORITY_COLOR).map(([name, fill]) => ({
    name, count: complaints.filter(c => c.priority_level === name).length, fill
  }));

  const statusChartData = STATUS_ORDER.map(s => ({
    name: s.replace(' ', '\n'), count: complaints.filter(c => c.status === s).length
  }));

  const filtered = complaints.filter(c =>
    (filterStatus === 'All' || c.status === filterStatus) &&
    (filterPriority === 'All' || c.priority_level === filterPriority)
  );

  if (loading) return <div className="text-secondary" style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  /* ====== OVERVIEW ====== */
  if (view === 'overview') return (
    <div className="animate-in">
      {/* Welcome banner */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="hero-banner hero-banner-dark" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12, minHeight: 140 }}>
          <div>
            <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}>Admin Command Hub</p>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Infrastructure Monitor</h2>
            <p style={{ color: '#D1D5DB', fontSize: 13 }}>Review, verify, and dispatch drone units for all reported incidents.</p>
          </div>
          <div className="flex gap-2">
            <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
              {stats.pending} Pending
            </span>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
              {stats.critical} Critical
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Total Reports', value: stats.total, color: '#111827', bg: '#F3F4F6', Icon: Activity },
            { label: 'Pending', value: stats.pending, color: '#D97706', bg: '#FFFBEB', Icon: Clock },
            { label: 'Drone Dispatched', value: stats.dispatched, color: '#2563EB', bg: '#EFF6FF', Icon: Send },
            { label: 'Resolved', value: stats.resolved, color: '#16A34A', bg: '#F0FDF4', Icon: CheckCircle },
          ].map(({ label, value, color, bg, Icon }) => (
            <div key={label} className="stat-card">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted">{label}</span>
                <div className="stat-icon" style={{ background: bg, color, width: 32, height: 32 }}><Icon size={16} /></div>
              </div>
              <div className="stat-value" style={{ fontSize: 24 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">Priority Distribution</h4>
            <TrendingUp size={16} color="var(--text-muted)" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="35%">
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">Status Pipeline</h4>
            <Activity size={16} color="var(--text-muted)" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusChartData} layout="vertical" barCategoryGap="30%">
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent critical */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold">Critical & High Incidents</h4>
          <a href="/admin/reports" style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}>View all →</a>
        </div>
        <ReportsTable
          complaints={complaints.filter(c => ['Critical', 'High'].includes(c.priority_level)).slice(0, 5)}
          onAction={updateStatus} actionId={actionId}
          onPreview={setPreviewComplaint} onDrone={setDroneId}
        />
      </div>
    </div>
  );

  /* ====== REPORTS TABLE VIEW ====== */
  if (view === 'reports') return (
    <div className="animate-in">
      <div className="card">
        <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
          <h3 className="font-semibold text-lg">All Incident Reports <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 14 }}>({filtered.length})</span></h3>
          <div className="flex gap-2">
            <select className="form-select" style={{ width: 'auto', padding: '7px 12px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              {[...STATUS_ORDER, 'Rejected (Duplicate)'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto', padding: '7px 12px' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="All">All Priorities</option>
              {Object.keys(PRIORITY_COLOR).map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <ReportsTable complaints={filtered} onAction={updateStatus} actionId={actionId} onPreview={setPreviewComplaint} onDrone={setDroneId} />
      </div>

      {previewComplaint && <PreviewModal complaint={previewComplaint} onClose={() => setPreviewComplaint(null)} />}
      {droneId && <DroneModal id={droneId} file={droneFile} onChange={setDroneFile} onClose={() => { setDroneId(null); setDroneFile(null); }} onSubmit={submitDroneVerify} loading={droneLoading} />}
    </div>
  );

  /* ====== MAP VIEW ====== */
  if (view === 'map') return <LiveMapView complaints={complaints} />;

  /* ====== ANALYTICS ====== */
  if (view === 'analytics') return (
    <div className="animate-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 24 }}>
        {[
          { label: 'Avg AI Score', value: (complaints.reduce((a, c) => a + (c.priority_score || 0), 0) / (complaints.length || 1)).toFixed(1) },
          { label: 'Resolution Rate', value: `${Math.round(stats.resolved / (stats.total || 1) * 100)}%` },
          { label: 'Drone Deployments', value: complaints.filter(c => ['Drone Dispatched', 'Verified', 'Resolved'].includes(c.status)).length },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <div className="text-muted text-sm mb-2">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h4 className="font-semibold mb-4">Priority Breakdown</h4>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={e => `${e.name}: ${e.count}`}>
                {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h4 className="font-semibold mb-4">Status Distribution</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statusChartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  return null;
}

/* ====== SUB-COMPONENTS ====== */
function ReportsTable({ complaints, onAction, actionId, onPreview, onDrone }) {
  if (!complaints.length) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>No incidents found.</div>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead><tr>
          <th>ID</th><th>Image</th><th>Location</th><th>Description</th>
          <th>Priority</th><th>AI Score</th><th>Status</th><th>Date</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {complaints.map(c => (
            <tr key={c.id}>
              <td><span style={{ fontWeight: 600, color: 'var(--blue)' }}>#{c.id}</span></td>
              <td>
                <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer' }}
                     onClick={() => onPreview(c)}>
                  <img src={`http://localhost:8000${c.image_path}`} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => e.target.style.display = 'none'} />
                </div>
              </td>
              <td>
                <div className="ellipsis text-sm text-secondary" style={{ maxWidth: 160 }} title={c.location_name}>
                  <MapPin size={12} style={{ marginRight: 4, flexShrink: 0, verticalAlign: 'middle' }} />
                  {c.location_name || (c.latitude ? `${c.latitude?.toFixed(2)},${c.longitude?.toFixed(2)}` : '—')}
                </div>
              </td>
              <td>
                <div className="ellipsis text-sm" style={{ maxWidth: 180 }} title={c.description}>
                  {c.description || <span className="text-muted">No description</span>}
                </div>
              </td>
              <td>
                <span style={{ fontWeight: 700, color: PRIORITY_COLOR[c.priority_level] || 'var(--text-muted)' }}>{c.priority_level}</span>
              </td>
              <td>
                <div className="font-semibold">{c.priority_score?.toFixed(1)}</div>
                <div className="progress-bar mt-1" style={{ width: 52 }}>
                  <div className="progress-fill" style={{ width: `${Math.min(c.priority_score, 100)}%`, background: PRIORITY_COLOR[c.priority_level] }} />
                </div>
              </td>
              <td><Badge status={c.status} /></td>
              <td className="text-muted text-sm" style={{ whiteSpace: 'nowrap' }}>
                {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </td>
              <td>
                <WorkflowButtons c={c} onAction={onAction} actionId={actionId} onDrone={onDrone} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkflowButtons({ c, onAction, actionId, onDrone }) {
  const loading = actionId === c.id;
  if (c.status === 'Pending') return (
    <button className="btn btn-sm btn-purple" onClick={() => onAction(c.id, 'Under Review')} disabled={loading}>
      <Eye size={12} /> {loading ? '...' : 'Review'}
    </button>
  );
  if (c.status === 'Under Review') return (
    <button className="btn btn-sm btn-blue"
      onClick={async () => {
        try {
          // Try real MAVLink dispatch first
          await axios.post(`http://localhost:8000/api/drone/dispatch/${c.id}`);
        } catch {
          // Fallback: just update status
          await onAction(c.id, 'Drone Dispatched');
        }
        onDrone(c.id);
      }}
      disabled={loading}>
      <Send size={12} /> {loading ? '...' : 'Dispatch Drone 🚁'}
    </button>
  );
  if (c.status === 'Drone Dispatched') return (
    <button className="btn btn-sm btn-cyan" onClick={() => onDrone(c.id)}>
      <Upload size={12} /> Upload Footage
    </button>
  );
  if (c.status === 'Verified') return (
    <button className="btn btn-sm btn-green" onClick={() => onAction(c.id, 'Resolved')} disabled={loading}>
      <CheckCircle size={12} /> {loading ? '...' : 'Resolve'}
    </button>
  );
  if (c.status === 'Resolved') return <span style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>✅ Done</span>;
  return null;
}

function APMPlannerVisuals({ telemetry, connected }) {
  const pitch = connected ? (telemetry?.pitch || 0) : 0;
  const roll = connected ? (telemetry?.roll || 0) : 0;
  const heading = connected ? (telemetry?.heading || 0) : 0;
  const alt = connected ? (telemetry?.alt || 0) : 0;
  
  return (
    <div style={{ background: '#111', color: 'white', borderRadius: 8, padding: 10, display: 'flex', gap: 10, alignItems: 'center', height: 140, overflow: 'hidden', position: 'relative', border: '1px solid #333' }}>
      {/* Attitude Indicator */}
      <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(to bottom, #3b82f6 50%, #8b5cf6 50%)', border: '2px solid #555', position: 'relative', overflow: 'hidden', transform: `rotate(${roll}deg)`, flexShrink: 0 }}>
         <div style={{ position: 'absolute', top: `calc(50% + ${pitch * 2}px)`, left: 0, right: 0, height: 2, background: 'white' }} />
         <div style={{ position: 'absolute', top: '50%', left: 20, right: 20, height: 2, background: '#facc15' }} />
         <div style={{ position: 'absolute', top: '40%', left: '48%', right: '48%', height: 4, background: '#facc15' }} />
      </div>

      {/* Compass */}
      <div style={{ width: 100, height: 100, borderRadius: '50%', border: '2px solid #555', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222', flexShrink: 0 }}>
         <div style={{ position: 'absolute', fontSize: 10, top: 4, fontWeight: 'bold' }}>N</div>
         <div style={{ position: 'absolute', fontSize: 10, bottom: 4 }}>S</div>
         <div style={{ position: 'absolute', fontSize: 10, left: 4 }}>W</div>
         <div style={{ position: 'absolute', fontSize: 10, right: 4 }}>E</div>
         <div style={{ width: 2, height: 40, background: '#ef4444', transformOrigin: 'bottom center', position: 'absolute', bottom: '50%', transform: `rotate(${heading}deg)` }} />
         <div style={{ fontSize: 14, fontWeight: 700, zIndex: 10, background: '#111', padding: '1px 4px', borderRadius: 4 }}>{heading.toFixed(0)}°</div>
      </div>

      {/* Alt Tape */}
      <div style={{ flex: 1, height: '100%', background: '#222', border: '1px solid #444', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
         <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>{alt.toFixed(1)}m</div>
         <div style={{ fontSize: 10, color: '#888', marginTop: 2, letterSpacing: 1 }}>ALTITUDE</div>
      </div>
    </div>
  );
}

/* ====== DRONE STATUS CONSTANTS ====== */
const DRONE_PHASES = [
  { id: 'takeoff',    label: 'Taking Off',        icon: '🚀', color: '#F59E0B', duration: 2000 },
  { id: 'flying',     label: 'Flying to Location', icon: '🚁', color: '#3B82F6', duration: 6000 },
  { id: 'arrived',    label: 'On Site — Scanning', icon: '🔍', color: '#8B5CF6', duration: 5000 },
  { id: 'returning',  label: 'Returning to Base',  icon: '↩️', color: '#06B6D4', duration: 5000 },
  { id: 'landed',     label: 'Mission Complete',   icon: '✅', color: '#10B981', duration: 0 },
];

/* Base "home" coordinates for simulated drones */
const DRONE_BASE = { lat: 18.53, lng: 73.85 };

/* Lerp between two coords by t in [0,1] */
function lerpPos(a, b, t) {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/* ====== LIVE MAP VIEW with Simulated Drone Dispatch ====== */
function LiveMapView({ complaints, onStatusUpdate }) {
  const [telemetry, setTelemetry]   = useState(null);
  const [clusters, setClusters]     = useState([]);
  // simulatedDrones: Map<complaintId, { lat, lng, phase, complaint, progress }>
  const [simDrones, setSimDrones]   = useState({});
  const intervalsRef                = React.useRef({});

  /* Drone icon factory */
  const makeDroneIcon = (phase) => L.divIcon({
    html: `<div style="font-size:26px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5));animation:drone-pulse 1s infinite alternate;">${phase === 'landed' ? '🏠' : '🚁'}</div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], className: '',
  });

  /* ── Side-effects: telemetry polling + cluster fetch ── */
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const { data } = await axios.get('http://localhost:8000/api/complaints/clusters',
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setClusters(data);
      } catch {}
    };
    fetchClusters();

    const poll = async () => {
      try { const { data } = await axios.get('http://localhost:8000/api/drone/telemetry'); setTelemetry(data); } catch {}
    };
    poll();
    const telInterval = setInterval(poll, 2000);
    return () => { clearInterval(telInterval); Object.values(intervalsRef.current).forEach(clearInterval); };
  }, []);

  /* ── Dispatch a simulated drone ── */
  const dispatchTo = async (complaint) => {
    if (!complaint.latitude || !complaint.longitude) { alert('This complaint has no GPS coordinates.'); return; }
    if (simDrones[complaint.id]?.phase !== 'landed' && simDrones[complaint.id]) return; // already flying

    /* Update DB status */
    try {
      await axios.put(`http://localhost:8000/api/complaints/${complaint.id}/status?status=Drone%20Dispatched`,
        {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (onStatusUpdate) onStatusUpdate();
    } catch {}

    /* Auto-launch APM Planner GUI and send SITL waypoint */
    try {
      await axios.post('http://localhost:8000/api/drone/launch-apm', {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      await axios.post(`http://localhost:8000/api/drone/dispatch/${complaint.id}`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
    } catch {}


    const target = { lat: complaint.latitude, lng: complaint.longitude };
    const origin = { ...DRONE_BASE };

    /* Init drone at base */
    setSimDrones(prev => ({ ...prev, [complaint.id]: { lat: origin.lat, lng: origin.lng, phase: 'takeoff', complaint } }));

    /* Phase runner */
    const PHASES = DRONE_PHASES;
    let phaseIdx = 0;
    const tick  = 100; // ms between position updates

    const runPhase = () => {
      if (phaseIdx >= PHASES.length) return;
      const phase = PHASES[phaseIdx];

      if (phase.id === 'takeoff') {
        setSimDrones(prev => ({ ...prev, [complaint.id]: { ...prev[complaint.id], phase: 'takeoff' } }));
      }

      if (phase.id === 'flying') {
        /* Animate toward target */
        const steps = phase.duration / tick;
        let step = 0;
        intervalsRef.current[complaint.id] = setInterval(() => {
          step++;
          const t = Math.min(step / steps, 1);
          const pos = lerpPos(origin, target, t);
          setSimDrones(prev => ({ ...prev, [complaint.id]: { ...prev[complaint.id], lat: pos.lat, lng: pos.lng, phase: 'flying', progress: Math.round(t * 100) } }));
          if (step >= steps) clearInterval(intervalsRef.current[complaint.id]);
        }, tick);
      }

      if (phase.id === 'arrived') {
        clearInterval(intervalsRef.current[complaint.id]);
        setSimDrones(prev => ({ ...prev, [complaint.id]: { ...prev[complaint.id], lat: target.lat, lng: target.lng, phase: 'arrived', progress: 100 } }));
      }

      if (phase.id === 'returning') {
        /* Animate back to base */
        const steps = phase.duration / tick;
        let step = 0;
        intervalsRef.current[complaint.id] = setInterval(() => {
          step++;
          const t = Math.min(step / steps, 1);
          const pos = lerpPos(target, origin, t);
          setSimDrones(prev => ({ ...prev, [complaint.id]: { ...prev[complaint.id], lat: pos.lat, lng: pos.lng, phase: 'returning', progress: Math.round(t * 100) } }));
          if (step >= steps) clearInterval(intervalsRef.current[complaint.id]);
        }, tick);
      }

      if (phase.id === 'landed') {
        setSimDrones(prev => ({ ...prev, [complaint.id]: { ...prev[complaint.id], lat: origin.lat, lng: origin.lng, phase: 'landed', progress: 100 } }));
        /* Auto-clear after 4s */
        setTimeout(() => setSimDrones(prev => { const n = {...prev}; delete n[complaint.id]; return n; }), 4000);
        return;
      }

      phaseIdx++;
      setTimeout(runPhase, phase.duration);
    };

    setTimeout(runPhase, 0);
  };

  const connected = telemetry?.connected && !telemetry?.stale;
  const dronePos  = telemetry?.lat && telemetry?.lng ? [telemetry.lat, telemetry.lng] : null;
  const activeDrones = Object.values(simDrones);

  return (
    <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, height: 'calc(100vh - 140px)' }}>

      {/* ── MAP ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="flex justify-between items-center" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h4 className="font-semibold">Live Incident + Drone Map</h4>
          <div className="flex gap-2">
            <span className="badge" style={{ background: activeDrones.filter(d=>d.phase!=='landed').length ? '#EFF6FF' : '#F3F4F6', color: activeDrones.filter(d=>d.phase!=='landed').length ? '#2563EB' : '#9CA3AF' }}>
              {activeDrones.filter(d=>d.phase!=='landed').length > 0 ? `🚁 ${activeDrones.filter(d=>d.phase!=='landed').length} Active` : '⚪ No drones'}
            </span>
            <span className="badge" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              {complaints.filter(c => c.latitude).length} incidents
            </span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <MapContainer center={[18.9, 73.8]} zoom={7} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

            {/* Incident markers */}
            {complaints.filter(c => c.latitude && c.longitude).map(c => (
              <Marker key={c.id} position={[c.latitude, c.longitude]} icon={L.divIcon({
                className: 'custom-incident-marker',
                html: `<div style="background-color:${PRIORITY_COLOR[c.priority_level]||'#2563EB'};width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px ${PRIORITY_COLOR[c.priority_level]||'#2563EB'}88;"></div>`,
                iconSize: [14, 14], iconAnchor: [7, 7],
              })}>
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    <strong style={{ color: PRIORITY_COLOR[c.priority_level] }}>#{c.id} — {c.priority_level}</strong>
                    <div style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>{c.location_name || 'No address'}</div>
                    <div style={{ fontSize: 12, marginBottom: 8 }}>Score: {c.priority_score?.toFixed(1)} | <Badge status={c.status} /></div>
                    {['Pending', 'Under Review'].includes(c.status) && (
                      <button onClick={() => dispatchTo(c)}
                        disabled={simDrones[c.id] && simDrones[c.id].phase !== 'landed'}
                        style={{ width: '100%', padding: '7px', background: '#2563EB', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        {simDrones[c.id] ? '🚁 Drone Dispatched' : '🚁 Dispatch Drone Here'}
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Simulated drone markers */}
            {activeDrones.map(d => (
              <Marker key={`sim-${d.complaint.id}`} position={[d.lat, d.lng]} icon={makeDroneIcon(d.phase)}>
                <Popup>
                  <div style={{ minWidth: 160, fontSize: 13 }}>
                    <strong>🚁 Drone → #{d.complaint.id}</strong>
                    <div style={{ marginTop: 6, color: DRONE_PHASES.find(p=>p.id===d.phase)?.color }}>
                      {DRONE_PHASES.find(p=>p.id===d.phase)?.label}
                    </div>
                    {d.progress !== undefined && d.progress < 100 && (
                      <div style={{ marginTop: 4, background: '#E5E7EB', borderRadius: 4, height: 4 }}>
                        <div style={{ width: `${d.progress}%`, height: 4, background: '#3B82F6', borderRadius: 4, transition: 'width 0.1s' }} />
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Real MAVLink drone (if SITL is running) */}
            {dronePos && (
              <Marker position={dronePos} icon={L.divIcon({
                html: `<div style="font-size:28px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5));animation:drone-pulse 1.5s ease-in-out infinite;">🛸</div>`,
                iconSize: [36, 36], iconAnchor: [18, 18], className: '',
              })}>
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <strong>🛸 MAVLink Drone</strong>
                    <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.8 }}>
                      Alt: {telemetry?.alt}m | Speed: {telemetry?.speed} m/s<br />
                      Heading: {telemetry?.heading?.toFixed(0)}° | Mode: {telemetry?.mode}<br />
                      Battery: {telemetry?.battery}% | {telemetry?.armed ? '🔴 Armed' : '🟢 Disarmed'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

        {/* APM Planner */}
        <div className="card" style={{ padding: 14 }}>
          <div className="flex justify-between items-center mb-3">
            <h5 className="font-semibold">APM Planner Telemetry</h5>
            <span className="badge" style={{ background: connected ? '#F0FDF4' : '#FEF2F2', color: connected ? '#16A34A' : '#DC2626', fontSize: 11 }}>
              {connected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
          {connected
            ? <APMPlannerVisuals telemetry={telemetry} connected={connected} />
            : <div style={{ textAlign: 'center', padding: '14px 0', color: 'var(--text-muted)', fontSize: 13, background: '#F9FAFB', borderRadius: 8 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>🛰️</div>
                <p className="font-medium">No MAVLink Signal</p>
                <p className="text-xs">Simulated drones active below</p>
              </div>
          }
        </div>

        {/* Active Mission Status */}
        {activeDrones.length > 0 && (
          <div className="card" style={{ padding: 14 }}>
            <h5 className="font-semibold mb-3" style={{ display:'flex', alignItems:'center', gap:6 }}>
              🚁 Active Missions <span style={{ fontWeight:400, fontSize:12, color:'var(--text-muted)' }}>({activeDrones.length})</span>
            </h5>
            {activeDrones.map(d => {
              const phase = DRONE_PHASES.find(p => p.id === d.phase);
              return (
                <div key={d.complaint.id} style={{ marginBottom: 10, padding: '10px 12px', border: `1.5px solid ${phase?.color}44`, borderRadius: 10, background: `${phase?.color}0A` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight:700, fontSize:13 }}>#{d.complaint.id} — {d.complaint.priority_level}</span>
                    <span style={{ fontSize:11, fontWeight:700, color: phase?.color }}>{phase?.icon} {phase?.label}</span>
                  </div>
                  <div className="text-xs text-muted" style={{ marginBottom: 6 }}>
                    {d.complaint.location_name || `${d.complaint.latitude?.toFixed(4)}, ${d.complaint.longitude?.toFixed(4)}`}
                  </div>
                  {/* Progress bar */}
                  {['flying','returning'].includes(d.phase) && (
                    <div style={{ background: '#E5E7EB', borderRadius: 4, height: 5, overflow:'hidden' }}>
                      <div style={{ width:`${d.progress||0}%`, height:'100%', background: phase?.color, borderRadius: 4, transition:'width 0.1s linear' }} />
                    </div>
                  )}
                  {/* Phase timeline dots */}
                  <div style={{ display:'flex', gap:4, marginTop:8, alignItems:'center' }}>
                    {DRONE_PHASES.map((p, i) => {
                      const idx   = DRONE_PHASES.findIndex(ph=>ph.id===d.phase);
                      const done  = i < idx;
                      const active= i === idx;
                      return (
                        <React.Fragment key={p.id}>
                          <div title={p.label} style={{
                            width: active ? 10: 8, height: active ? 10 : 8,
                            borderRadius: '50%',
                            background: done ? '#10B981' : active ? p.color : '#D1D5DB',
                            transition: 'all 0.3s',
                            flexShrink: 0,
                          }} />
                          {i < DRONE_PHASES.length-1 && <div style={{ flex:1, height:2, background: done?'#10B981':'#E5E7EB' }} />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Contractor Clusters */}
        <div className="card" style={{ padding: 14 }}>
          <div className="flex justify-between items-center mb-3">
            <h5 className="font-semibold" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <AlertTriangle size={15} color="#D97706" /> Contractor Groupings
            </h5>
            <span className="badge" style={{ background:'#FFFBEB', color:'#D97706' }}>{clusters.length} Clusters</span>
          </div>
          {clusters.length === 0
            ? <p className="text-xs text-muted">No nearby incidents within 0.5 km.</p>
            : <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:180, overflowY:'auto' }}>
                {clusters.map((cl, idx) => (
                  <div key={idx} style={{ padding:'8px 12px', border:'1px solid #FCD34D', background:'#FFFBEB', borderRadius:8 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#92400E', marginBottom:4 }}>Group {idx+1} — {cl.count} Incidents</div>
                    <div style={{ fontSize:11, color:'#B45309', marginBottom:8 }}>Center: {cl.center_lat.toFixed(4)}, {cl.center_lng.toFixed(4)}</div>
                    <button className="btn btn-sm" style={{ width:'100%', justifyContent:'center', background:'#D97706', color:'white', border:'none' }}
                      onClick={() => alert(`✅ Road Contractor flagged for Group ${idx+1} (${cl.count} incidents near ${cl.center_lat.toFixed(3)}, ${cl.center_lng.toFixed(3)})`)}>
                      🚧 Flag Road Contractor
                    </button>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Quick Dispatch */}
        <div className="card" style={{ flex: 1, overflow: 'auto', padding: 14 }}>
          <h5 className="font-semibold mb-1">Quick Dispatch</h5>
          <p className="text-xs text-muted mb-3">Click to deploy a simulated drone to that incident. Works without SITL.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {complaints
              .filter(c => c.latitude && ['Pending', 'Under Review'].includes(c.status))
              .slice(0, 10)
              .map(c => {
                const drone = simDrones[c.id];
                const phase = drone ? DRONE_PHASES.find(p => p.id === drone.phase) : null;
                return (
                  <button key={c.id}
                    onClick={() => dispatchTo(c)}
                    disabled={!!drone && drone.phase !== 'landed'}
                    style={{
                      textAlign: 'left', padding: '10px 12px',
                      border: `1.5px solid ${phase ? phase.color + '66' : 'var(--border)'}`,
                      borderRadius: 10, background: phase ? `${phase.color}0D` : 'none',
                      cursor: (drone && drone.phase !== 'landed') ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!drone || drone.phase === 'landed') e.currentTarget.style.background = 'var(--bg)'; }}
                    onMouseLeave={e => { if (!drone || drone.phase === 'landed') e.currentTarget.style.background = 'none'; }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 2 }}>
                      <span style={{ fontWeight:700, fontSize:13 }}>#{c.id}</span>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ fontSize:11, color: PRIORITY_COLOR[c.priority_level], fontWeight:700 }}>{c.priority_level}</span>
                        {phase && <span style={{ fontSize:11, color: phase.color, fontWeight:700 }}>{phase.icon} {phase.label}</span>}
                      </span>
                    </div>
                    <div className="text-xs text-muted ellipsis">
                      {c.location_name || `${c.latitude?.toFixed(4)}, ${c.longitude?.toFixed(4)}`}
                    </div>
                    {drone && ['flying','returning'].includes(drone.phase) && (
                      <div style={{ marginTop:5, background:'#E5E7EB', borderRadius:4, height:3, overflow:'hidden' }}>
                        <div style={{ width:`${drone.progress||0}%`, height:'100%', background: phase?.color, transition:'width 0.1s linear' }} />
                      </div>
                    )}
                  </button>
                );
              })
            }
            {complaints.filter(c => c.latitude && ['Pending', 'Under Review'].includes(c.status)).length === 0 && (
              <p className="text-xs text-muted">No geo-tagged incidents pending dispatch.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function PreviewModal({ complaint: c, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Incident #{c.id}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <img src={`http://localhost:8000${c.image_path}`} alt="Damage"
          style={{ width: '100%', borderRadius: 10, maxHeight: 340, objectFit: 'contain', background: 'var(--bg)', marginBottom: 16 }} />
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
          {[
            ['Priority', <span style={{ color: PRIORITY_COLOR[c.priority_level], fontWeight: 700 }}>{c.priority_level}</span>],
            ['AI Score', c.priority_score?.toFixed(1)],
            ['Status', <Badge status={c.status} />],
            ['Date', new Date(c.created_at).toLocaleDateString()],
            ['Location', c.location_name || '—', '1/-1'],
            ['Description', c.description || 'None', '1/-1'],
          ].map(([k, v, span]) => (
            <div key={k} style={{ gridColumn: span }}>
              <div className="text-xs text-muted mb-1">{k}</div>
              <div>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DroneModal({ id, file, onChange, onClose, onSubmit, loading }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">🚁 Upload Drone Footage — #{id}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <p className="text-secondary text-sm mb-4">Upload the drone scan image. The AI will re-analyze damage and auto-update the priority score.</p>
        <input type="file" accept="image/*" onChange={e => onChange(e.target.files[0])}
          style={{ display: 'block', width: '100%', padding: '10px 14px', border: '2px dashed var(--border)', borderRadius: 10, marginBottom: 12, cursor: 'pointer', fontSize: 13 }} />
        {file && <p style={{ fontSize: 13, color: 'var(--green)', marginBottom: 12 }}>✅ {file.name}</p>}
        <div className="flex gap-3">
          <button className="btn btn-dark flex-1" onClick={onSubmit} disabled={loading || !file}>
            {loading ? 'Analyzing...' : 'Run AI Verification'}
          </button>
          <button className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
