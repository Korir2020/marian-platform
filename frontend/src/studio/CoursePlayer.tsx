import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Code2, ExternalLink, FlaskConical, Lightbulb, Menu, Play, RotateCcw, Save, Sparkles, Target, Trophy, X } from 'lucide-react';

type Block = Record<string, any>;
type Lesson = { key?:string; title:string; estimated_minutes?:number; objectives?:string[]; blocks?:Block[]; revision_notes?:string[]; terminology?:any; further_reading?:any; lab_environment?:any; evidence_requirements?:any; professional_notes?:any };
type Topic = { key?:string; title:string; description?:string; lesson?:Lesson };
type Module = { key?:string; title:string; description?:string; position?:number; topics:Topic[] };
type CourseDoc = { manifest_version?:number; course_key?:string; course:any; modules:Module[]; practical_project?:any; final_assessment?:any; provenance?:any };

const FILES:Record<string,string> = {
  python:'python_programming', javascript:'javascript_programming', html:'html', css:'css', 'web-development':'web_development', 'software-development':'software_development'
};

function fileFor(slug:string, level:string){ const base=FILES[slug] || slug; return `${base}_${level}.json`; }
function pct(done:number,total:number){ return total ? Math.round(done/total*100) : 0; }
function keyFor(slug:string,level:string){ return `marian-academy-progress:${slug}:${level}`; }
function pretty(v:any):ReactNode {
  if(v==null) return null;
  if(typeof v==='string'||typeof v==='number'||typeof v==='boolean') return <p className="lesson-prose">{String(v)}</p>;
  if(Array.isArray(v)) return <ul className="lesson-list">{v.map((x,i)=><li key={i}>{pretty(x)}</li>)}</ul>;
  return <div className="lesson-object">{Object.entries(v).map(([k,x])=><div key={k}><strong>{k.replace(/_/g,' ')}</strong>{pretty(x)}</div>)}</div>;
}

function CodePractice({code='',language='text',title='Practice workspace'}:{code?:string;language?:string;title?:string}){
  const [value,setValue]=useState(code);
  const [output,setOutput]=useState('');
  const [saved,setSaved]=useState(false);
  const [preview,setPreview]=useState(false);
  const lang=(language||'text').toLowerCase();
  const canRun=['javascript','js','html','css'].includes(lang);
  function run(){
    setSaved(false);
    if(lang==='javascript'||lang==='js'){
      try{
        const logs:string[]=[];
        const sandbox=document.createElement('iframe');
        sandbox.setAttribute('sandbox','allow-scripts'); sandbox.style.display='none';
        sandbox.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; style-src 'unsafe-inline'"><script>window.addEventListener('error',e=>parent.postMessage({m:'error',v:e.message},'*')); const original=console.log; console.log=(...a)=>parent.postMessage({m:'log',v:a.map(x=>String(x)).join(' ')},'*'); try{${value}}catch(e){parent.postMessage({m:'error',v:e.message},'*')}</script>`;
        const handler=(e:MessageEvent)=>{if(e.source!==sandbox.contentWindow)return; if(e.data?.m==='log')setOutput(x=>x?x+'\\n'+e.data.v:e.data.v); if(e.data?.m==='error')setOutput(x=>(x?x+'\\n':'')+'Error: '+e.data.v);};
        setOutput(''); window.addEventListener('message',handler); document.body.appendChild(sandbox); setTimeout(()=>{window.removeEventListener('message',handler);sandbox.remove();},900);
      }catch(e){setOutput('The browser practice runner could not start. Your draft is still saved locally.');}
    } else if(lang==='html'||lang==='css') { setPreview(true); setOutput('Preview updated below.'); }
    else setOutput('Marian review mode: this language is not executed in the browser yet. Use the workspace to write, inspect, and save your solution.');
  }
  function save(){localStorage.setItem(`marian-draft:${title}`,value);setSaved(true);}
  return <section className="lesson-lab"><div className="lesson-lab-head"><div><span className="lesson-eyebrow"><FlaskConical size={14}/> PRACTICE LAB</span><h3>{title}</h3><p>Work on the idea immediately. Drafts stay on this device.</p></div><span className="lesson-language">{language}</span></div><textarea className="lesson-editor" value={value} onChange={e=>{setValue(e.target.value);setSaved(false)}} spellCheck={false} aria-label="Practice code editor"/><div className="lesson-lab-actions"><button className="academy-button primary" onClick={run}><Play size={15}/>{canRun?'Run / preview':'Check workspace'}</button><button className="academy-button secondary" onClick={save}><Save size={15}/>{saved?'Saved':'Save draft'}</button><button className="academy-button ghost" onClick={()=>{setValue(code);setOutput('');setPreview(false)}}><RotateCcw size={15}/> Reset</button></div>{output&&<pre className="lesson-output">{output}</pre>}{preview&&<iframe className="lesson-preview" title="Practice preview" sandbox="allow-scripts" srcDoc={lang==='css'?`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>${value}</style><main style="font-family:system-ui;padding:24px"><h2>CSS practice preview</h2><p>Change your CSS and run again.</p><button>Sample button</button></main>`:`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; img-src data:"><body>${value}</body>`}/>}</section>;
}

