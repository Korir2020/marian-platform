const S = {
  bar: { border: '1.5px solid var(--learn)', background: 'var(--learn-soft)', borderRadius: 10, padding: '0.625rem 0.75rem', margin: '0 0 1rem', fontSize: '0.8125rem' },
  tag: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7 },
};

// DESIGN ONLY: trial length is a placeholder, nothing is tracked yet.
export default function TrialBanner({ daysLeft = '[trial length]' }) {
  return (
    <div style={S.bar}>
      <div style={S.tag}>Free trial (placeholder)</div>
      <div>{daysLeft} days left to explore every lesson. No payment is taken during the trial.</div>
    </div>
  );
}
