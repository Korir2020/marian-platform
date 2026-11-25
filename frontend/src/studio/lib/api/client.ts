export type WorkflowState = 'draft' | 'submitted' | 'approved' | 'rejected' | 'published';

export interface Pathway {
  id: string;
  title: string;
  description: string;
  levelCount?: number;
  courseCount?: number;
  status: WorkflowState;
}

export interface Course {
  id: string;
  pathwayId: string;
  title: string;
  level?: string;
  status: WorkflowState;
}

export interface StudioUser {
  id: number;
  username: string;
  email: string;
  role: 'content_creator' | 'reviewer' | 'curator' | 'administrator' | 'learner';
}

export interface ApiError {
  status: number;
  message: string;
}

const configuredBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
const baseUrl = configuredBase?.replace(/\/api\/v1$/, '');
const apiRoot = baseUrl ? `${baseUrl}/api/v1` : undefined;
export const apiConfigured = Boolean(apiRoot);

function throwApiError(status: number, message: string): never {
  throw { status, message } satisfies ApiError;
}

async function fetchCsrfToken(): Promise<string> {
  if (!apiRoot) throwApiError(0, 'API is not configured.');
  const response = await fetch(`${apiRoot}/auth/csrf/`, { credentials: 'include' });
  if (!response.ok) throwApiError(response.status, `Could not obtain a CSRF token (${response.status}).`);
  const data = (await response.json()) as { csrfToken: string };
  return data.csrfToken;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiRoot) throwApiError(0, 'API is not configured. Set VITE_API_BASE_URL to connect your Studio API.');

  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
    headers.set('X-CSRFToken', await fetchCsrfToken());
  }

  const response = await fetch(`${apiRoot}${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include',
  });
  if (!response.ok) throwApiError(response.status, `API request failed (${response.status}).`);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

interface Page<T> {
  results: T[];
}

interface ApiPathway {
  id: number | string;
  title: string;
  description: string;
  status: WorkflowState;
  level_count: number;
  course_count: number;
}

interface ApiCourse {
  id: number | string;
  pathway: number | string;
  title: string;
  level?: string;
  status: WorkflowState;
}

function unwrap<T>(value: T[] | Page<T>): T[] {
  return Array.isArray(value) ? value : value.results;
}

export async function getPathways(): Promise<Pathway[]> {
  const rows = await apiRequest<ApiPathway[] | Page<ApiPathway>>('/pathways/');
  return unwrap(rows).map((item) => ({
    id: String(item.id),
    title: item.title,
    description: item.description,
    status: item.status,
    levelCount: item.level_count,
    courseCount: item.course_count,
  }));
}

export async function getCourses(): Promise<Course[]> {
  const rows = await apiRequest<ApiCourse[] | Page<ApiCourse>>('/courses/');
  return unwrap(rows).map((item) => ({
    id: String(item.id),
    pathwayId: String(item.pathway),
    title: item.title,
    level: item.level,
    status: item.status,
  }));
}

export function getCurrentUser(): Promise<StudioUser> {
  return apiRequest<StudioUser>('/users/me/');
}

export function signIn(username: string, password: string): Promise<StudioUser> {
  return apiRequest<StudioUser>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function signOut(): Promise<void> {
  return apiRequest<void>('/auth/logout/', { method: 'POST' });
}

export interface ApiRecord { id:number|string; title:string; description?:string; status?:string; level?:string; pathway?:number|string; course?:number|string; module?:number|string; topic?:number|string; }
export interface LessonRecord { id:number; topic:number; title:string; state:string; current_version?:{objectives:string[];blocks:Record<string,unknown>[];number:number}|null; }
export interface AssessmentRecord { id?:number; title:string; description:string; course:number; kind:string; instructions:string; time_limit_minutes:number|null; pass_mark_percent:number; questions:{type:string;prompt:string;points:number;options?:string[];correct_option?:string;answer?:string;explanation:string}[]; }
export interface ProjectRecord { id?:number; title:string; course:number; brief:string; learning_outcomes:string[]; requirements:string[]; deliverables:string[]; estimated_hours:number; rubric_criteria:{title:string;description:string;points:number;position:number}[]; }
export const getModules=()=>apiRequest<ApiRecord[]|Page<ApiRecord>>('/modules/').then(unwrap);
export const getTopics=()=>apiRequest<ApiRecord[]|Page<ApiRecord>>('/topics/').then(unwrap);
export const getLessons=()=>apiRequest<LessonRecord[]|Page<LessonRecord>>('/lessons/').then(unwrap);
export const getAssessments=()=>apiRequest<AssessmentRecord[]|Page<AssessmentRecord>>('/assessments/').then(unwrap);
export const getProjects=()=>apiRequest<ProjectRecord[]|Page<ProjectRecord>>('/projects/').then(unwrap);
export const saveCourse=(data:Record<string,unknown>,id?:string)=>apiRequest<ApiRecord>(id?`/courses/${id}/`:'/courses/',{method:id?'PATCH':'POST',body:JSON.stringify(data)});
export const saveModule=(data:Record<string,unknown>)=>apiRequest<ApiRecord>('/modules/',{method:'POST',body:JSON.stringify(data)});
export const saveTopic=(data:Record<string,unknown>)=>apiRequest<ApiRecord>('/topics/',{method:'POST',body:JSON.stringify(data)});
export const saveLesson=(data:Record<string,unknown>,id?:number)=>apiRequest<LessonRecord>(id?`/lessons/${id}/`:'/lessons/',{method:id?'PATCH':'POST',body:JSON.stringify(data)});
export const saveLessonVersion=(id:number,data:Record<string,unknown>)=>apiRequest(`/lessons/${id}/versions/`,{method:'POST',body:JSON.stringify(data)});
export const saveAssessment=(data:AssessmentRecord,id?:number)=>apiRequest<AssessmentRecord>(id?`/assessments/${id}/`:'/assessments/',{method:id?'PATCH':'POST',body:JSON.stringify(data)});
export const saveProject=(data:ProjectRecord,id?:number)=>apiRequest<ProjectRecord>(id?`/projects/${id}/`:'/projects/',{method:id?'PATCH':'POST',body:JSON.stringify(data)});

export interface LabExerciseRecord { id:number; key:string; title:string; difficulty:string; estimated_minutes:number; objectives:string[]; instructions:string[]; success_checks:string[]; evidence_requirements:string[]; hints:string[]; safety_scope:string; position:number; lab:number; }
export interface LabSessionRecord { id:string; learner:number; exercise:number; exercise_title:string; lab_title:string; status:string; provider:string; started_at:string; last_heartbeat_at:string|null; stopped_at:string|null; expires_at:string|null; metadata:Record<string,unknown>; evidence:unknown[]; }
export const getLabExercises=(labId?:string)=>apiRequest<LabExerciseRecord[]|Page<LabExerciseRecord>>(`/lab-exercises/${labId?`?lab=${encodeURIComponent(labId)}`:''}`).then(unwrap);
export const startLabSession=(exercise:number)=>apiRequest<LabSessionRecord>('/lab-sessions/',{method:'POST',body:JSON.stringify({exercise})});
export const heartbeatLabSession=(id:string)=>apiRequest<LabSessionRecord>(`/lab-sessions/${id}/heartbeat/`,{method:'POST'});
export const stopLabSession=(id:string)=>apiRequest<LabSessionRecord>(`/lab-sessions/${id}/stop/`,{method:'POST'});
export const resetLabSession=(id:string)=>apiRequest<LabSessionRecord>(`/lab-sessions/${id}/reset/`,{method:'POST'});

export interface LabExecResult { sequence:number; timestamp:number; command:string; exit_code:number; output:string; truncated:boolean; duration_ms:number; command_count:number; }
export interface LabVerificationResult { status:"passed"|"failed"|"manual_review_required"; passed:boolean|null; automated_checks:{index:number;type:string;passed:boolean;description:string}[]; manual_checks:{index:number;description:string;status:string}[]; evidence_count:number; verified_at:string; }
export const executeLabCommand=(id:string,command:string)=>apiRequest<LabExecResult>(`/lab-sessions/${id}/execute/`,{method:"POST",body:JSON.stringify({command})});
export const verifyLabSession=(id:string)=>apiRequest<LabVerificationResult>(`/lab-sessions/${id}/verify/`,{method:"POST"});