function KnowledgeCheck({block,onComplete}:{block:Block;onComplete:()=>void}){
  const [answers,setAnswers]=useState<Record<string,string>>({}); const [checked,setChecked]=useState(false); const [score,setScore]=useState(0);
  const items=block.items||[]; const hasAnswerKey=items.some((q:any)=>q.answer||q.correct_answer);
  function check(){let s=0;items.forEach((q:any)=>{if(answers[q.id]===q.answer||answers[q.id]===q.correct_answer)s++});setScore(s);setChecked(true);onComplete();}
  return <section className="lesson-check"><div className="lesson-check-head"><CircleHelp size={18}/><div><span className="lesson-eyebrow">KNOWLEDGE CHECK</span><h3>{block.title}</h3></div>{checked&&hasAnswerKey&&<strong>{score}/{items.length}</strong>}</div>{items.map((q:any,i:number)=><div className="lesson-question" key={q.id||i}><p><b>{i+1}.</b> {q.prompt}</p><div className="lesson-choices">{(q.choices||[]).map((c:any)=><label key={c.id} className={checked&&answers[q.id]===c.id?'selected':''}><input type="radio" name={q.id} checked={answers[q.id]===c.id} onChange={()=>setAnswers({...answers,[q.id]:c.id})}/><span><b>{c.id}</b> {c.text}</span></label>)}</div>{checked&&q.explanation&&<div className="lesson-feedback"><Lightbulb size={15}/>{q.explanation}</div>}</div>)}<button className="academy-button primary" disabled={!items.every((q:any)=>answers[q.id])} onClick={check}>{checked?<><CheckCircle2 size={15}/>{hasAnswerKey?'Review answers':'Responses saved'}</>:<>Submit response <ArrowRight size={15}/></>}</button>{checked&&!hasAnswerKey&&<p className="lesson-caption">This check is recorded as practice. Marian will only score a check when an answer key is available.</p>}</section>;
}

function ActivityBlock({block,onComplete}:{block:Block;onComplete:()=>void}){
 const [done,setDone]=useState(false); return <section className="lesson-activity"><div className="activity-icon"><Target size={19}/></div><div className="activity-main"><span className="lesson-eyebrow">GUIDED PRACTICE</span><h3>{block.title}</h3>{pretty(block.instructions)}<details className="activity-checks"><summary>Success checks <ChevronDown size={15}/></summary>{pretty(block.success_checks)}</details><button className={`academy-button ${done?'secondary':'primary'}`} onClick={()=>{setDone(true);onComplete()}}>{done?<><Check size={15}/> Activity complete</>:<>Mark activity complete <CheckCircle2 size={15}/></>}</button></div></section>;
}

