import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, BookOpenCheck, CircleHelp, LayoutDashboard, Library, Menu, Settings, ShieldCheck, Users, X, Compass, BookOpenText, ClipboardCheck, BarChart3, PenSquare, GitBranch, Sparkles } from 'lucide-react';
import { apiConfigured, getPathways, getCourses } from './lib/api/client';
import { staticPathways } from './data/staticFallback';
import StudioTools from './StudioTools';
import { CyberLabsPage, CyberLearnerPath } from './CyberPages';
import { AdditionalPathwayPage, LanguagesPage, CreativeArtsPage, LearnerDashboard, UniversalSearch, PortfolioPage, PracticeLab, KnowledgePage, CreativeStudioPage, TeacherDashboard } from './PathwayExperience';
import { AcademyShell, AcademyHome, ExplorePage, PathBrowser, CoursePage, AcademyProgress, ProjectsPage, AcademyOnboarding, AcademySearch } from './AcademyExperience';
import CoursePlayer from './CoursePlayer';
import './styles.css';

const studioNav=[
  {to:'/',label:'Overview',icon:LayoutDashboard},
  {to:'/studio/courses',label:'Courses',icon:BookOpenText},
  {to:'/studio/pathways',label:'Learning paths',icon:GitBranch},
  {to:'/studio/modules',label:'Modules & lessons',icon:Library},
  {to:'/studio/projects',label:'Projects & practice',icon:PenSquare},
  {to:'/studio/reviews',label:'Review & publishing',icon:ClipboardCheck},
  {to:'/studio/analytics',label:'Learning analytics',icon:BarChart3},
  {to:'/studio/cybersecurity',label:'Cybersecurity labs',icon:ShieldCheck},
];

