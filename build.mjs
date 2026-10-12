import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 660;
const HEIGHT = 460;

// ── Physics ──────────────────────────────────────────────
// Open pipe: f = v / (2L), v = 343 m/s
const V = 343;
const NOTES = [
  { name: "C4", freq: 261.6 },
  { name: "D4", freq: 293.7 },
  { name: "E4", freq: 329.6 },
  { name: "G4", freq: 392.0 },
  { name: "A4", freq: 440.0 },
];
const NOTES_LEN = NOTES.map(n => V / (2 * n.freq));   // metres
const SCALE = 108 / NOTES_LEN[0];                     // C4 body ≈ 108 units
const BODY_H = NOTES_LEN.map(l => Math.round(l * SCALE));

// ── Layout ───────────────────────────────────────────────
const PLATE    = { x: -106, y: -72, w: 212, d: 144, r: 8 };
const PLATE_H  = 12;
const FOOT_H   = 5;

const CHEST    = { x: -88, y: -54, w: 176, d: 108, r: 4 };
const CHEST_Z  = 0;
const CHEST_H  = 26;
const CHEST_TOP = CHEST_Z + CHEST_H;

const BOARD_H  = 4;
const BOARD_Z  = CHEST_TOP;

const PIPE_BASE = BOARD_Z + BOARD_H;          // pipe feet sit here
const FOOT_H_P  = 6;
const BODY_Z    = PIPE_BASE + FOOT_H_P;
const P_R       = 5.5;
const P_FOOT_R  = 7.5;
const PX        = [-64, -32, 0, 32, 64];
const PY        = 0;

const KEY_Y     = 58;
const KEY_W     = 24;
const KEY_D     = 16;
const KEY_H     = 5;
const KEY_Z     = 0;
const KEY_LIP   = 3;

const ROD_R     = 1.2;
const ROD_Z     = CHEST_Z + CHEST_H * 0.45;

const PAL_R     = 6;
const PAL_Z     = CHEST_TOP - 4;
const PAL_H     = 2;

const GAUGE     = [82, -36];
const GAUGE_R   = 9;

// ── Projection ───────────────────────────────────────────
const tallParts = PX.map((x, i) => [x, PY, BODY_Z + BODY_H[i]]);
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [PX[0] - P_FOOT_R, PY - P_FOOT_R, 0],
    ...tallParts,
    [GAUGE[0] + GAUGE_R, GAUGE[1], CHEST_TOP + 3],
    [PX[4] + KEY_W / 2 + 8, KEY_Y + KEY_D, 0],
  ],
  WIDTH, HEIGHT,
  { pad: 28, azimuth: 40 },
);

const at = (pt) => k.iso(pt, P);
const S  = (paths, style) => k.solidSvg(paths, style);
const L  = (d, style) => k.lineSvg(d, style);
const D  = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) =>
  k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ── Base plate + feet ────────────────────────────────────
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  // feet
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H, 1.4, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.5, -PLATE_H - FOOT_H + 1.4, FOOT_H - 1.4, P, 24), { tone: "mid" }));
  }
  // plate
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  // screws
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // label plate
  const label = { x: -42, y: PLATE.y + PLATE.d - 14, w: 84, d: 8, r: 1 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.lineOnTop([label.x + 4, label.y + 4], [label.x + label.w - 4, label.y + 4], 0.8, P), { tone: "faint" }));
  // ruler strip
  const strip = { x: -90, y: PLATE.y + 6, w: 180, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 5, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  return out.join("");
}