function BlockView({block,onComplete}:{block:Block;onComplete:()=>void}){
 const t=block.type;
 if(t==='explanation') return <section className="lesson-block explanation"><span className="lesson-eyebrow">CONCEPT</span><h3>{block.title}</h3>{pretty(block.body)}</section>;
 if(t==='worked_example'||t==='example') return <section className="lesson-block worked"><div className="lesson-block-head"><div><span className="lesson-eyebrow">WORKED EXAMPLE</span><h3>{block.title}</h3></div><Code2 size={18}/></div><pre className="lesson-code"><code>{block.code}</code></pre>{block.expected_output!=null&&<><span className="lesson-eyebrow">EXPECTED OUTPUT</span><pre className="lesson-output">{String(block.expected_output)}</pre></>}{pretty(block.explanation)}<CodePractice code={block.code} language={block.language||'python'} title={`Practice: ${block.title}`}/></section>;
 if(t==='diagram') return <section className="lesson-block diagram"><span className="lesson-eyebrow">MENTAL MODEL</span><h3>{block.title}</h3><pre className="lesson-diagram">{typeof block.content==='string'?block.content:JSON.stringify(block.content,null,2)}</pre><p className="lesson-caption">{block.alt_text}</p></section>;
 if(t==='activity') return <ActivityBlock block={block} onComplete={onComplete}/>;
 if(t==='knowledge_check') return <KnowledgeCheck block={block} onComplete={onComplete}/>;
 if(t==='course_project_brief'||t==='course_assessment_brief') return <section className="lesson-block brief"><span className="lesson-eyebrow">{t==='course_project_brief'?'CAPSTONE PROJECT':'FINAL ASSESSMENT'}</span><h3>{block.title}</h3>{pretty(block)}</section>;
 return <section className="lesson-block"><span className="lesson-eyebrow">REFERENCE</span><h3>{block.title||t}</h3>{pretty(Object.fromEntries(Object.entries(block).filter(([k])=>k!=='type'&&k!=='title')))}</section>;
}

