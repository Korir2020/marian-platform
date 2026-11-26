import { useEffect, useState } from "react";
import { ArrowRight, Brain, Code2, ShieldCheck, Sparkles } from "lucide-react";
import { Icon } from "./icons";
import { PageShell } from "./SiteChrome";
import schoolImg from "./assets/school-management.jpg";
import learnImg from "./assets/personalized-learning.jpg";

function Btn({ v, size = "xl", className = "", onClick, children }) {
  return (
    <button type="button" className={`ms-btn ms-btn--${v} ms-btn--${size} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}

/* ───────────── Home ───────────── */

const SUBJECTS = [
  ["bookcheck", "CBC"],
  ["code", "Computer Science"],
  ["heart", "Life Skills"],
  ["languages", "Languages"],
  ["wallet", "Financial Literacy"],
  ["palette", "Creative Arts"],
];

function ServiceCard({ variant, image, icon, tag, title, description, features, cta, onGo }) {
  return (
    <article className={`ms-svc ms-svc--${variant}`}>
      <div className="ms-svc-img">
        <img src={image} alt={title} width="1280" height="960" />
        <div className="ms-svc-tint" />
        <span className="ms-eyebrow ms-svc-tag">{tag}</span>
      </div>
      <div className="ms-svc-body">
        <div className="ms-svc-icon-wrap"><span className="ms-svc-icon"><Icon name={icon} s={24} /></span></div>
        <h3 className="ms-svc-title">{title}</h3>
        <p className="ms-svc-desc">{description}</p>
        <ul className="ms-svc-feats">
          {features.map(([ic, text]) => (
            <li key={text}><span className="ms-feat-ico"><Icon name={ic} s={16} /></span>{text}</li>
          ))}
        </ul>
        <div className="ms-svc-cta">
          <Btn v={variant} className="ms-block-sm" onClick={onGo}>{cta} <Icon name="arrow" s={18} /></Btn>
        </div>
      </div>
    </article>
  );
}

export function SiteHome({ go }) {
  return (
    <PageShell go={go} active="site-home">
      <section className="ms-hero">
        <div className="ms-container ms-hero-in">
          <p className="ms-eyebrow ms-pillbox ms-fade"><Icon name="sparkles" s={14} /> One platform · Two ways to grow</p>
          <h1 className="ms-h1 ms-fade" style={{ animationDelay: "80ms" }}>
            Run your school.<br /><em>Grow</em> every learner.
          </h1>
          <p className="ms-lead ms-fade" style={{ animationDelay: "160ms" }}>
            MARIAN brings <strong>School Management</strong> and <strong>Personalized Learning</strong> together — built for the CBC curriculum and the skills beyond it.
          </p>
          <div className="ms-hero-cta ms-fade" style={{ animationDelay: "240ms" }}>
            <Btn v="school" onClick={() => go("site-school")}><Icon name="building" /> Explore School Management</Btn>
            <Btn v="learn" onClick={() => go("pathways")}><Icon name="brain" /> Start Personalized Learning</Btn>
            <Btn v="quiet" onClick={() => go("site-learning")}>Explore courses</Btn>
          </div>
        </div>
      </section>

      <section className="ms-container ms-services">
        <div className="ms-services-head">
          <div>
            <p className="ms-eyebrow ms-muted">Our services</p>
            <h2 className="ms-h2">Choose where you begin</h2>
          </div>
          <p className="ms-services-note">Each service has its own space, sign-in and setup — designed for the people who use it every day.</p>
        </div>
        <div className="ms-svc-grid">
          <ServiceCard
            variant="school" image={schoolImg} icon="building" tag="For schools" title="School Management"
            description="Everything your school runs on — admissions, attendance, fees, CBC assessments and parent updates — in one calm, organised place."
            features={[["users", "Learner records & admissions"], ["calendar", "Attendance & timetables"], ["receipt", "Fees, receipts & balances"], ["bookcheck", "CBC assessments & report cards"]]}
            cta="Explore School Management" onGo={() => go("site-school")}
          />
          <ServiceCard
            variant="learn" image={learnImg} icon="brain" tag="For learners & parents" title="Personalized Learning"
            description="A learning path shaped around each learner — CBC subjects plus Computer Science, Life Skills and more, at their own pace."
            features={[["sparkles", "Paths that adapt to progress"], ["bookcheck", "CBC Grades 1–12 aligned"], ["code", "Coding & digital skills"], ["heart", "Life skills & wellbeing"]]}
            cta="Start Personalized Learning" onGo={() => go("site-learning")}
          />
        </div>
      </section>

      <section className="ms-beyond">
        <div className="ms-container ms-beyond-in">
          <p className="ms-beyond-title">CBC and beyond the classroom</p>
          <ul className="ms-chips">
            {SUBJECTS.map(([ic, label]) => (
              <li key={label}><Icon name={ic} s={16} /> {label}</li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}

/* ───────────── School Management ───────────── */

const MODULES = [
  ["users", "Admissions & records", "Enrol learners, track UPI numbers and keep every record in one profile."],
  ["calendar", "Attendance & timetables", "Mark registers in seconds and build clash-free timetables."],
  ["receipt", "Fees & finance", "Invoices, M-Pesa receipts and balances parents can see."],
  ["bookcheck", "CBC assessments", "Record competencies and generate report cards automatically."],
  ["message", "Parent communication", "Send SMS and in-app updates to one class or the whole school."],
  ["shield", "Secure by design", "Role-based access for administrators, teachers and parents."],
];

const ROLES = [
  ["usercog", "Administrators", "See the whole school at a glance."],
  ["cap", "Teachers", "Registers, marks and lesson plans."],
  ["baby", "Parents", "Progress, fees and notices."],
];

export function SiteSchool({ go }) {
  return (
    <PageShell go={go} active="site-school">
      <section className="ms-hero2 ms-hero2--school">
        <div className="ms-container ms-hero2-in">
          <div className="ms-fade">
            <p className="ms-eyebrow ms-op80">MARIAN · School Management</p>
            <h1 className="ms-h1b">Your whole school, beautifully organised.</h1>
            <p className="ms-lead2 ms-op85">From the first admission to the final report card — MARIAN keeps administrators, teachers and parents on the same page.</p>
            <div className="ms-hero2-cta">
              <Btn v="white" onClick={() => go("school-register")}>Register your school <Icon name="arrow" s={18} /></Btn>
              <Btn v="ghostschool" onClick={() => go("login")}>Sign in to your school</Btn>
            </div>
          </div>
          <div className="ms-hero2-pic">
            <img src={schoolImg} alt="A school principal reviewing the MARIAN dashboard on a tablet" width="1280" height="960" />
            <div className="ms-float">
              <p className="ms-float-k">Attendance today</p>
              <p className="ms-float-v">96.4%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ms-container ms-block">
        <div className="ms-block-head">
          <p className="ms-eyebrow ms-c-school">What's inside</p>
          <h2 className="ms-h2">Every part of running a school</h2>
        </div>
        <div className="ms-cards">
          {MODULES.map(([ic, title, text]) => (
            <div key={title} className="ms-card">
              <span className="ms-card-ico ms-card-ico--school"><Icon name={ic} s={20} /></span>
              <h3 className="ms-card-h">{title}</h3>
              <p className="ms-card-p">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ms-roles">
        <div className="ms-container ms-roles-in">
          <h2 className="ms-roles-h">One sign-in for every role</h2>
          <div className="ms-roles-grid">
            {ROLES.map(([ic, title, text]) => (
              <button key={title} type="button" className="ms-role" onClick={() => go("login")}>
                <span className="ms-role-ico"><Icon name={ic} s={20} /></span>
                <span className="ms-role-txt">
                  <span className="ms-role-t">{title}</span>
                  <span className="ms-role-s">{text}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

/* ───────────── Personalized Learning ───────────── */

const LEARNING_GROUPS = [
  {
    title: "Core Curriculum",
    eyebrow: "FOUNDATION",
    text: "The school curriculum and essential learner skills.",
    items: [["bookcheck", "CBC Curriculum", "Grades 1–12, aligned to KICD strands and competencies.", "Core"]],
  },
  {
    title: "Computing & Technology",
    eyebrow: "BUILD",
    text: "A deliberate path from first code to professional technical practice.",
    items: [
      ["code", "Python", "Think in code, automate useful work and build programs.", "Programming"],
      ["code", "JavaScript", "Make interfaces interactive and learn modern application logic.", "Programming"],
      ["code", "Software Development", "Think like an engineer: design, test, review and ship.", "Engineering"],
      ["code", "Web Development", "Build complete modern web experiences from front to back.", "Web"],
      ["code", "HTML", "Build the structure and semantics of real web pages.", "Web"],
      ["code", "CSS", "Create responsive, accessible and maintainable interfaces.", "Web"],
      ["shield", "Cybersecurity Academy", "Progress from foundations to professional security practice.", "Security"],
    ],
  },
  {
    title: "Languages",
    eyebrow: "COMMUNICATE",
    text: "Structured language pathways with practice and progression.",
    items: [
      ["languages", "Kiswahili", "Beginner to advanced language practice.", "Language"],
      ["languages", "English", "Communication, vocabulary and confident expression.", "Language"],
      ["languages", "French", "Build useful French step by step.", "Language"],
      ["languages", "German", "Build useful German step by step.", "Language"],
      ["languages", "Spanish", "Build useful Spanish step by step.", "Language"],
      ["languages", "Mandarin", "Build useful Mandarin step by step.", "Language"],
      ["languages", "Arabic", "Build useful Arabic step by step.", "Language"],
    ],
  },
  {
    title: "Creative Arts",
    eyebrow: "CREATE",
    text: "Learn, practise, make and build a portfolio of real creative work.",
    items: [
      ["palette", "Music", "Rhythm, melody, composition and listening.", "Studio"],
      ["palette", "Drawing & Painting", "Line, form, colour, shading and perspective.", "Studio"],
      ["palette", "Visual Design", "Design principles, typography, colour and digital work.", "Studio"],
      ["palette", "Drama & Theatre", "Character, script, rehearsal and performance.", "Studio"],
      ["palette", "Dance & Movement", "Movement vocabulary, rhythm and choreography.", "Studio"],
      ["palette", "Storytelling", "Build stories, scenes and creative writing confidence.", "Studio"],
    ],
  },
];

const FEATURED_COURSES = [
  ["python", "Python", "Programming", "Build from first principles to useful programs.", "site-pathway-python", "PY"],
  ["javascript", "JavaScript", "Programming", "From logic to interactive applications.", "site-pathway-javascript", "JS"],
  ["html", "HTML", "Web", "Build the semantic structure of the web.", "site-pathway-html", "HTML"],
  ["css", "CSS", "Web", "Style interfaces with precision and accessibility.", "site-pathway-css", "CSS"],
  ["cybersecurity", "Cybersecurity", "Security", "Train through eight professional stages.", "site-cybersecurity", "SEC"],
  ["software-development", "Software Development", "Engineering", "Plan, build, test and ship reliable software.", "site-pathway-software-development", "SD"],
  ["web-development", "Web Development", "Web", "Build modern front-end and back-end experiences.", "site-pathway-web-development", "WEB"],
];

function CourseCarousel({ go }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIndex((n) => (n + 1) % FEATURED_COURSES.length), 3800);
    return () => window.clearInterval(id);
  }, []);
  const course = FEATURED_COURSES[index];
  return (
    <div className="ms-course-stage" aria-label="Featured courses">
      <div key={course[0]} className="ms-course-3d">
        <div className="ms-course-3d-shadow" />
        <div className={`ms-course-3d-card ms-course-${course[0]}`}>
          <span className="ms-course-code">{course[5]}</span>
          <span className="ms-course-kind">{course[2]}</span>
          <strong>{course[1]}</strong>
          <p>{course[3]}</p>
          <button type="button" onClick={() => go(course[4])}>Enter path <ArrowRight size={15} /></button>
        </div>
      </div>
      <div className="ms-course-dots" aria-hidden="true">
        {FEATURED_COURSES.map((x, i) => <span key={x[0]} className={i === index ? "on" : ""} />)}
      </div>
    </div>
  );
}

export function SiteLearning({ go }) {
  return (
    <PageShell go={go} active="site-learning">
      <section className="ms-hero2 ms-hero2--learn">
        <div className="ms-container ms-hero2-in">
          <div className="ms-fade">
            <p className="ms-eyebrow ms-c-learn">MARIAN · Personalized Learning</p>
            <h1 className="ms-h1b ms-ink">A learning path as unique as <em>every learner</em>.</h1>
            <p className="ms-lead2 ms-muted">CBC subjects plus Computer Science, Life Skills and more — paced for each learner, with progress parents can follow.</p>
            <div className="ms-hero2-cta">
              <Btn v="learn" onClick={() => go("pathways")}>Start Personalized Learning <Icon name="arrow" s={18} /></Btn>
              <Btn v="quiet" onClick={() => go("login")}>I already have an account</Btn>
            </div>
          </div>
          <div className="ms-hero2-pic">
            <img src={learnImg} alt="A learner coding on a laptop" width="1280" height="960" />
            <div className="ms-float">
              <p className="ms-float-k">This week</p>
              <p className="ms-float-v ms-ink">5-day streak 🔥</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ms-container ms-block">
        <div className="ms-block-head">
          <p className="ms-eyebrow ms-c-learn">Learning tracks</p>
          <h2 className="ms-h2">CBC and beyond</h2>
        </div>
        <div className="ms-cards">
          {TRACKS.map(([ic, title, text, tag]) => (
            <div key={title} className="ms-card">
              <div className="ms-card-top">
                <span className="ms-card-ico ms-card-ico--learn"><Icon name={ic} s={20} /></span>
                <span className="ms-eyebrow ms-tag">{tag}</span>
              </div>
              <h3 className="ms-card-h">{title}</h3>
              <p className="ms-card-p">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ms-container ms-block">
        <div className="ms-block-head">
          <p className="ms-eyebrow ms-c-learn">New pathways</p>
          <h2 className="ms-h2">Python, JavaScript, Software and Web</h2>
        </div>
        <PathwayCards go={go} />
        <button type="button" className="cy-card" onClick={() => go('site-cybersecurity')}>
          <span>NEW</span>
          <b>Cybersecurity Academy</b>
          Eight stages from foundations to specialization, with safe lab practice.
        </button>
        <button type='button' className='cy-card' onClick={() => { window.location.href = '/studio.html'; }}>
          <span>NEW</span>
          <b>Marian Studio</b>
          Practice lab, knowledge hub, creative studio and language pathways.
        </button>
      </section>

      <section className="ms-how">
        <div className="ms-container ms-how-in">
          <h2 className="ms-how-h">How it works</h2>
          <div className="ms-steps">
            {STEPS.map(([n, title, text]) => (
              <div key={n} className="ms-step">
                <p className="ms-step-n">{n}</p>
                <h3 className="ms-step-h">{title}</h3>
                <p className="ms-step-p">{text}</p>
              </div>
            ))}
          </div>
          <Btn v="white" className="ms-how-btn" onClick={() => go("pathways")}>Build my learning path <Icon name="arrow" s={18} /></Btn>
        </div>
      </section>
    </PageShell>
  );
}