// ── Wind chest ────────────────────────────────────────────
function chest() {
  const out = [];
  // lower body
  out.push(S(k.slabOf(CHEST, CHEST_Z, CHEST_H, P, 8, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(CHEST, 2), CHEST_Z + CHEST_H, P), { tone: "faint" }));
  // top board (with pipe holes)
  out.push(S(k.slabOf(CHEST, BOARD_Z, BOARD_H, P, 8, 0.5), { tone: "hi", crease: "lo" }));
  // front faceplate (panel on front of chest)
  const face = { x: CHEST.x + 4, y: CHEST.y + CHEST.d - 3, w: CHEST.w - 8, d: 3, r: 1 };
  out.push(S(k.slabOf(face, CHEST_Z + 2, CHEST_H - 4, P, 4, 0.3), { tone: "lo" }));
  // bolts on face
  for (const x of [CHEST.x + 10, CHEST.x + CHEST.w - 10]) {
    out.push(D([at([x, face.y + face.d, CHEST_Z + 4])], { size: 0.45, tone: "lo" }));
    out.push(D([at([x, face.y + face.d, CHEST_Z + CHEST_H - 4])], { size: 0.45, tone: "lo" }));
  }
  // wind inlet pipe (from right side)
  const inletY = -20;
  out.push(S(k.cylinder(CHEST.x + CHEST.w + 14, inletY, 3, CHEST_Z + 8, 8, P, 16, 0.3), { tone: "mid", crease: "none" }));
  // elbow at chest wall
  out.push(S(k.cylinder(CHEST.x + CHEST.w - 2, inletY, 3.5, CHEST_Z + 8, 6, P, 16), { tone: "mid" }));
  out.push(L(k.sideArc(CHEST.x + CHEST.w - 2, inletY, 3.5, CHEST_Z + 8, P, 12), { tone: "faint" }));
  // pressure gauge
  const [gx, gy] = GAUGE;
  out.push(S(k.cylinder(gx, gy, 2.5, CHEST_Z + 8, 6, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(gx, gy, GAUGE_R, CHEST_Z + 14, 3, P, 48, 0.4), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(gx, gy, GAUGE_R - 1.5, CHEST_Z + 17, P, 40), { tone: "lo" }));
  const gt = k.radialTicks(gx, gy, GAUGE_R - 2, 8, 4, CHEST_Z + 17, [1.2, 2.6], P, -Math.PI * 0.75, Math.PI * 1.5);
  out.push(L(gt.minor, { tone: "lo" }), L(gt.major, { tone: "mid" }));
  // gauge needle (points to ~3 o'clock = mid pressure)
  const ga = -Math.PI * 0.15;
  out.push(L(k.lineOnTop(
    [gx - Math.sin(ga) * 1.5, gy + Math.cos(ga) * 1.5],
    [gx + Math.sin(ga) * (GAUGE_R - 3), gy - Math.cos(ga) * (GAUGE_R - 3)],
    CHEST_Z + 17.2, P), { tone: "lit", className: "data-gauge-needle" }));
  out.push(D([at([gx, gy, CHEST_Z + 17.2])], { size: 0.6, tone: "mid" }));
  // label on gauge
  out.push(k.faceTextSvg(k.topMatrix([gx + 5, gy + 7], CHEST_Z + 17, P, "x"), "psi", { size: 1.8, tone: "lo", anchor: "middle" }));
  return out.join("");
}

// ── Pipes ─────────────────────────────────────────────────
function pipeFixed(index) {
  const out = [];
  const x = PX[index], h = BODY_H[index];
  const footTop = PIPE_BASE + FOOT_H_P;
  const bodyTop = BODY_Z + h;

  // foot (wider cone-like cylinder)
  out.push(S(k.cylinder(x, PY, P_FOOT_R, PIPE_BASE, FOOT_H_P, P, 28, 0.4), { tone: "mid" }));
  out.push(L(k.ring(x, PY, P_FOOT_R - 1.5, footTop, P, 24), { tone: "faint" }));

  // body cylinder — lit only on active pipe (default 0)
  const isActive = index === 0;
  out.push(S(k.cylinder(x, PY, P_R, BODY_Z, h, P, 44, 0.3), {
    tone: "hi", crease: "lo", lit: isActive, className: `pipe-body-${index}`
  }));

  // mouth: two vertical lines on the near face of the pipe body
  // Near face in isometric: the face pointing toward viewer (positive y direction in our setup
  // means away; negative y is toward viewer depending on azimuth). We'll place the mouth as
  // raised segments on the pipe surface at a fixed angle.
  const mouthH = Math.min(16, h * 0.2);
  const mouthZ = BODY_Z + 3;
  // left and right edges of the mouth opening (approx 3 units apart on the surface)
  out.push(L(k.segment([x - 1.5, PY - P_R, mouthZ], [x - 1.5, PY - P_R, mouthZ + mouthH], P), { tone: "faint" }));
  out.push(L(k.segment([x + 1.5, PY - P_R, mouthZ], [x + 1.5, PY - P_R, mouthZ + mouthH], P), { tone: "faint" }));
  // upper lip (horizontal line connecting the top of the mouth)
  out.push(L(k.segment([x - 1.5, PY - P_R, mouthZ + mouthH], [x + 1.5, PY - P_R, mouthZ + mouthH], P), { tone: "lo" }));

  // top rim
  out.push(L(k.ring(x, PY, P_R - 0.8, bodyTop, P, 32), { tone: "mid" }));

  return out.join("");
}

// ── Keyboard ──────────────────────────────────────────────
function keyboard() {
  const out = [];
  for (let i = 0; i < PX.length; i++) {
    const x = PX[i];
    const plan = { x: x - KEY_W / 2, y: KEY_Y, w: KEY_W, d: KEY_D, r: 1.5 };
    // key body
    out.push(`<g data-part="key-${i}" class="key-group">`);
    out.push(S(k.slabOf(plan, KEY_Z, KEY_H, P, 4, 0.5), { tone: "hi", crease: "lo", className: `key-${i}` }));
    // front lip
    out.push(L(k.lineOnTop([plan.x + 1, plan.y + plan.d], [plan.x + plan.w - 1, plan.y + plan.d], KEY_Z + KEY_H, P), { tone: "lo" }));
    // gap between keys (shaded line)
    if (i < PX.length - 1) {
      out.push(L(k.rise([plan.x + plan.w, plan.y + 2], KEY_Z, KEY_Z + KEY_H, P), { tone: "faint" }));
    }
    // key dot (marker)
    out.push(D([at([x, KEY_Y + 2, KEY_Z + KEY_H])], { size: 0.4, tone: "lo" }));
    out.push(`</g>`);
  }
  // keybed (support under keys)
  const bed = { x: PX[0] - KEY_W / 2 - 4, y: KEY_Y - 3, w: (PX[4] - PX[0]) + KEY_W + 8, d: 3, r: 1 };
  out.push(S(k.slabOf(bed, KEY_Z - 2, 2, P, 4, 0.3), { tone: "lo", crease: "none" }));
  // back rail
  const rail = { x: bed.x, y: KEY_Y - 3, w: bed.w, d: 3, r: 1 };
  out.push(S(k.slabOf(rail, KEY_Z + KEY_H, 4, P, 4, 0.4), { tone: "mid" }));
  return out.join("");
}

// ── Pallets (valves inside chest, under each pipe) ───────
function pallets() {
  const out = [];
  for (let i = 0; i < PX.length; i++) {
    const x = PX[i];
    out.push(`<g data-part="pallet-${i}" class="pallet-group">`);
    // pallet disc
    out.push(S(k.cylinder(x, PY, PAL_R, PAL_Z, PAL_H, P, 28), { tone: "mid" }));
    out.push(L(k.ring(x, PY, PAL_R - 1, PAL_Z + PAL_H, P, 20), { tone: "faint" }));
    // spring above (small coil)
    const coil = k.coil(PAL_Z + PAL_H, PAL_Z + PAL_H + 8, [x, PY], 2, 3, "z", P, 5);
    out.push(L(coil.back + coil.front, { tone: "lo" }));
    out.push(`</g>`);
  }
  return out.join("");
}

// ── Tracker rods (key → pallet) ───────────────────────────
function trackers() {
  const out = [];
  for (let i = 0; i < PX.length; i++) {
    const x = PX[i];
    out.push(`<g data-part="rod-${i}" class="rod-group">`);
    // rod from key area to pallet area (through chest front wall)
    out.push(S(k.cylinder(x, KEY_Y - 4, ROD_R, ROD_Z, 8, P, 12, 0.2), { tone: "lo", crease: "none" }));
    // rod enters chest (horizontal through wall)
    out.push(S(k.cylinder(x, PY + PAL_R + 2, ROD_R, ROD_Z, 3, P, 12), { tone: "lo", crease: "none" }));
    // connector dot at key end
    out.push(D([at([x, KEY_Y - 4, ROD_Z + 4])], { size: 0.5, tone: "lo" }));
    // connector at pallet end
    out.push(D([at([x, PY + PAL_R + 2, ROD_Z])], { size: 0.5, tone: "lo" }));
    out.push(`</g>`);
  }
  return out.join("");
}

// ── Assemble SVG ──────────────────────────────────────────
const pipeParts = [];
for (let i = 0; i < PX.length; i++) pipeParts.push(pipeFixed(i));

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A pipe organ. A wind chest holds air under pressure; each key pulls a tracker rod that opens a pallet valve beneath one pipe. Air rushes up the pipe and resonates at a frequency set by its length — longer pipe, lower note. The five pipes are tuned to C, D, E, G, A (a pentatonic scale), and their lengths follow the open-pipe formula f = v / 2L.",
  body: [
    base(),
    chest(),
    pallets(),
    ...pipeParts,
    keyboard(),
    trackers(),
  ],
});

