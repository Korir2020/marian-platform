import test from "node:test";
import assert from "node:assert/strict";
import { additionalPathways as P } from "../src/site/pathwayData.js";

test("four pathways, each with levels and modules", () => {
  assert.equal(P.length, 4);
  for (const p of P) {
    assert.ok(p.slug && p.title && p.theme && p.mark);
    assert.ok(p.levels.length >= 1);
    for (const l of p.levels) assert.ok(l.modules.length >= 1);
  }
});

test("every theme has a palette in pathways.css", async () => {
  const fs = await import("node:fs");
  const css = fs.readFileSync(new URL("../src/site/pathways.css", import.meta.url), "utf8");
  for (const p of P) {
    if (p.theme !== "python") assert.ok(css.includes(`.pw-theme-${p.theme}`), p.theme);
  }
});
