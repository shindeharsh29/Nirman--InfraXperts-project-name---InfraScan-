import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Mail, Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import './Auth.css';

// Illustrations
import signInImg from '../assets/signin_illustration.png';
import signUpImg from '../assets/signup_illustration.png';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, user } = useAuth();

  // Mode state
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Sync mode with URL query (?mode=signup)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'signup') {
      setIsSignUpMode(true);
    } else {
      setIsSignUpMode(false);
    }
  }, [location.search]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(user.is_admin ? '/admin' : '/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      // Redirect handled by useEffect
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(regUsername, regEmail, regPassword);
      // Redirect handled by useEffect
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page-container ${isSignUpMode ? 'sign-up-mode' : ''}`}>
      <div className="forms-container">
        <div className="signin-signup">
          
          {/* SIGN IN FORM */}
          <form className="auth-form sign-in-form" onSubmit={handleLogin}>
            <div className="flex items-center gap-2 mb-4">
              <div style={{ width: 32, height: 32, background: '#111827', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={18} color="white" />
              </div>
              <h2 className="font-bold text-xl">InfraScan</h2>
            </div>
            
            <h2 className="auth-title">Sign In</h2>
            {error && !isSignUpMode && <div className="auth-error">{error}</div>}
            
            <div className="auth-input-field">
              <Mail size={18} />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required 
              />
            </div>
            
            <div className="auth-input-field">
              <Lock size={18} />
              <input 
                type="password" 
                placeholder="Password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required 
              />
            </div>
            
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Processing...' : 'Login'}
            </button>

            <p className="text-sm mt-1" style={{ fontSize: 13, color: '#666' }}>
              First user to register becomes Admin
            </p>
          </form>

          {/* SIGN UP FORM */}
          <form className="auth-form sign-up-form" onSubmit={handleRegister}>
            <div className="flex items-center gap-2 mb-4">
              <div style={{ width: 32, height: 32, background: '#111827', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={18} color="white" />
              </div>
              <h2 className="font-bold text-xl">InfraScan</h2>
            </div>

            <h2 className="auth-title">Sign Up</h2>
            {error && isSignUpMode && <div className="auth-error">{error}</div>}
            
            <div className="auth-input-field">
              <User size={18} />
              <input 
                type="text" 
                placeholder="Full Name" 
                value={regUsername}
                onChange={e => setRegUsername(e.target.value)}
                required 
              />
            </div>

            <div className="auth-input-field">
              <Mail size={18} />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                required 
              />
            </div>

            <div className="auth-input-field">
              <Lock size={18} />
              <input 
                type="password" 
                placeholder="Password" 
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                required 
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Processing...' : 'Sign Up'}
            </button>

            <div style={{ background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start', maxWidth: 380, marginTop: 10 }}>
              <ShieldCheck size={16} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 11, color: '#15803D', lineHeight: 1.4, textAlign: 'left' }}>
                The first registered account automatically gets full administrative access.
              </p>
            </div>
          </form>
        </div>
      </div>

      <div className="panels-container">
        <div className="auth-panel left-panel">
          <div className="content">
            <h3>New here?</h3>
            <p>
              Join InfraScan to report infrastructure damage and contribute to city safety.
            </p>
            <button 
              className="auth-btn transparent" 
              onClick={() => navigate('/login?mode=signup')}
            >
              Sign Up
            </button>
          </div>
          <img src={signInImg} className="auth-image" alt="Sign In" />
        </div>
        
        <div className="auth-panel right-panel">
          <div className="content">
            <h3>One of us?</h3>
            <p>
              Login to track your reports and monitor infrastructure health in real-time.
            </p>
            <button 
              className="auth-btn transparent" 
              onClick={() => navigate('/login?mode=signin')}
            >
              Sign In
            </button>
          </div>
          <img src={signUpImg} className="auth-image" alt="Sign Up" />
        </div>
      </div>
    </div>
  );
}
