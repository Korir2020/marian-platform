import test from 'node:test';
import assert from 'node:assert/strict';
import { cyberAcademy } from '../src/site/cyberAcademyData.js';
import { academyStats, stageStats } from '../src/site/cyberStats.js';

test('academy totals come from the real data', () => {
  const t = academyStats(cyberAcademy);
  assert.deepEqual(t, { stages: 8, lessons: 96, activities: 192, labs: 7 });
});

test('stage totals add up to the academy totals', () => {
  const per = cyberAcademy.stages.map(stageStats);
  assert.equal(per.reduce((n, s) => n + s.lessons, 0), 96);
  assert.equal(per.reduce((n, s) => n + s.activities, 0), 192);
  per.forEach((s) => assert.ok(s.modules > 0));
});
