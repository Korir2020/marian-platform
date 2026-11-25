export const lessonsOf = (stage) => stage.modules.flatMap((m) => m.lessons);

export function stageStats(stage) {
  const lessons = lessonsOf(stage);
  return {
    modules: stage.modules.length,
    lessons: lessons.length,
    activities: lessons.reduce((n, l) => n + l.activities, 0),
  };
}

export function academyStats(academy) {
  const per = academy.stages.map(stageStats);
  return {
    stages: academy.stages.length,
    lessons: per.reduce((n, s) => n + s.lessons, 0),
    activities: per.reduce((n, s) => n + s.activities, 0),
    labs: academy.labs.length,
  };
}