function StudioShell({children}:{children:ReactNode}){
 const [open,setOpen]=useState(false);
 return <div className="studio-shell-v2">
  <aside className={`studio-sidebar-v2 ${open?'open':''}`}>
   <div className="studio-brand-v2"><div className="studio-brand-mark-v2">M</div><div><strong>marian</strong><span>studio</span></div><button onClick={()=>setOpen(false)} className="studio-mobile-close" aria-label="Close navigation"><X size={18}/></button></div>
   <div className="studio-workspace-v2"><div className="studio-workspace-avatar">M</div><div><strong>Marian Studio</strong><small>Superuser content workspace</small></div></div>
   <div className="studio-nav-label">CONTENT WORKSPACE</div>
   <nav>{studioNav.map(n=><NavLink key={n.to} to={n.to} end={n.to==='/' } onClick={()=>setOpen(false)} className={({isActive})=>`studio-nav-link-v2 ${isActive?'active':''}`}><n.icon size={18}/><span>{n.label}</span></NavLink>)}</nav>
   <div className="studio-divider-v2"/>
   <div className="studio-nav-label">SYSTEM</div>
   <NavLink to="/learn" className="studio-nav-link-v2"><BookOpen size={18}/><span>Open Academy</span></NavLink>
   <div className="studio-bottom-v2"><a className="studio-nav-link-v2" href="mailto:support@example.invalid"><CircleHelp size={18}/><span>Help & feedback</span></a><button className="studio-nav-link-v2 disabled"><Settings size={18}/><span>Settings</span></button><div className="studio-user-v2"><div className="studio-user-avatar">S</div><div><strong>Superuser</strong><small>Academy administrator</small></div></div></div>
  </aside>
  {open&&<button className="studio-backdrop-v2" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
  <main className="studio-main-v2"><header className="studio-topbar-v2"><button className="studio-menu-v2" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><div className="studio-breadcrumb-v2">Marian <span>/</span> Studio</div><div className="studio-top-status"><span className="api-dot"/>{apiConfigured?'Connected':'Offline content'}<div className="studio-user-avatar small">S</div></div></header><div className="studio-content-v2">{children}</div></main>
 </div>
}

function StudioOverview(){ const {data,state}=useStudioResources(); return <><StudioHeading eyebrow="MARIAN STUDIO" title="Build learning with intention." subtitle="Create, structure, review and publish the content that powers Marian Academy." action="Create course"/><div className="studio-hero-strip"><div><Sparkles size={20}/><div><strong>One source of truth.</strong><p>Studio authors and publishes. Academy is the only learner environment.</p></div></div><NavLink to="/learn" className="studio-link-v2">Preview Academy <ArrowRight size={16}/></NavLink></div><div className="studio-metrics-v2"><StudioMetric label="Courses" value={state==='ready'?String(data.courses):'—'} hint="Published + draft" icon={BookOpen}/><StudioMetric label="Learning paths" value={state==='ready'?String(data.pathways):'—'} hint="Career + skill" icon={GitBranch}/><StudioMetric label="Learners" value="—" hint="Connected accounts" icon={Users}/><StudioMetric label="Awaiting review" value="—" hint="Governance queue" icon={ClipboardCheck}/></div><section className="studio-overview-grid-v2"><article className="studio-panel-v2"><div className="studio-panel-head"><div><span>CONTENT LIFECYCLE</span><h2>Draft → Review → Publish</h2></div><ClipboardCheck size={18}/></div><div className="studio-lifecycle"><span>Draft</span><i>→</i><span>Internal review</span><i>→</i><span>Approved</span><i>→</i><span>Published</span></div><p>Only approved and published learning appears in Academy. Learners never browse the authoring workspace.</p></article><article className="studio-panel-v2"><div className="studio-panel-head"><div><span>ACADEMY STRUCTURE</span><h2>Path → Course → Module → Lesson</h2></div><Compass size={18}/></div><p>Build content once, then reuse it across career paths, skill paths and recommendations.</p><NavLink to="/studio/pathways" className="studio-link-v2">Manage learning paths <ArrowRight size={15}/></NavLink></article></section></> }
function useStudioResources(){const [data,setData]=useState<{courses:number;pathways:number}|null>(null);const [state,setState]=useState<'loading'|'ready'|'fallback'>('loading');useEffect(()=>{let alive=true;Promise.all([getCourses().catch(()=>[]),getPathways().catch(()=>staticPathways)]).then(([courses,pathways])=>{if(alive){setData({courses:courses.length,pathways:pathways.length});setState('ready')}}).catch(()=>{if(alive){setData({courses:0,pathways:staticPathways.length});setState('fallback')}});return()=>{alive=false}},[]);return {data:data||{courses:0,pathways:0},state}}
function StudioHeading({eyebrow,title,subtitle,action}:{eyebrow:string;title:string;subtitle:string;action?:string}){return <div className="studio-heading-v2"><div><span>{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action&&<button className="studio-primary-v2"><PenSquare size={16}/>{action}</button>}</div>}
function StudioMetric({label,value,hint,icon:Icon}:{label:string;value:string;hint:string;icon:typeof BookOpen}){return <div className="studio-metric-v2"><Icon size={18}/><strong>{value}</strong><span>{label}</span><small>{hint}</small></div>}
function StudioSimple({title,subtitle,children}:{title:string;subtitle:string;children?:ReactNode}){return <><StudioHeading eyebrow="MARIAN STUDIO" title={title} subtitle={subtitle}/>{children||<div className="studio-empty-v2"><BookOpenCheck size={25}/><h2>Workspace ready</h2><p>This area is now reserved for the structured content lifecycle. We will connect the detailed authoring tools during the content phase.</p></div>}</>}
function StudioCourses(){return <StudioSimple title="Courses" subtitle="Manage course identity, level, prerequisites, modules and publishing state."><div className="studio-empty-v2"><BookOpenText size={25}/><h2>Course library</h2><p>Courses are the learner-facing building blocks inside Marian Academy. The detailed editor comes after the architecture pass.</p><NavLink to="/studio/pathways" className="studio-link-v2">View learning paths <ArrowRight size={15}/></NavLink></div></StudioSimple>}
function StudioModules(){return <StudioSimple title="Modules & lessons" subtitle="Organize every course into a predictable sequence of modules, lessons and activities."/>}
function StudioProjects(){return <StudioSimple title="Projects & practice" subtitle="Connect practical work, challenges and assessments to the courses that teach them."/>}
function StudioReviews(){return <StudioSimple title="Review & publishing" subtitle="Keep learner-facing content accurate, complete and approved before publication."/>}
function StudioAnalytics(){return <StudioSimple title="Learning analytics" subtitle="See how learners progress, where they stop, and which content needs attention."/>}
function StudioPathways(){return <StudioSimple title="Learning paths" subtitle="Design career and skill journeys that tell learners what to learn next."/>}

export default function App(){
 const loc=useLocation(); const isLearner=loc.pathname.startsWith('/learn');
 if(isLearner) return <AcademyShell><Routes><Route path="/learn/*" element={<Routes><Route index element={<AcademyHome/>}/><Route path="explore" element={<ExplorePage/>}/><Route path="paths" element={<PathBrowser/>}/><Route path="course/:slug/:level" element={<CoursePage/>}/><Route path="course/:slug/:level/lesson/:module/:topic" element={<CoursePlayer/>}/><Route path="progress" element={<AcademyProgress/>}/><Route path="projects" element={<ProjectsPage/>}/><Route path="onboarding" element={<AcademyOnboarding/>}/><Route path="search" element={<AcademySearch/>}/><Route path="portfolio" element={<PortfolioPage/>}/><Route path="practice" element={<PracticeLab/>}/><Route path="languages" element={<LanguagesPage/>}/><Route path="creative-arts" element={<CreativeArtsPage/>}/><Route path="pathways/:slug" element={<AdditionalPathwayPage/>}/><Route path="cybersecurity" element={<CyberLearnerPath/>}/><Route path="cybersecurity/labs" element={<CyberLabsPage/>}/><Route path="knowledge" element={<KnowledgePage/>}/><Route path="creative-studio" element={<CreativeStudioPage/>}/><Route path="teacher" element={<TeacherDashboard/>}/><Route path="*" element={<Navigate to="/learn" replace/>}/></Routes>}/></Routes></AcademyShell>;
 return <StudioShell><Routes><Route index element={<StudioOverview/>}/><Route path="studio/courses" element={<StudioCourses/>}/><Route path="studio/pathways" element={<StudioPathways/>}/><Route path="studio/modules" element={<StudioModules/>}/><Route path="studio/projects" element={<StudioProjects/>}/><Route path="studio/reviews" element={<StudioReviews/>}/><Route path="studio/analytics" element={<StudioAnalytics/>}/><Route path="studio/cybersecurity" element={<StudioTools/>}/><Route path="studio/tools" element={<StudioTools/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></StudioShell>;
}

