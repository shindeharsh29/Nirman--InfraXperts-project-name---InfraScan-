import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { FileText, Send, Clock, CheckCircle, AlertTriangle, MapPin, ChevronRight, Image } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const STATUS_STYLE = {
  'Pending':          { bg: '#FFFBEB', color: '#D97706', dot: '#D97706' },
  'Under Review':     { bg: '#F5F3FF', color: '#7C3AED', dot: '#7C3AED' },
  'Drone Dispatched': { bg: '#EFF6FF', color: '#2563EB', dot: '#2563EB' },
  'Verified':         { bg: '#ECFEFF', color: '#0891B2', dot: '#0891B2' },
  'Resolved':         { bg: '#F0FDF4', color: '#16A34A', dot: '#16A34A' },
  'Rejected (Duplicate)': { bg: '#FEF2F2', color: '#DC2626', dot: '#DC2626' },
};

const PRIORITY_COLOR = { Critical: '#EF4444', High: '#F97316', Medium: '#EAB308', Low: '#22C55E' };

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: s.color, marginRight: 5 }} />
      {status}
    </span>
  );
}

export default function UserDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [publicComplaints, setPublicComplaints] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/api/users/my-complaints', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }})
      .then(r => setComplaints(r.data))
      .catch(console.error);

    axios.get('http://localhost:8000/api/public/complaints')
      .then(r => setPublicComplaints(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'Pending').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;
  const verified = complaints.filter(c => c.status === 'Verified').length;

  const publicResolved = publicComplaints.filter(c => c.status === 'Resolved').length;
  const publicTotal = publicComplaints.length;

  if (loading) return <div className="text-secondary" style={{ padding: 40, textAlign: 'center' }}>Loading your reports...</div>;

  return (
    <div className="animate-in">
      {/* Welcome Banner */}
      <div className="hero-banner hero-banner-dark mb-5" style={{ marginBottom: 24 }}>
        <div>
          <p className="text-sm" style={{ color: '#9CA3AF', marginBottom: 6 }}>Welcome back 👋</p>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 8 }}>{user?.username}</h2>
          <p style={{ color: '#D1D5DB', fontSize: 13, marginBottom: 16 }}>Track your infrastructure reports and their status below.</p>
          <Link to="/report" className="btn" style={{ background: 'white', color: '#111827', padding: '8px 18px', fontSize: 13 }}>
            Submit New Report <ChevronRight size={14} />
          </Link>
        </div>
        <div style={{ fontSize: 80, opacity: 0.1, fontWeight: 900, letterSpacing: -4 }}>IS</div>
      </div>

      <div className="grid grid-2 mb-6" style={{ gap: 24 }}>
         {/* Live Public Analytics */}
         <div className="card" style={{ padding: 20 }}>
            <h3 className="font-semibold text-lg mb-4 text-purple-700">Live Public Dashboard</h3>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div style={{ fontSize: 32, fontWeight: 800 }}>{publicResolved}</div>
                <div className="text-secondary text-sm">Total Incidents Resolved Statewide</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#D97706' }}>{publicTotal - publicResolved}</div>
                <div className="text-secondary text-sm">Active Issues</div>
              </div>
            </div>
            
            <div style={{ height: 300, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <MapContainer center={[18.5204, 73.8567]} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                {publicComplaints.filter(c => c.latitude).map(c => (
                  <Marker key={c.id} position={[c.latitude, c.longitude]} icon={L.divIcon({
                    className: 'custom-incident-marker',
                    html: `<div style="background-color: ${PRIORITY_COLOR[c.priority_level] || '#2563EB'}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
                    iconSize: [14, 14], iconAnchor: [7, 7]
                  })}>
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: PRIORITY_COLOR[c.priority_level] }}>
                          {c.priority_level} Priority Incident
                        </div>
                        <div style={{ fontSize: 12, margin: '4px 0' }}>{c.location_name || 'No address'}</div>
                        <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #E5E7EB' }} />
                        <div style={{ fontSize: 13, marginBottom: 4 }}>Status: <StatusBadge status={c.status} /></div>
                        <div style={{ fontSize: 11, color: '#666' }}>Reported: {new Date(c.created_at).toLocaleDateString()}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
         </div>

         {/* Stats Row */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
           <h3 className="font-semibold text-lg text-gray-800" style={{ paddingLeft: 4 }}>My Statistics</h3>
           <div className="grid grid-2" style={{ gap: 16 }}>
        {[
          { label: 'Total Reports', value: total, icon: <FileText size={18} />, bg: '#F3F4F6', color: '#111827' },
          { label: 'Pending', value: pending, icon: <Clock size={18} />, bg: '#FFFBEB', color: '#D97706' },
          { label: 'Verified', value: verified, icon: <AlertTriangle size={18} />, bg: '#ECFEFF', color: '#0891B2' },
          { label: 'Resolved', value: resolved, icon: <CheckCircle size={18} />, bg: '#F0FDF4', color: '#16A34A' },
        ].map(({ label, value, icon, bg, color }) => (
          <div key={label} className="stat-card">
            <div className="flex justify-between items-center mb-3">
              <span className="text-secondary text-sm">{label}</span>
              <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
            </div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
           </div>
         </div>
      </div>

      {/* Area Scan Demo Link */}
      <div className="card mb-6 flex justify-between items-center" style={{ background: 'linear-gradient(135deg, #E0E7FF 0%, #EDE9FE 100%)', border: '1px solid #C7D2FE' }}>
         <div>
           <h3 className="font-semibold text-lg" style={{ color: '#4338CA' }}>Infrastructure Area Scan Demo</h3>
           <p className="text-secondary text-sm">Deploy automated drone fleets for comprehensive area inspections.</p>
         </div>
         <Link to="/area-scan" className="btn" style={{ background: '#4F46E5', color: 'white' }}>Launch Scan UI</Link>
      </div>

      {/* Reports List */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">My Reports</h3>
          <Link to="/report" className="btn btn-dark btn-sm">+ New Report</Link>
        </div>

        {complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <Send size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p className="font-medium" style={{ marginBottom: 4 }}>No reports yet</p>
            <p className="text-sm" style={{ marginBottom: 16 }}>Start by submitting your first damage report.</p>
            <Link to="/report" className="btn btn-dark btn-sm">Submit a Report</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Image</th>
                  <th>Location</th>
                  <th>Priority</th>
                  <th>AI Score</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="font-semibold" style={{ color: 'var(--blue)' }}>#{c.id}</div>
                      <div className="text-xs text-muted ellipsis" style={{ maxWidth: 180 }} title={c.description}>
                        {c.description || 'No description'}
                      </div>
                    </td>
                    <td>
                      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={`http://localhost:8000${c.image_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={13} color="var(--text-muted)" />
                        <span className="ellipsis" style={{ maxWidth: 160 }} title={c.location_name}>
                          {c.location_name || (c.latitude ? `${c.latitude?.toFixed(3)}, ${c.longitude?.toFixed(3)}` : '—')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: PRIORITY_COLOR[c.priority_level] || 'var(--text-muted)' }}>
                        {c.priority_level}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.priority_score?.toFixed(1)}</div>
                      <div className="progress-bar mt-1" style={{ width: 60 }}>
                        <div className="progress-fill" style={{ width: `${Math.min(c.priority_score, 100)}%`, background: PRIORITY_COLOR[c.priority_level] }} />
                      </div>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-secondary text-sm">
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
