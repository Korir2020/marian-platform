import { additionalPathways } from './pathways';
import { cyberAcademy } from './cyberAcademy';
import type { Pathway } from '../lib/api/client';

// Read-only snapshot of bundled Marian content. Used only when the API is
// not configured or the request fails. API data always takes priority.
export const staticPathways: Pathway[] = [
  ...additionalPathways.map((p) => ({
    id: `static-${p.slug}`,
    title: p.title,
    description: p.description,
    levelCount: p.levels.length,
    courseCount: p.levels.length,
    status: 'draft' as Pathway['status'],
  })),
  {
    id: 'static-cybersecurity',
    title: 'Cybersecurity Academy',
    description: 'Eight stages from foundations to specialization, with safe lab practice.',
    levelCount: cyberAcademy.stages.length,
    courseCount: cyberAcademy.stages.length,
    status: 'draft' as Pathway['status'],
  },
];
