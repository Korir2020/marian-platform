import { useState } from 'react';
import { PageShell } from './SiteChrome';

const levels = [
  { name: 'Pre-Primary', grades: 'PP1 to PP2' },
  { name: 'Primary', grades: 'Grade 1 to Grade 6' },
  { name: 'Junior School', grades: 'Grade 7 to Grade 9' },
  { name: 'Senior School', grades: 'Grade 10 to Grade 12' },
];
const line = '1px solid color-mix(in oklab, var(--learn-deep) 16%, transparent)';
const S = {
  wrap: { maxWidth: 480, margin: '0 auto', padding: '1.25rem 1rem 2rem' },
  step: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--learn-deep)', letterSpacing: '0.04em', textTransform: 'uppercase' },
  h1: { fontFamily: 'Fraunces, serif', fontSize: '1.5rem', margin: '0.25rem 0 0.25rem' },
  sub: { fontSize: '0.8125rem', opacity: 0.8, margin: '0 0 1rem' },
  list: { display: 'grid', gap: '0.5rem', marginBottom: '1rem' },
  btn: { textAlign: 'left', width: '100%', padding: '0.75rem', borderRadius: 10, border: line, background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit' },
  on: { border: '1.5px solid var(--learn)', background: 'var(--learn-soft)' },
  name: { fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600 },
  grades: { fontSize: '0.8125rem', opacity: 0.8 },
  row: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  back: { fontSize: '0.875rem', background: 'none', border: 'none', color: 'var(--learn-deep)', cursor: 'pointer', padding: '0 0.5rem' },
};

export default function LevelPicker({ go, level, onContinue }) {
  const [sel, setSel] = useState(level);
  return (
    <PageShell go={go} active="site-learning">
      <div style={S.wrap}>
        <div style={S.step}>Step 2 of 3</div>
        <h1 style={S.h1}>Choose your level</h1>
        <p style={S.sub}>CBC, Kenya's Competency-Based Curriculum</p>
        <div style={S.list}>
          {levels.map((l) => (
            <button
              key={l.name}
              type="button"
              style={{ ...S.btn, ...(sel === l.name ? S.on : null) }}
              onClick={() => setSel(l.name)}
            >
              <div style={S.name}>{l.name}</div>
              <div style={S.grades}>{l.grades}</div>
            </button>
          ))}
        </div>
        <div style={S.row}>
          <button
            type="button"
            className="mw-btn mw-btn--learn mw-btn--sm"
            disabled={!sel}
            onClick={() => onContinue(sel)}
          >
            Continue
          </button>
          <button type="button" style={S.back} onClick={() => go('pathways')}>Back</button>
        </div>
      </div>
    </PageShell>
  );
}
