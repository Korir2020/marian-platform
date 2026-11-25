import { useState } from 'react';
import { PageShell } from './SiteChrome';

const levels = ['Pre-Primary', 'Primary', 'Junior School', 'Senior School'];
const others = [
  'Cambridge International', 'British Curriculum', 'Pearson Edexcel',
  'University & College', 'Other International', 'Technology, Coding & AI',
  'Business & Entrepreneurship', 'Technical & Vocational',
  'Creative Arts & Design', 'Languages & Communication',
  'Professional & Career', 'General Knowledge & Lifelong',
];
const line = '1px solid color-mix(in oklab, var(--learn-deep) 16%, transparent)';
const S = {
  wrap: { maxWidth: 480, margin: '0 auto', padding: '1.25rem 1rem 2rem' },
  step: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--learn-deep)', letterSpacing: '0.04em', textTransform: 'uppercase' },
  h1: { fontFamily: 'Fraunces, serif', fontSize: '1.5rem', margin: '0.25rem 0 0.75rem' },
  search: { width: '100%', boxSizing: 'border-box', height: '2.25rem', padding: '0 0.75rem', fontSize: '0.875rem', border: line, borderRadius: 9999, background: 'transparent', marginBottom: '1rem' },
  card: { border: '1.5px solid var(--learn)', borderRadius: 12, padding: '0.875rem', background: 'var(--learn-soft)', marginBottom: '1rem' },
  cardT: { fontFamily: 'Fraunces, serif', fontSize: '1.0625rem', fontWeight: 600 },
  cardD: { fontSize: '0.8125rem', margin: '0.25rem 0 0.625rem', opacity: 0.8 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' },
  chip: { fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 9999, border: line },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' },
  tile: { border: line, borderRadius: 10, padding: '0.5rem 0.625rem', opacity: 0.7 },
  tileT: { fontSize: '0.8125rem', fontWeight: 600 },
  soon: { fontSize: '0.6875rem', opacity: 0.7 },
  label: { fontSize: '0.75rem', fontWeight: 600, margin: '0 0 0.5rem', opacity: 0.8 },
};

export default function PathwayPicker({ go, onContinue }) {
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const showCbc = !t || 'cbc kenya competency-based curriculum'.includes(t);
  const list = others.filter((n) => n.toLowerCase().includes(t));
  return (
    <PageShell go={go} active="site-learning">
      <div style={S.wrap}>
        <div style={S.step}>Step 1 of 3</div>
        <h1 style={S.h1}>Choose your pathway</h1>
        <input
          style={S.search}
          type="search"
          placeholder="Search pathways"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {showCbc && (
          <div style={S.card}>
            <div style={S.cardT}>CBC</div>
            <div style={S.cardD}>PP1 to Grade 12, Kenya's Competency-Based Curriculum</div>
            <div style={S.chips}>
              {levels.map((l) => (
                <span key={l} style={S.chip}>{l}</span>
              ))}
            </div>
            <button type="button" className="mw-btn mw-btn--learn mw-btn--sm" onClick={onContinue}>
              Continue
            </button>
          </div>
        )}
        {list.length > 0 && <p style={S.label}>More pathways</p>}
        <div style={S.grid}>
          {list.map((n) => (
            <div key={n} style={S.tile}>
              <div style={S.tileT}>{n}</div>
              <div style={S.soon}>Coming soon</div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
