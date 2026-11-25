import { useState } from 'react';
import { BookOpen, ChevronDown, Compass, Laptop, Search, Sparkles } from 'lucide-react';
import python from './data/start-here/python.json';
import javascript from './data/start-here/javascript.json';
import web from './data/start-here/web-development.json';
import software from './data/start-here/software-development.json';
import cyber from './data/start-here/cybersecurity.json';

export const introductions: Record<string, any> = {
  python, javascript, web, 'web-development': web, software, 'software-development': software, cybersecurity: cyber,
};

export function StartHere({ courseKey, compact = false }: { courseKey: string; compact?: boolean }) {
  const intro = introductions[courseKey];
  const [termsOpen, setTermsOpen] = useState(false);
  const [query, setQuery] = useState('');
  if (!intro) return null;
  const filtered = intro.terms.filter((term: any) =>
    `${term.term} ${term.meaning} ${term.how_used}`.toLowerCase().includes(query.toLowerCase())
  );
  return <section className={`start-here ${compact ? 'start-here-compact' : ''}`} aria-labelledby={`start-${courseKey}`}>
    <div className="start-here-head">
      <div className="start-here-icon"><BookOpen size={21}/></div>
      <div className="start-here-heading">
        <span className="start-here-eyebrow"><Sparkles size={13}/> YOUR FIRST STEP</span>
        <h2 id={`start-${courseKey}`}>Start here</h2>
        <p>A friendly introduction before your first module. No prior experience is expected.</p>
      </div>
      <span className="start-here-level">BEGINNER</span>
    </div>
    <div className="start-here-note"><strong>Starter Glossary</strong><p>These are some of the important words you will meet at the beginning of this course. You will discover more terms as you progress through the lessons. Every new important term should be explained before you are expected to use it.</p></div>{courseKey === "cybersecurity" && <div className="cyber-safety-note"><strong>Authorised practice only</strong><p>Cybersecurity practicals must only be performed on personally owned devices, authorised laboratories, or systems where you have explicit permission to test. Never scan, access, disrupt or modify someone else’s system without permission.</p></div>}
    <div className="start-here-sections">
      {intro.sections.map((section: any, index: number) => <article className="start-here-section" key={section.heading}>
        <span className="start-section-number">{String(index + 1).padStart(2, '0')}</span>
        <div><h3>{section.heading}</h3><p>{section.body}</p></div>
      </article>)}
    </div>
    <div className="start-here-terms">
      <button className="start-terms-toggle" onClick={() => setTermsOpen(!termsOpen)} aria-expanded={termsOpen}>
        <span className="start-terms-icon"><BookOpen size={17}/></span>
        <span><strong>Starter Glossary</strong><small>{intro.terms.length} starting terms · expand one term at a time</small></span>
        <ChevronDown size={19} className={termsOpen ? 'rotated' : ''}/>
      </button>
      {termsOpen && <div className="start-terms-list">
        <label className="glossary-search"><Search size={15}/><input aria-label="Search starter glossary" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a term…"/></label>
        {filtered.map((term: any, i: number) => <article className="start-term" key={term.term}>
          <span>{String(i + 1).padStart(2, '0')}</span>
          <details>
            <summary><h4>{term.term}</h4><ChevronDown size={16}/></summary>
            <div className="term-detail-grid">
              <div><b>Meaning</b><p>{term.meaning}</p></div>
              <div><b>How it is used</b><p>{term.how_used}</p></div>
              <div><b>When to use it</b><p>{term.when_to_use}</p></div>
              <div><b>Why it matters</b><p>{term.why_it_matters}</p></div>
              <div className="term-example"><b>Practical example</b><pre>{term.practical_example}</pre><p>{term.example_explanation}</p></div>
            </div>
          </details>
        </article>)}
        {!filtered.length && <p className="glossary-empty">No starter term matches “{query}”.</p>}
      </div>}
    </div>
    <div className="start-here-footer"><span><Compass size={16}/> Take your time. Learn one idea at a time.</span><span><Laptop size={16}/> Learn by reading and practising</span></div>
  </section>;
}