// ── Live script ───────────────────────────────────────────
const live = `
const P = ${JSON.stringify(P)};
const NOTES = ${JSON.stringify(NOTES)};
const BODY_H = ${JSON.stringify(BODY_H)};
const BODY_Z = ${BODY_Z};
const P_R = ${P_R};
const PX = ${JSON.stringify(PX)};
const PY = ${PY};
const KEY_Y = ${KEY_Y};
const KEY_Z = ${KEY_Z};
const KEY_H = ${KEY_H};
const PAL_Z = ${PAL_Z};
const PAL_H = ${PAL_H};
const ROD_Z = ${ROD_Z};
const V = ${V};

const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

let active = 0;           // currently sounding pipe index
let target = 0;           // target index for animation
let touring = true;
let clock = 0;
let last = 0;
let visible = false;
let idleTimer = 0;

// key depression state
let keyDep = NOTES.map(() => 0);   // 0 = up, 1 = down
let palDep = NOTES.map(() => 0);   // 0 = closed, 1 = open

function pipeBodyEl(i) { return svgEl.querySelector(".pipe-body-" + i); }
function keyEl(i) { return svgEl.querySelector('[data-part="key-' + i + '"]'); }
function palletEl(i) { return svgEl.querySelector('[data-part="pallet-' + i + '"]'); }
function rodEl(i) { return svgEl.querySelector('[data-part="rod-' + i + '"]'); }

function setActive(i) {
  // swap lit class
  for (let j = 0; j < NOTES.length; j++) {
    const el = pipeBodyEl(j);
    if (!el) continue;
    if (j === i) el.setAttribute("data-lit", "1");
    else el.removeAttribute("data-lit");
  }
}

function draw() {
  for (let i = 0; i < NOTES.length; i++) {
    const kp = keyDep[i];
    const pp = palDep[i];
    // key: tilt front down by ~2 units when pressed
    if (kp > 0.001) {
      keyEl(i).setAttribute("transform", translateAlong(P, [0, 0, -kp * 2]));
    } else {
      keyEl(i).removeAttribute("transform");
    }
    // pallet: drop down when open
    if (pp > 0.001) {
      palletEl(i).setAttribute("transform", translateAlong(P, [0, 0, pp * 3]));
    } else {
      palletEl(i).removeAttribute("transform");
    }
    // rod: shift forward when key pressed
    if (kp > 0.001) {
      rodEl(i).setAttribute("transform", translateAlong(P, [0, kp * 1.5, 0]));
    } else {
      rodEl(i).removeAttribute("transform");
    }
  }
  setActive(active);
  const n = NOTES[active];
  const L = (V / (2 * n.freq) * 100).toFixed(1);
  const text = n.name + " · " + n.freq.toFixed(1) + " Hz · L = " + L + " cm";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(active));
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1/30) : 1/60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = Math.floor(clock / 1.8) % NOTES.length; }
  // ease active toward target
  const ease = calm ? 1 : 1 - Math.exp(-dt / 0.22);
  if (active !== target) {
    // start transitioning: depress old key, press new key
  }
  // for each note, set target depression
  const wantKey = NOTES.map((_, i) => i === target ? 1 : 0);
  const wantPal = NOTES.map((_, i) => i === target ? 1 : 0);
  for (let i = 0; i < NOTES.length; i++) {
    keyDep[i] += (wantKey[i] - keyDep[i]) * ease;
    palDep[i] += (wantPal[i] - palDep[i]) * ease;
    if (Math.abs(wantKey[i] - keyDep[i]) < 0.01) keyDep[i] = wantKey[i];
    if (Math.abs(wantPal[i] - palDep[i]) < 0.01) palDep[i] = wantPal[i];
  }
  active = target;
  draw();
  const settled = !touring && keyDep.every((v, i) => v === (i === target ? 1 : 0));
  if (!visible || (settled && calm)) { /* keep frame */ }
  if (visible && !settled) requestAnimationFrame(tick);
  else if (touring && visible) requestAnimationFrame(tick);
  else { /* need to restart on next pointer event */ }
}

function run() {
  if (visible) { last = 0; requestAnimationFrame(tick); }
}

function steer(i) {
  touring = false;
  target = Math.max(0, Math.min(NOTES.length - 1, i));
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4000);
  run();
}

new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);

if (still.matches) touring = false;

stage.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener("pointermove", (e) => {
  const box = svgEl.getBoundingClientRect();
  const share = ((e.clientX - box.left) / box.width - 0.2) / 0.6;
  const idx = Math.max(0, Math.min(4, Math.round(share * 4)));
  steer(idx);
});
stage.addEventListener("pointerup", () => steer(active));
stage.addEventListener("pointerleave", () => steer(active));
stage.addEventListener("keydown", (e) => {
  let to = null;
  if (e.key === "ArrowRight" || e.key === "ArrowUp") to = Math.min(4, active + 1);
  if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = Math.max(0, active - 1);
  if (e.key === "Home") to = 0;
  if (e.key === "End") to = 4;
  if (to === null) return;
  e.preventDefault();
  steer(to);
});
draw();
// start the animation loop
if (visible) run();
else { // ensure first draw even if off-screen
  draw();
}
`;

// ── Assemble HTML page ────────────────────────────────────
const body = k.plateHtml({
  fig: "Fig 1",
  title: "Pipe organ",
  hint: "Drag across the keyboard",
  readout: `${NOTES[0].name} · ${NOTES[0].freq.toFixed(1)} Hz · L = ${(V / (2 * NOTES[0].freq) * 100).toFixed(1)} cm`,
  keys: [
    { mark: "lit", label: "The sounding pipe: air resonates inside it" },
    { mark: "raised", label: "Five pipes tuned to C, D, E, G, A — open-pipe lengths" },
  ],
  caption:
    "A pipe organ. The wind chest holds air under pressure; press a key and its tracker pulls open a pallet valve beneath one pipe. Air rushes up the pipe and resonates at f = v / 2L — longer pipe, lower note. Drag across the keyboard to play each pipe.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Pipe organ: arrow keys select a note" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0">${svg}</div>`,
});

writeFileSync(
  join(HERE, theme === "light" ? "pipe-organ-light.html" : "pipe-organ.html"),
  k.pageHtml({ title: "Pipe organ", theme, body, script: kitScript() + live }),
);
console.log("wrote", theme === "light" ? "pipe-organ-light.html" : "pipe-organ.html");
