import { useEffect, useState } from 'react';
import { PageShell } from './SiteChrome';
import { LessonWorkspace } from '../studio/PathwayExperience';
import '../studio/styles.css';

const FILES = { python: 'python_programming', javascript: 'javascript_programming', 'software-development': 'software_development', 'web-development': 'web_development' };
const line = '1px solid color-mix(in oklab, var(--learn-deep) 16%, transparent)';
const S = {
  wrap: { maxWidth: 640, margin: '0 auto', padding: '1.25rem 1rem 2.5rem' },
  draft: { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--learn-deep)' },
  h1: { fontFamily: 'Fraunces, serif', fontSize: '1.5rem', margin: '0.25rem 0 0.5rem' },
  sub: { fontSize: '0.8125rem', opacity: 0.75, margin: '0 0 0.75rem' },
  mod: { border: '1.5px solid var(--learn)', background: 'var(--learn-soft)', borderRadius: 12, padding: '0.75rem', marginBottom: '0.75rem' },
  modT: { fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.0625rem' },
  topic: { display: 'block', width: '100%', textAlign: 'left', padding: '0.625rem 0.75rem', marginTop: '0.5rem', borderRadius: 10, border: line, background: 'transparent', color: 'inherit', cursor: 'pointer' },
  back: { fontSize: '0.875rem', background: 'none', border: 'none', color: 'var(--learn-deep)', cursor: 'pointer', padding: '0.25rem 0', marginBottom: '0.75rem' },
  blk: { border: line, borderRadius: 12, padding: '0.875rem', marginBottom: '0.75rem' },
  h4: { fontFamily: 'Fraunces, serif', fontSize: '1.0625rem', margin: '0 0 0.5rem' },
  p: { margin: '0 0 0.625rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  ul: { margin: '0 0 0.625rem', paddingLeft: '1.25rem', lineHeight: 1.6 },
  k: { display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.7, margin: '0.5rem 0 0.25rem' },
  code: { overflowX: 'auto', fontSize: '0.75rem', padding: '0.625rem', borderRadius: 8, background: 'color-mix(in oklab, currentColor 8%, transparent)', margin: '0 0 0.625rem', whiteSpace: 'pre' },
  q: { marginBottom: '0.75rem' },
  choice: { fontSize: '0.875rem', padding: '0.25rem 0 0.25rem 0.5rem', opacity: 0.9 },
};

function Gen({ v }) {
  if (v == null) return null;
  if (typeof v === 'string' || typeof v === 'number') return <p style={S.p}>{String(v)}</p>;
  if (Array.isArray(v)) return <ul style={S.ul}>{v.map((x, i) => <li key={i}>{x && typeof x === 'object' ? <Gen v={x} /> : String(x)}</li>)}</ul>;
  return <div>{Object.entries(v).map(([k, x]) => <div key={k}><b style={S.k}>{k.replace(/_/g, ' ')}</b><Gen v={x} /></div>)}</div>;
}

function Block({ b }) {
  const t = b.type;
  if (t === 'explanation') return <div style={S.blk}><h4 style={S.h4}>{b.title}</h4><Gen v={b.body} /></div>;
  if (t === 'worked_example' || t === 'example') return (
    <div style={S.blk}><h4 style={S.h4}>{b.title}</h4>
      <pre style={S.code}>{b.code}</pre>
      {b.expected_output != null && <><b style={S.k}>Expected output</b><pre style={S.code}>{String(b.expected_output)}</pre></>}
      <Gen v={b.explanation} /></div>);
  if (t === 'diagram') return (
    <div style={S.blk}><h4 style={S.h4}>{b.title}</h4>
      <pre style={S.code}>{typeof b.content === 'string' ? b.content : JSON.stringify(b.content, null, 1)}</pre>
      <p style={S.sub}>{b.alt_text}</p></div>);
  if (t === 'knowledge_check') return (
    <div style={S.blk}><h4 style={S.h4}>{b.title}</h4>
      {(b.items || []).map((q) => <div key={q.id} style={S.q}><div style={{ fontWeight: 600 }}>{q.prompt}</div>{(q.choices || []).map((c) => <div key={c.id} style={S.choice}>{c.id}. {c.text}</div>)}</div>)}
      <p style={S.sub}>Answers are not available yet.</p></div>);
  const { type, title, ...rest } = b;
  return <div style={S.blk}><h4 style={S.h4}>{title}</h4><Gen v={rest} /></div>;
}

function Intro({ v }) {
  return (
    <div style={{ ...S.mod, background: 'transparent' }}>
      <div style={S.draft}>Start here · draft</div>
      <h2 style={S.h1}>{v.title}</h2>
      {(v.sections || []).map((s) => <div key={s.heading} style={{ marginBottom: 8 }}><b>{s.heading}</b><p style={S.p}>{s.body}</p></div>)}
      {v.learning_outcomes && <div style={{ marginBottom: 8 }}><b>What you will learn</b><ul style={S.ul}>{v.learning_outcomes.map((o) => <li key={o}>{o}</li>)}</ul></div>}
      {v.terms && <details open style={S.blk}><summary><b>Key terms ({v.terms.length})</b></summary>{v.terms.map((t) => <div key={t.term} style={{ marginTop: 10 }}><b>{t.term}</b>: {t.meaning}{t.example && <pre style={S.code}>{t.example}</pre>}</div>)}</details>}
    </div>
  );
}

export default function LessonViewer({ scr, go }) {
  const [, kind, key] = String(scr).split(':');
  const file = kind === 'cyber' ? 'cybersecurity_stage_' + key : (FILES[kind] || kind) + '_' + key;
  const back = kind === 'cyber' ? 'site-cybersecurity' : 'site-pathway-' + kind;
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [intro, setIntro] = useState(null);
  const [sel, setSel] = useState(null);
  useEffect(() => {
    setD(null); setErr(''); setSel(null); setIntro(null);
    fetch(import.meta.env.BASE_URL + 'curriculum/intro_' + (kind === 'cyber' ? 'cybersecurity' : kind) + '.json').then((r) => (r.ok ? r.json() : null)).then(setIntro).catch(() => {});
    fetch(import.meta.env.BASE_URL + 'curriculum/' + file + '.json')
      .then((r) => { if (!r.ok) throw new Error('missing'); return r.json(); })
      .then(setD).catch(() => setErr('These lessons could not be loaded.'));
  }, [file]);
  const lesson = d && sel ? d.modules[sel[0]].topics[sel[1]].lesson : null;
  const extras = ['terminology', 'further_reading', 'lab_environment', 'evidence_requirements', 'professional_notes'];
  return (
    <PageShell go={go} active="site-learning">
      <div style={S.wrap}>
        <div style={S.draft}>Draft course material</div>
        {err && <p style={S.p}>{err}</p>}
        {!d && !err && <p style={S.sub}>Loading lessons...</p>}
        {d && !lesson && (<>
          <h1 style={S.h1}>{(d.course && d.course.title) || d.title || 'Lessons'}</h1>
          <p style={S.sub}>{d.course && d.course.short_description}</p>
          {intro && <Intro v={intro} />}
          {d.modules.map((m, mi) => (
            <div key={m.key || mi} style={S.mod}>
              <div style={S.modT}>Module {mi + 1}: {m.title}</div>
              <div style={S.sub}>{m.description}</div>
              {m.topics.map((t, ti) => (
                <button key={t.key || ti} type="button" style={S.topic} onClick={() => { setSel([mi, ti]); window.scrollTo(0, 0); }}>
                  <b>{t.title}</b>{t.lesson && t.lesson.estimated_minutes ? <span style={{ opacity: 0.7 }}> · {t.lesson.estimated_minutes} min</span> : null}
                </button>))}
            </div>))}
          {d.practical_project && <details style={S.blk}><summary><b>Practical project: {d.practical_project.title}</b></summary><Gen v={d.practical_project} /></details>}
          <button type="button" style={S.back} onClick={() => go(back)}>Back to course</button>
        </>)}
        {lesson && (<>
          <button type="button" style={S.back} onClick={() => { setSel(null); window.scrollTo(0, 0); }}>All lessons</button>
          <h1 style={S.h1}>{lesson.title}</h1>
          <p style={S.sub}>{lesson.estimated_minutes} minutes</p>
          {lesson.objectives && <div style={S.blk}><h4 style={S.h4}>Objectives</h4><Gen v={lesson.objectives} /></div>}
          {(lesson.blocks || []).map((b, i) => <Block key={i} b={b} />)}
        <LessonWorkspace theme={kind === 'software-development' ? 'software' : kind === 'javascript' ? 'javascript' : 'python'} moduleTitle={d.modules[sel[0]].title} topic={lesson.title} />
          {lesson.revision_notes && <div style={S.blk}><h4 style={S.h4}>Revision notes</h4><Gen v={lesson.revision_notes} /></div>}
          {extras.filter((e) => lesson[e]).map((e) => <div key={e} style={S.blk}><h4 style={S.h4}>{e.replace(/_/g, ' ')}</h4><Gen v={lesson[e]} /></div>)}
          <button type="button" style={S.back} onClick={() => { setSel(null); window.scrollTo(0, 0); }}>All lessons</button>
        </>)}
      </div>
    </PageShell>
  );
}
