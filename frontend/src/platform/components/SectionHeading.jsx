export default function SectionHeading({ eyebrow, title, sub, id }) {
  return (
    <div className="ss-section-head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 id={id}>{title}</h2>
      {sub && <p className="ss-sub">{sub}</p>}
    </div>
  );
}
