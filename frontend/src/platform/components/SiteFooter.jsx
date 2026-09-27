import Emblem from './Emblem.jsx';

/* Shared government-portal footer used by every page. The first
   column carries the emblem, portal name and StormSense; pages can
   pass an extra disclaimer line via `note`. */
export default function SiteFooter({ note }) {
  return (
    <footer className="gov-footer">
      <div className="gov-container">
        <div className="gov-footer-main">
          <div className="gov-footer-brand">
            <span className="gov-footer-emblem" aria-hidden="true"><Emblem height={46} /></span>
            <div>
              <div className="gov-footer-portal" lang="hi">भारत मौसम पोर्टल · Indian Weather Portal</div>
              <div className="gov-footer-name">StormSense</div>
              <div className="gov-footer-tag">Real-time weather intelligence &amp; nowcasting</div>
            </div>
          </div>
          <div className="gov-footer-col">
            <strong>PLATFORM</strong>
            <a href="#/">Home</a>
            <a href="#/command-centre">Command Centre</a>
            <a href="#/architecture">Architecture</a>
          </div>
          <div className="gov-footer-col">
            <strong>REFERENCE</strong>
            <a href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer">Official IMD weather service</a>
            <a href="#/command-centre">Live storm telemetry</a>
            <a href="#/architecture">How the system works</a>
          </div>
        </div>
        {note ? <p className="gov-footer-note">{note}</p> : null}
        <div className="gov-footer-bottom">
          <span>© 2026 StormSense · Independent demonstration platform</span>
          <span>Built for weather intelligence, public awareness and operational decision support.</span>
        </div>
      </div>
    </footer>
  );
}