export default function CoursePlayer(){
 const {slug='',level='beginner',module='0',topic='0'}=useParams(); const navigate=useNavigate();
 const [doc,setDoc]=useState<CourseDoc|null>(null); const [error,setError]=useState(''); const [completed,setCompleted]=useState<string[]>([]); const [mobileOpen,setMobileOpen]=useState(false);
 const mi=Number(module)||0, ti=Number(topic)||0;
 useEffect(()=>{setError('');fetch(`${import.meta.env.BASE_URL}curriculum/${fileFor(slug,level)}`).then(r=>{if(!r.ok)throw new Error('Course content not found');return r.json()}).then(setDoc).catch(e=>setError(e.message));const raw=localStorage.getItem(keyFor(slug,level));setCompleted(raw?JSON.parse(raw):[]);},[slug,level]);
 useEffect(()=>{localStorage.setItem(keyFor(slug,level),JSON.stringify(completed));},[completed,slug,level]);
 const lessons=useMemo(()=>doc?.modules.flatMap((m,mi)=>m.topics.map((t,ti)=>({m,mi,t,ti,lesson:t.lesson})).filter(x=>x.lesson))||[],[doc]);
 const current=doc?.modules[mi]?.topics[ti]?.lesson;
 const currentKey=current?.key||`${mi}-${ti}`;
 const idx=lessons.findIndex(x=>x.mi===mi&&x.ti===ti);
 const prev=lessons[idx-1], next=lessons[idx+1];
 const doneCount=lessons.filter(x=>completed.includes(x.lesson?.key||`${x.mi}-${x.ti}`)).length;
 function mark(){if(!completed.includes(currentKey))setCompleted([...completed,currentKey]);}
 if(error) return <div className="course-player-error"><h1>Course content unavailable</h1><p>{error}</p><Link className="academy-button secondary" to={`/learn/course/${slug}/${level}`}>Back to course</Link></div>;
 if(!doc||!current) return <div className="course-player-loading"><div className="academy-spinner"/><p>Preparing your learning workspace…</p></div>;
 return <div className="course-player"><header className="player-topbar"><button className="player-menu" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Open course contents"><Menu size={20}/></button><Link to={`/learn/course/${slug}/${level}`} className="player-course-title"><span>{doc.course.programming_language||doc.course.title}</span><strong>{doc.course.title}</strong></Link><div className="player-top-progress"><span>{doneCount}/{lessons.length} lessons</span><div><i style={{width:`${pct(doneCount,lessons.length)}%`}}/></div></div><Link className="player-exit" to={`/learn/course/${slug}/${level}`}>Exit course</Link></header>
 <div className="player-layout"><aside className={`player-sidebar ${mobileOpen?'open':''}`}><div className="player-sidebar-head"><div><span className="lesson-eyebrow">COURSE CONTENT</span><h2>{doc.course.title}</h2></div><button onClick={()=>setMobileOpen(false)}><X size={18}/></button></div><div className="player-progress-card"><div><strong>{pct(doneCount,lessons.length)}%</strong><span>complete</span></div><div className="player-progress-track"><i style={{width:`${pct(doneCount,lessons.length)}%`}}/></div></div><nav className="player-modules">{doc.modules.map((m,mIndex)=><div key={m.key||mIndex} className="player-module"><div className="player-module-title"><span>{String(mIndex+1).padStart(2,'0')}</span><div><strong>{m.title}</strong><small>{m.topics.length} lessons</small></div></div>{m.topics.map((t,tIndex)=>{const l=t.lesson; if(!l)return null;const active=mIndex===mi&&tIndex===ti;const isDone=completed.includes(l.key||`${mIndex}-${tIndex}`);return <button key={t.key||tIndex} className={`player-lesson-link ${active?'active':''}`} onClick={()=>{navigate(`/learn/course/${slug}/${level}/lesson/${mIndex}/${tIndex}`);setMobileOpen(false)}}><span>{isDone?<Check size={13}/>:<span className="lesson-dot"/>}</span><span>{t.title}</span><small>{l.estimated_minutes||'—'}m</small></button>})}</div>)}</nav><Link className="player-project-link" to={`/learn/course/${slug}/${level}`}><Trophy size={16}/><span>Course project</span><ChevronRight size={15}/></Link></aside>
 <main className="player-main"><div className="player-breadcrumb"><Link to={`/learn/course/${slug}/${level}`}>{doc.course.title}</Link><ChevronRight size={14}/><span>Module {mi+1}</span><ChevronRight size={14}/><span>Lesson {idx+1}</span></div><section className="lesson-header"><span className="lesson-eyebrow">MODULE {mi+1} · LESSON {idx+1}</span><h1>{current.title}</h1><div className="lesson-meta"><span><Sparkles size={14}/> {current.estimated_minutes||'—'} min</span><span><Target size={14}/> {current.objectives?.length||0} objectives</span><span><FlaskConical size={14}/> Practice included</span></div>{current.objectives&&<div className="lesson-objectives"><strong>By the end of this lesson</strong><ul>{current.objectives.map((o,i)=><li key={i}><CheckCircle2 size={15}/>{o}</li>)}</ul></div>}</section><div className="lesson-body">{(current.blocks||[]).map((b,i)=><BlockView key={i} block={b} onComplete={mark}/>)}{current.revision_notes&&<section className="lesson-block revision"><span className="lesson-eyebrow">REVIEW NOTES</span><h3>Before you move on</h3>{pretty(current.revision_notes)}</section>}{['terminology','further_reading','lab_environment','evidence_requirements','professional_notes'].map(k=>current[k]&&<section className="lesson-block" key={k}><span className="lesson-eyebrow">{k.replace(/_/g,' ').toUpperCase()}</span>{pretty(current[k])}</section>)}</div><div className="lesson-complete"><div><span className="lesson-eyebrow">LESSON CHECKPOINT</span><h3>{completed.includes(currentKey)?'Lesson completed':'Ready to record your progress?'}</h3><p>{completed.includes(currentKey)?'You can revisit this lesson at any time.':'Complete the activities and knowledge checks, then mark the lesson complete.'}</p></div><button className="academy-button primary" onClick={mark}>{completed.includes(currentKey)?<><CheckCircle2 size={16}/> Completed</>:<>Mark lesson complete <Check size={16}/></>}</button></div><nav className="lesson-next"><button disabled={!prev} onClick={()=>prev&&navigate(`/learn/course/${slug}/${level}/lesson/${prev.mi}/${prev.ti}`)}><ArrowLeft size={16}/><span><small>Previous</small>{prev?.t.title||'Course start'}</span></button><button disabled={!next} onClick={()=>next&&navigate(`/learn/course/${slug}/${level}/lesson/${next.mi}/${next.ti}`)}><span><small>{next?'Next lesson':'Course complete'}</small>{next?.t.title||'Return to course overview'}</span><ArrowRight size={16}/></button></nav></main></div></div>;
}
