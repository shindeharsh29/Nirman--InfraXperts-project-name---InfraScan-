import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Camera, MapPin, Upload, CheckCircle2, AlertTriangle, X, FileImage } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SubmitComplaint() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [location, setLocation] = useState({ lat: null, lng: null, name: null });
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idle');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) { setImage(file); const r = new FileReader(); r.onloadend = () => setPreview(r.result); r.readAsDataURL(file); }
  };

  const getLocation = async () => {
    setIsGettingLocation(true);
    if (!navigator.geolocation) { alert('Geolocation not supported'); setIsGettingLocation(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        try {
          const { data } = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          setLocation({ lat, lng, name: data.display_name || 'GPS Location' });
        } catch { setLocation({ lat, lng, name: 'GPS Location captured' }); }
        setIsGettingLocation(false);
      },
      () => { alert('Could not get location.'); setIsGettingLocation(false); }
    );
  };
  const setDemoLocation = () => {
    const baseLat = 18.5204;
    const baseLng = 73.8567;
    const latOffset = (Math.random() - 0.5) * 0.005; 
    const lngOffset = (Math.random() - 0.5) * 0.005; 
    setLocation({
      lat: baseLat + latOffset,
      lng: baseLng + lngOffset,
      name: 'Demo InfraScan Test Zone'
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) { alert('Please upload an image of the damage.'); return; }
    setStatus('submitting');
    const formData = new FormData();
    formData.append('file', image);
    formData.append('description', description);
    formData.append('location_importance_score', description.length > 50 ? 8.0 : 5.0);
    if (location.lat) formData.append('latitude', location.lat);
    if (location.lng) formData.append('longitude', location.lng);
    if (location.name) formData.append('location_name', location.name);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:8000/api/complaints', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(res.data);
      setStatus('success');
    } catch (err) {
      console.error('Submit error:', err?.response?.status, err?.response?.data, err?.message);
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(d=>d.msg).join(', ') : err?.message || 'Unknown error';
      setErrorMsg(msg);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  if (status === 'success' && result) {
    return (
      <div className="animate-in" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 64, height: 64, background: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={32} color="#16A34A" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Report Submitted!</h2>
          <p className="text-secondary" style={{ fontSize: 14, marginBottom: 24 }}>Your report has been received and is being analyzed by our AI system.</p>

          <div className="card" style={{ background: 'var(--bg)', marginBottom: 24, textAlign: 'left' }}>
            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Report ID', `#${result.id}`],
                ['Priority', result.priority_level],
                ['AI Score', result.priority_score?.toFixed(1)],
                ['Status', result.status],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs text-muted mb-1">{k}</div>
                  <div className="font-semibold">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3" style={{ justifyContent: 'center' }}>
            <button className="btn btn-dark" onClick={() => navigate('/dashboard')}>View My Reports</button>
            <button className="btn btn-outline" onClick={() => { setStatus('idle'); setImage(null); setPreview(null); setDescription(''); setLocation({ lat: null, lng: null, name: null }); setResult(null); }}>
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="mb-5">
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Report Infrastructure Damage</h2>
        <p className="text-secondary text-sm">Upload evidence, capture location, and our AI will assess the damage severity.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* Left: Image Upload */}
          <div className="card">
            <h4 className="font-semibold mb-3">Evidence Photo</h4>
            <div
              onClick={() => fileInputRef.current.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              style={{
                border: `2px dashed ${preview ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10,
                minHeight: 200,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden', position: 'relative',
                background: preview ? 'transparent' : 'var(--bg)',
                transition: 'border-color 0.2s'
              }}
            >
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*,video/*" style={{ display: 'none' }} />
              {preview ? (
                <>
                  <img src={preview} alt="Preview" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                  <button type="button" onClick={e => { e.stopPropagation(); setImage(null); setPreview(null); }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <FileImage size={32} color="var(--text-muted)" style={{ marginBottom: 10 }} />
                  <p className="font-medium text-sm" style={{ marginBottom: 4 }}>Click or drag to upload</p>
                  <p className="text-xs text-muted">JPEG, PNG up to 10MB</p>
                </>
              )}
            </div>
            {image && (
              <p className="text-xs text-secondary mt-2" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} color="var(--green)" /> {image.name}
              </p>
            )}
          </div>

          {/* Right: Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h4 className="font-semibold mb-3">Location</h4>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <button type="button" onClick={getLocation} disabled={isGettingLocation} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
                  <MapPin size={15} />
                  {isGettingLocation ? 'Fetching...' : 'GPS Location'}
                </button>
                <button type="button" onClick={setDemoLocation} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', background: '#F5F3FF', borderColor: '#DDD6FE', color: '#6D28D9' }}>
                  <MapPin size={15} />
                   Set Demo Location
                </button>
              </div>
              {location.name && (
                <div style={{ background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#15803D', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <MapPin size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{location.name}</span>
                </div>
              )}
            </div>

            <div className="card" style={{ flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 120 }}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the damage: location landmarks, severity, safety hazards..."
                />
              </div>
              <p className="text-xs text-muted mt-1">Detailed descriptions (50+ chars) receive a higher importance score</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="card mt-4" style={{ marginTop: 16 }}>
          {status === 'error' && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, color: '#DC2626' }}>
              <AlertTriangle size={15} /> {errorMsg || 'Failed to submit. Make sure the backend server is running at port 8000.'}
            </div>
          )}
          <button type="submit" className="btn btn-dark" style={{ width: '100%', padding: '11px 20px', fontSize: 14 }} disabled={status === 'submitting'}>
            <Upload size={16} />
            {status === 'submitting' ? 'Analyzing damage with AI...' : 'Submit Report for AI Analysis'}
          </button>
        </div>
      </form>
    </div>
  );
}
