import test from 'node:test';
import assert from 'node:assert/strict';
import { cyberAcademy } from '../src/site/cyberAcademyData.js';

test('cyber academy has 8 stages and 96 lessons', () => {
  assert.equal(cyberAcademy.stages.length, 8);
  const lessons = cyberAcademy.stages.flatMap((s) => s.modules.flatMap((m) => m.lessons));
  assert.equal(lessons.length, 96);
  for (const l of lessons) {
    assert.ok(l.title);
    assert.equal(typeof l.minutes, 'number');
    assert.equal(typeof l.activities, 'number');
  }
});

test('every stage is numbered 1 to 8 and has modules', () => {
  cyberAcademy.stages.forEach((s, i) => {
    assert.equal(s.number, i + 1);
    assert.ok(s.modules.length > 0);
  });
});

test('7 labs, each with the fields the page shows', () => {
  assert.equal(cyberAcademy.labs.length, 7);
  for (const l of cyberAcademy.labs) {
    assert.ok(l.key && l.title && l.purpose && l.architecture);
    assert.ok(Array.isArray(l.features) && Array.isArray(l.exercise_types));
    assert.equal(typeof l.resources, 'object');
  }
});
