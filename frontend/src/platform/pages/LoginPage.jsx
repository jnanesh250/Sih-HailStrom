import { useMemo, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import stormCoast from '../assets/storm-coast.jpg';
import { api } from '../../services/api';
import '../styles/login.css';

const newCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function LoginPage() {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState(newCaptcha);
  const [captchaInput, setCaptchaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const canSubmit = useMemo(() => identity.trim() && password && captchaInput.trim(), [identity, password, captchaInput]);
  const resetCaptcha = () => { setCaptcha(newCaptcha()); setCaptchaInput(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (captchaInput.trim().toUpperCase() !== captcha) {
      setStatus('CAPTCHA does not match. Please try again.');
      resetCaptcha();
      return;
    }
    setBusy(true); setStatus('');
    try {
      const { data } = await api.login(identity.trim(), password);
      if (data?.user) {
        sessionStorage.setItem('stormsense_user', JSON.stringify(data.user));
        window.location.hash = '/command-centre';
      } else {
        setStatus('Authentication failed: no user data returned.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = 'Login could not be completed. Check the server connection.';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d) => d.msg || d.type || JSON.stringify(d)).join('; ');
      } else if (detail && typeof detail === 'object') {
        msg = detail.msg || detail.message || JSON.stringify(detail);
      } else if (err.message) {
        msg = err.message;
      }
      setStatus(msg);
      resetCaptcha();
    } finally { setBusy(false); }
  };

  return (
    <section className="login-page" style={{ backgroundImage: `url(${stormCoast})` }}>
      <div className="login-overlay" />
      <div className="login-card-wrap">
        <form className="login-card" onSubmit={submit}>
          <div className="login-heading"><ShieldCheck size={23} /><div><h1>Administration Login</h1><p>Authorised access to the StormSense platform</p></div></div>
          <label>Username / Email ID
            <span className="login-input"><UserRound size={16} /><input value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="Username or email ID" autoComplete="username" required /></span>
          </label>
          <label>Password
            <span className="login-input"><LockKeyhole size={16} /><input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Password" autoComplete="current-password" required /><button type="button" aria-label="Show or hide password" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
          </label>
          <label>CAPTCHA
            <span className="captcha-row"><strong aria-label="CAPTCHA code">{captcha}</strong><button type="button" onClick={resetCaptcha} aria-label="Refresh CAPTCHA"><RefreshCw size={17} /></button><input value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())} placeholder="Enter CAPTCHA" maxLength="6" required /></span>
          </label>
          {status && <p className="login-error" role="alert">{status}</p>}
          <button className="login-submit" type="submit" disabled={!canSubmit || busy}>{busy ? 'Verifying…' : 'Login securely'}</button>
          <p style={{ marginTop: 12, textAlign: 'center' }}>
            <a href="#/command-centre" style={{ color: '#93c5fd', textDecoration: 'none', fontSize: '0.85rem' }}>
              ← Return to Command Centre (Guest Access)
            </a>
          </p>
          <p className="login-notice">Unauthorised administrative access is strictly prohibited and subject to legal action.</p>
        </form>
      </div>
    </section>
  );
}
