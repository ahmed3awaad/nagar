"use strict";
/* If an old copy of the page is cached next to this newer script, reload once with fresh files. */
(function () {
  const need = ["customEditor", "hwList", "shareWa", "view3d", "types"];
  if (need.some(id => !document.getElementById(id))) {
    let tried = false; try { tried = sessionStorage.getItem("nagar-reload") === "1"; sessionStorage.setItem("nagar-reload", "1"); } catch (e) {}
    if (!tried) { location.replace(location.pathname + "?r=" + Date.now() + location.hash); throw new Error("stale page, reloading"); }
  } else { try { sessionStorage.removeItem("nagar-reload"); } catch (e) {} }
})();
/* نجّار — حاسبة الورشة
   All sizes are in cm. State lives in localStorage on the device. */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const AR = n => Number(n).toLocaleString("ar-EG");
const fmt = (x, d = 1) => Number.isFinite(x) ? (Math.round(x * 10 ** d) / 10 ** d).toLocaleString("ar-EG", { maximumFractionDigits: d }) : "—";
const money = x => Number.isFinite(x) ? Math.round(x).toLocaleString("ar-EG") + " ج" : "—";
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const clampInt = (v, a, b) => Math.max(a, Math.min(b, Math.round(num(v)) || a));
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);

/* ================= defaults ================= */
const DEF_S = { T: 1.8, kerf: 0.4, sheetL: 244, sheetW: 122, grain: false, fullSheets: true,
  pSheet: 0, pBack: 0, pEdge: 0, pMisc: 0, pLabor: 0, profit: 30 };

const CATS = {
  flip:  { name: "قلابة (جزامة)", unit: "الواحدة",
           fields: [["p", "النقطة اللي بتلف عليها", "بعيدة قد إيه عن تحت الضلفة"], ["s", "الدخول لجوه", "من الحرف اللي قدام للخرم"], ["g0", "فراغ تحت أول ضلفة", "عشان متحكّش في الأرضية"]] },
  cup:   { name: "سوستة (ضلف)", unit: "الواحدة",
           fields: [["edge", "سنتر البنطة ٣٥ مللي", "من حرف الضلفة"], ["plate", "خرم القاعدة", "من حرف الجنب اللي قدام"], ["end", "أول وآخر مفصلة", "من طرف الضلفة"]] },
  butt:  { name: "مفصلة عادية", unit: "الواحدة",
           fields: [["end", "أول وآخر مفصلة", "من طرف الضلفة"]] },
  lift:  { name: "بيستون (رفع لفوق)", unit: "الواحد", fields: [] },
  slide: { name: "مجرى أدراج", unit: "الجوز",
           fields: [["clear", "الفراغ من كل جنب", "بين الصندوق والجنب"], ["line", "خط المجرى", "فوق تحت الدرج"]] }
};
const OVERLAYS = [["full", "طابق (بتغطي الجنب كله)"], ["half", "نص طابق"], ["inset", "داخلي (جوه الفتحة)"]];

const DEF_HW = [
  { id: "wesam", cat: "flip", name: "وسام القلابة", price: 0, p: 11.5, s: 3.5, g0: 1 },
  { id: "cup-full", cat: "cup", name: "سوستة طابق", price: 0, overlay: "full", edge: 2.2, plate: 3.7, end: 10 },
  { id: "cup-soft", cat: "cup", name: "سوستة سوفت كلوز", price: 0, overlay: "full", edge: 2.2, plate: 3.7, end: 10 },
  { id: "cup-half", cat: "cup", name: "سوستة نص طابق", price: 0, overlay: "half", edge: 2.2, plate: 3.7, end: 10 },
  { id: "cup-inset", cat: "cup", name: "سوستة داخلي", price: 0, overlay: "inset", edge: 2.2, plate: 3.7, end: 10 },
  { id: "butt", cat: "butt", name: "مفصلة عادية", price: 0, end: 8 },
  { id: "piston", cat: "lift", name: "بيستون غاز", price: 0 },
  { id: "slide-ball", cat: "slide", name: "مجرى بلي ٤٥ مللي", price: 0, clear: 1.27, line: 3.5, lengths: "25,30,35,40,45,50,55,60" },
  { id: "slide-roller", cat: "slide", name: "مجرى عادي أبيض", price: 0, clear: 1.25, line: 3, lengths: "25,30,35,40,45,50" }
];

const DEF_P = { type: "shoe", qty: 1,
  shoe: { H: 108, W: 100, D: 27, N: 3, h: 35, over: true, hw: "wesam" },
  shoe2: { H: 100, W: 80, D: 35, doors: 2, shelves: 4, hw: "cup-full" },
  cab: { H: 180, W: 90, D: 50, doors: 2, shelves: 3, open: "side", hw: "cup-full" },
  drawers: { H: 75, W: 50, D: 45, N: 3, hw: "slide-ball" },
  shelf: { H: 180, W: 80, D: 30, shelves: 4 },
  extra: [], custom: [] };

/* ================= storage ================= */
function load(key, def) {
  const out = JSON.parse(JSON.stringify(def));
  try {
    const v = JSON.parse(localStorage.getItem("nagara-" + key) || "null");
    if (Array.isArray(def)) return Array.isArray(v) && v.length ? v : out;
    if (v && typeof v === "object") for (const k in v) {
      if (out[k] && typeof out[k] === "object" && !Array.isArray(out[k]) && v[k] && typeof v[k] === "object") Object.assign(out[k], v[k]);
      else if (k in out) out[k] = v[k];
    }
  } catch (e) {}
  return out;
}
function save() {
  try {
    localStorage.setItem("nagara-s", JSON.stringify(S));
    localStorage.setItem("nagara-p", JSON.stringify(P));
    localStorage.setItem("nagara-hw", JSON.stringify(HW));
  } catch (e) {}
}
let S = load("s", DEF_S), P = load("p", DEF_P), HW = load("hw", DEF_HW);

const hwById = id => HW.find(h => h.id === id);
const hwOf = (...cats) => HW.filter(h => cats.includes(h.cat));
function pickHw(id, ...cats) { const h = hwById(id); return h && cats.includes(h.cat) ? h : (hwOf(...cats)[0] || DEF_HW.find(d => cats.includes(d.cat))); }

/* ================= project types ================= */
const ICON = {
  shoe: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="8" y="6" width="32" height="38" rx="2"/><path d="M11 9h26v10H11zM11 21h26v10H11zM11 33h26v8H11z"/></svg>',
  cab: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="8" y="4" width="32" height="40" rx="2"/><path d="M24 4v40M20 22v5M28 22v5"/></svg>',
  drawers: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="8" y="6" width="32" height="36" rx="2"/><path d="M8 18h32M8 30h32M20 12h8M20 24h8M20 36h8"/></svg>',
  shelf: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="8" y="4" width="32" height="40" rx="2"/><path d="M8 14h32M8 24h32M8 34h32"/></svg>',
  free: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="6" y="10" width="36" height="28" rx="2"/><path d="M6 24h20M26 10v28" stroke-dasharray="3 3"/></svg>',
  custom: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="8" y="8" width="24" height="32" rx="2"/><path d="M14 16h12M14 23h12M14 30h7"/><path d="M36 22l4 4-10 10h-4v-4z"/></svg>',
  add: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><rect x="8" y="8" width="32" height="32" rx="6" stroke-dasharray="4 4"/><path d="M24 16v16M16 24h16"/></svg>'
};
const BUILTIN = [
  { id: "shoe", name: "جزامة قلابة", sub: "مفصلة قلابة" },
  { id: "shoe2", name: "جزامة عادية", sub: "بضلف ورفوف" },
  { id: "cab", name: "دولاب بضلف", sub: "على جنب أو لفوق" },
  { id: "drawers", name: "وحدة أدراج", sub: "كومودينو / تسريحة" },
  { id: "shelf", name: "مكتبة رفوف", sub: "مفتوحة" },
  { id: "free", name: "شغل حر", sub: "قطع بس" }
];
const typeName = id => (BUILTIN.find(t => t.id === id) || P.custom.find(c => c.id === id) || { name: "شغلانة" }).name;

const opt = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(l)}</option>`).join("");
const hwOpts = (cats) => hwOf(...cats).map(h => [h.id, h.name]);
const FORMS = {
  shoe: () => [["hw", "نوع المفصلة", "", { select: hwOpts(["flip"]) }], ["H", "الارتفاع من جوه", "من الأرضية للسطح"], ["W", "العرض من جوه", "بين الجنبين"], ["D", "العمق", "عرض لوح الجنب"], ["N", "عدد الضلف", "", { int: 1 }], ["h", "ارتفاع الضلفة", ""]],
  cab: o => [["open", "الضلفة بتفتح", "", { select: [["side", "على جنب"], ["up", "لفوق (بيستون)"]] }], ["hw", "نوع المفصلة", "", { select: hwOpts(o.open === "up" ? ["cup"] : ["cup", "butt"]) }], ["H", "الارتفاع من بره", ""], ["W", "العرض من بره", ""], ["D", "العمق", "عرض لوح الجنب"], ...(o.open === "up" ? [] : [["doors", "عدد الضلف", "١ أو ٢", { int: 1 }]]), ["shelves", "عدد الرفوف", "", { int: 1 }]],
  shoe2: () => [["hw", "نوع المفصلة", "", { select: hwOpts(["cup", "butt"]) }], ["H", "الارتفاع من بره", ""], ["W", "العرض من بره", ""], ["D", "العمق", "٣٠ لـ ٤٠ سم للجزم"], ["doors", "عدد الضلف", "١ أو ٢", { int: 1 }], ["shelves", "عدد الرفوف", "", { int: 1 }]],
  drawers: () => [["hw", "نوع المجرى", "", { select: hwOpts(["slide"]) }], ["H", "الارتفاع من بره", ""], ["W", "العرض من بره", ""], ["D", "العمق", "عرض لوح الجنب"], ["N", "عدد الأدراج", "", { int: 1 }]],
  shelf: () => [["H", "الارتفاع من بره", ""], ["W", "العرض من بره", ""], ["D", "العمق", ""], ["shelves", "عدد الرفوف", "", { int: 1 }]],
  free: () => []
};

const nameAt = (i, N, word) => N === 1 ? word : (i === N - 1 ? word + " اللي فوق" : i === 0 ? word + " التحتانية" : word + " رقم " + AR(i + 1));

/* ================= drawings ================= */
/* A board seen flat: front edge on the right, bottom at the bottom. marks: {h, in, ring, line, slide} */
function panelSVG(L, Wd, marks, caption, frontLabel) {
  const Wpx = 200, Hpx = 360, pad = 22;
  const sc = Math.min((Hpx - 2 * pad - 16) / Math.max(L, 1), (Wpx - 96) / Math.max(Wd, 1));
  const pw = Wd * sc, ph = L * sc, x0 = (Wpx - pw) / 2 + 16, y0 = pad, front = x0 + pw, yOf = c => y0 + ph - c * sc;
  let g = `<rect x="${x0}" y="${y0}" width="${pw}" height="${ph}" fill="${css("--wood")}" stroke="${css("--woodEdge")}" stroke-width="1.5" rx="2"/>`;
  g += `<line x1="${front}" y1="${y0}" x2="${front}" y2="${y0 + ph}" stroke="${css("--tape")}" stroke-width="3"/>`;
  g += `<text x="${front}" y="${y0 - 7}" fill="${css("--ink")}" font-size="11" font-weight="600" text-anchor="middle">${frontLabel || "قدام"}</text>`;
  g += `<text x="${x0 + pw / 2}" y="${Hpx - 4}" fill="${css("--muted")}" font-size="11" text-anchor="middle">${caption}</text>`;
  let lastY = -99;
  [...marks].sort((a, b) => a.h - b.h).forEach(m => {
    const y = yOf(m.h);
    if (m.line) {
      const t = Math.max(2, S.T * sc);
      g += `<rect x="${x0}" y="${y - t}" width="${pw}" height="${t}" fill="${css("--tape")}" opacity=".8"/>`;
    } else if (m.slide) {
      const xa = front - 0.3 * sc, xb = Math.max(x0, xa - m.slide * sc);
      g += `<line x1="${xb}" y1="${y}" x2="${xa}" y2="${y}" stroke="${css("--mark")}" stroke-width="3" stroke-linecap="round"/>`;
    } else {
      const x = front - m.in * sc;
      g += `<line x1="${x0 - 3}" y1="${y}" x2="${x}" y2="${y}" stroke="${css("--mark")}" stroke-dasharray="3 3"/>`;
      g += `<circle cx="${x}" cy="${y}" r="${m.ring ? 7 : 5.5}" fill="${m.ring ? "none" : css("--mark")}" stroke="${css("--mark")}" stroke-width="2.5"/>`;
    }
    if (Math.abs(lastY - y) >= 12) {
      g += `<text x="${x0 - 7}" y="${y + 4}" fill="${css("--ink")}" font-size="12" font-weight="600" text-anchor="end">${fmt(m.h)}</text>`;
      lastY = y;
    }
  });
  return `<svg width="${Wpx}" height="${Hpx}" viewBox="0 0 ${Wpx} ${Hpx}" role="img" aria-label="${caption}">${g}</svg>`;
}

/* ================= builders ================= */
/* Each builder returns { parts, status, drill, boxes, dots, hw:[{id,qty}], motion } — sizes for ONE piece. */
const part = (name, kind, l, w, qty, eTxt, edge, mat) => ({ name, kind, l, w, qty, eTxt, edge, mat: mat || "main" });

function buildShoe(o) {
  const T = S.T, hw = pickHw(o.hw, "flip");
  const g0 = num(hw.g0), p = num(hw.p), s = num(hw.s);
  const H = num(o.H), W = num(o.W), D = num(o.D), N = clampInt(o.N, 1, 8), h = num(o.h), over = !!o.over;
  const free = H - N * h - g0, gap = free / N;
  const sug = Math.floor(((H - g0) / N - 0.6) * 10) / 10;
  const flaps = []; for (let i = 0; i < N; i++) { const b = g0 + i * (h + gap); flaps.push({ b, pivot: b + p }); }
  const topL = W + 2 * T + (over ? 2 : 0), topD = D + (over ? 1 : 0), fw = W - 0.4;
  const parts = [
    part("جنب", "side", H, D, 2, "حرف قدام", H),
    part("أرضية", "top", W + 2 * T, D, 1, "حرف قدام", W + 2 * T),
    part("سطح", "top", topL, topD, 1, over ? "قدام وجنبين" : "حرف قدام", over ? topL + 2 * topD : topL),
    part("ضلفة", "flap", fw, h, N, "الأربع حروف", 2 * (fw + h)),
    part("ضهر", "back", W + 2 * T, H + T, 1, "—", 0, "back")
  ];
  let status;
  if (!(H > 0 && W > 0 && D > 0 && h > 0)) status = ["bad", "اكتب كل المقاسات."];
  else if (free < 0) status = ["bad", `الضلف أطول من الجزامة بـ ${fmt(-free)} سم. خلي الضلفة ${fmt(sug)} سم.`];
  else if (gap < 0.2) status = ["bad", `الضلف هتحك في بعض، الفاصل ${fmt(gap * 10)} مللي بس. خلي الضلفة ${fmt(sug)} سم.`];
  else if (gap > 1.5) status = ["warn", `هتقفل، بس فيه فراغ ${fmt(gap)} سم بين الضلف وشكله مش حلو. الأحسن ضلفة ${fmt(sug)} سم.`];
  else status = ["ok", `تمام، هتقفل كويس. فيه ${fmt(gap * 10)} مللي بين كل ضلفة والتانية.` + (W > 80 ? ` الضلفة عرضها ${fmt(fw)} سم، ولو الخشب PVC ممكن تتقوس مع الوقت.` : "")];
  const drill = { title: "اخرم فين على الجنب",
    svgs: [panelSVG(H, D, flaps.map(f => ({ h: f.pivot, in: s })), "الجنب من جوه — تحت")],
    marks: flaps.map((f, i) => ({ t: nameAt(i, N, "الضلفة"), n: f.pivot })).reverse(),
    tip: `قيس من <b>طرف الجنب اللي تحت</b> (الجنب واقف على الأرضية)، وكل النقط على بعد <b>${fmt(s)} سم</b> من الحرف اللي قدام. اعمل الجنب التاني زيه بالظبط.` };
  const boxes = [
    { kind: "top", w: W + 2 * T, h: T, d: D, x: 0, y: T / 2, z: 0 },
    { kind: "side", w: T, h: H, d: D, x: -(W / 2 + T / 2), y: T + H / 2, z: 0 },
    { kind: "side", w: T, h: H, d: D, x: W / 2 + T / 2, y: T + H / 2, z: 0 },
    { kind: "top", w: topL, h: T, d: topD, x: 0, y: T + H + T / 2, z: over ? 0.5 : 0 },
    { kind: "back", w: W + 2 * T, h: H + T, d: 0.3, x: 0, y: (H + T) / 2, z: -D / 2 - 0.15 }
  ];
  flaps.forEach(f => boxes.push({ kind: "flap", w: fw, h, d: T, x: 0, y: T + f.b + h / 2, z: D / 2 - T / 2,
    hinge: { axis: "x", px: 0, py: T + f.pivot, pz: D / 2 - s, sign: 1, max: 40 } }));
  const dots = []; flaps.forEach(f => [-1, 1].forEach(sd => dots.push({ x: sd * W / 2, y: T + f.pivot, z: D / 2 - s })));
  return { parts, status, drill, boxes, dots, hw: [{ id: hw.id, qty: 2 * N }], motion: true, sug };
}

function carcass(H, W, D, ns) {
  const T = S.T, Wi = W - 2 * T, Hi = H - 2 * T;
  const space = (Hi - ns * T) / (ns + 1);
  const shelfY = []; for (let i = 0; i < ns; i++) shelfY.push(T + (i + 1) * space + i * T);
  const parts = [part("جنب", "side", H, D, 2, "حرف قدام", H), part("سقف وأرضية", "top", Wi, D, 2, "حرف قدام", Wi)];
  if (ns > 0) parts.push(part("رف", "shelf", Wi - 0.2, D - 2, ns, "حرف قدام", Wi - 0.2));
  const back = part("ضهر", "back", W, H, 1, "—", 0, "back");
  const boxes = [
    { kind: "side", w: T, h: H, d: D, x: -(W / 2 - T / 2), y: H / 2, z: 0 },
    { kind: "side", w: T, h: H, d: D, x: W / 2 - T / 2, y: H / 2, z: 0 },
    { kind: "top", w: Wi, h: T, d: D, x: 0, y: T / 2, z: 0 },
    { kind: "top", w: Wi, h: T, d: D, x: 0, y: H - T / 2, z: 0 },
    { kind: "back", w: W, h: H, d: 0.3, x: 0, y: H / 2, z: -D / 2 - 0.15 }
  ];
  shelfY.forEach(y => boxes.push({ kind: "shelf", w: Wi - 0.2, h: T, d: D - 2, x: 0, y: y + T / 2, z: -1 }));
  return { parts, back, boxes, shelfY, space, Wi, Hi };
}

function hingeCount(len) { return len <= 90 ? 2 : len <= 160 ? 3 : len <= 200 ? 4 : 5; }
function spread(len, end, n) { const a = []; for (let i = 0; i < n; i++) a.push(n === 1 ? len / 2 : end + i * (len - 2 * end) / (n - 1)); return a; }

function buildCab(o) {
  const T = S.T, H = num(o.H), W = num(o.W), D = num(o.D), ns = clampInt(o.shelves, 0, 10);
  const up = o.open === "up";
  const hw = pickHw(o.hw, ...(up ? ["cup"] : ["cup", "butt"]));
  const overlay = hw.cat === "butt" ? "inset" : (hw.overlay || "full");
  const n = up ? 1 : clampInt(o.doors, 1, 2);
  const c = carcass(H, W, D, ns);
  let dh, dw, y0, x0, dz;
  if (overlay === "inset") { dh = H - 2 * T - 0.4; dw = (W - 2 * T - 0.4 - 0.3 * (n - 1)) / n; y0 = T + 0.2; x0 = -W / 2 + T + 0.2; dz = D / 2 - T / 2; }
  else if (overlay === "half") { dh = H - T; dw = (W - T - 0.3 * (n - 1)) / n; y0 = T / 2; x0 = -W / 2 + T / 2; dz = D / 2 + T / 2; }
  else { dh = H - 0.3; dw = (W - 0.3 * n) / n; y0 = 0.15; x0 = -W / 2 + 0.15; dz = D / 2 + T / 2; }
  const end = num(hw.end) || 10;
  const nh = up ? (dw <= 60 ? 2 : dw <= 100 ? 3 : 4) : hingeCount(dh);
  const hpos = spread(up ? dw : dh, end, nh);
  const pistons = up ? (W > 50 ? 2 : 1) : 0;
  const parts = [...c.parts, part("ضلفة", "flap", dh, dw, n, "الأربع حروف", 2 * (dw + dh)), c.back];
  const hwList = [{ id: hw.id, qty: nh * n }];
  const lift = pickHw(null, "lift");
  if (pistons && lift) hwList.push({ id: lift.id, qty: pistons });

  let status;
  const kg = dw * dh * T * 0.6 / 1000;
  if (!(H > 0 && W > 0 && D > 0)) status = ["bad", "اكتب كل المقاسات."];
  else if (!up && dw > 60) status = ["warn", `الضلفة عرضها ${fmt(dw)} سم، عريضة أوي وهتهبط. ${n === 1 ? "خليها ضلفتين" : "الأحسن تعمل دولابين جنب بعض"}.`];
  else if (up && dh > 60) status = ["warn", `الضلفة اللي بتفتح لفوق طولها ${fmt(dh)} سم، طويلة على البيستون. الأحسن ضلفتين فوق بعض.`];
  else if (ns > 0 && c.space < 18) status = ["warn", `الرفوف قريبة أوي من بعض (${fmt(c.space)} سم). قلل عدد الرفوف.`];
  else if (up) {
    const N = kg <= 3 ? 60 : kg <= 4.5 ? 80 : kg <= 6 ? 100 : 120;
    status = ["ok", `تمام. الضلفة وزنها حوالي ${fmt(kg)} كيلو، فمحتاج ${AR(pistons)} بيستون قوة حوالي ${AR(N)} نيوتن (تقريبي، اسأل البايع)، و${AR(nh)} مفصلات فوق.`];
  }
  else status = ["ok", `تمام. كل ضلفة محتاجة ${AR(nh)} مفصلات${ns ? `، والمسافة بين الرفوف ${fmt(c.space)} سم` : ""}.`];

  const marks = [], svgs = [];
  if (up) {
    marks.push({ group: "المفصلات — من طرف الضلفة الشمال" });
    hpos.forEach((h, i) => marks.push({ t: "مفصلة " + AR(i + 1), n: h }));
    svgs.push(panelSVG(dw, Math.min(dh, 60), hpos.map(h => ({ h, in: num(hw.edge), ring: true })), "الضلفة من ورا", "الحرف اللي فوق"));
  } else {
    marks.push({ group: "المفصلات — من تحت الضلفة" });
    [...hpos].reverse().forEach((h, i) => marks.push({ t: i === 0 ? "المفصلة اللي فوق" : i === nh - 1 ? "المفصلة اللي تحت" : "مفصلة في النص", n: h }));
    if (hw.cat === "cup") svgs.push(panelSVG(dh, Math.min(dw, 60), hpos.map(h => ({ h, in: num(hw.edge), ring: true })), "الضلفة من ورا", "ناحية المفصلة"));
  }
  if (ns) { marks.push({ group: "الرفوف — من تحت الجنب" }); [...c.shelfY].reverse().forEach((y, i) => marks.push({ t: "رف رقم " + AR(ns - i), n: y })); }
  const sideMarks = [...c.shelfY.map(y => ({ h: y, line: true }))];
  if (!up && hw.cat === "cup") hpos.forEach(h => sideMarks.push({ h: h + y0, in: num(hw.plate) }));
  if (!up && hw.cat === "butt") hpos.forEach(h => sideMarks.push({ h: h + y0, in: 0.4 }));
  svgs.push(panelSVG(H, D, sideMarks, "الجنب من جوه"));
  let tip;
  if (up) tip = `<b>الضلفة:</b> بنطة ٣٥ مللي على بعد <b>${fmt(num(hw.edge))} سم</b> من الحرف اللي فوق، وقاعدة المفصلة بتتربط في <b>السقف من تحت</b>. البيستون بيتركب على الجنبين حسب الورقة اللي معاه.`;
  else if (hw.cat === "butt") tip = `المفصلة العادية بتتركب على حرف الضلفة وحرف الجنب. الضلفة <b>داخلية</b> جوه الفتحة، وسايب ٢ مللي من كل ناحية.`;
  else tip = `<b>الضلفة:</b> بنطة ٣٥ مللي، سنترها على بعد <b>${fmt(num(hw.edge))} سم</b> من حرف الضلفة اللي ناحية المفصلة. <b>الجنب:</b> علّم على بعد <b>${fmt(num(hw.plate))} سم</b> من الحرف اللي قدام، على الأرقام اللي في رسمة الجنب. الشريط الأصفر مكان الرف.`;

  const boxes = c.boxes.slice();
  if (up) boxes.push({ kind: "flap", w: dw, h: dh, d: T, x: x0 + dw / 2, y: y0 + dh / 2, z: dz, hinge: { axis: "x", px: 0, py: y0 + dh, pz: dz - T / 2, sign: -1, max: 80 } });
  else if (n === 1) boxes.push({ kind: "flap", w: dw, h: dh, d: T, x: x0 + dw / 2, y: y0 + dh / 2, z: dz, hinge: { axis: "y", px: x0, py: 0, pz: dz - T / 2, sign: -1, max: 100 } });
  else {
    boxes.push({ kind: "flap", w: dw, h: dh, d: T, x: x0 + dw / 2, y: y0 + dh / 2, z: dz, hinge: { axis: "y", px: x0, py: 0, pz: dz - T / 2, sign: -1, max: 100 } });
    boxes.push({ kind: "flap", w: dw, h: dh, d: T, x: -x0 - dw / 2, y: y0 + dh / 2, z: dz, hinge: { axis: "y", px: -x0, py: 0, pz: dz - T / 2, sign: 1, max: 100 } });
  }
  const dots = [];
  if (!up && hw.cat === "cup") (n === 1 ? [-1] : [-1, 1]).forEach(sd => hpos.forEach(h => dots.push({ x: sd * (W / 2 - T), y: h + y0, z: D / 2 - num(hw.plate) })));
  return { parts, status, drill: { title: "اخرم فين", svgs, marks, tip }, boxes, dots, hw: hwList, motion: true };
}

function buildShoe2(o) {
  const R = buildCab({ ...o, open: "side" });
  const T = S.T, H = num(o.H), W = num(o.W), D = num(o.D), ns = clampInt(o.shelves, 0, 10);
  const space = (H - 2 * T - ns * T) / (ns + 1), perShelf = Math.floor((W - 2 * T) / 20), pairs = perShelf * (ns + 1);
  const best = Math.max(0, Math.floor((H - 2 * T + T) / (16 + T)) - 1);
  if (R.status[0] === "ok" || /الرفوف قريبة/.test(R.status[1])) {
    if (D < 28) R.status = ["warn", `العمق ${fmt(D)} سم قليل، الجزمة الرجالي طولها حوالي ٣٠ سم. خليه ٣٠ على الأقل.`];
    else if (space < 14) R.status = ["warn", `الرفوف قريبة أوي (${fmt(space)} سم) والجزم مش هتدخل. خليها ${AR(best)} رفوف.`];
    else R.status = ["ok", `تمام. بين كل رف والتاني ${fmt(space)} سم، وهتشيل حوالي ${AR(pairs)} جوز جزم (${AR(perShelf)} في كل دور).`];
  }
  R.sug = 0;
  return R;
}

function buildDrawers(o) {
  const T = S.T, H = num(o.H), W = num(o.W), D = num(o.D), N = clampInt(o.N, 1, 8);
  const hw = pickHw(o.hw, "slide");
  const clear = num(hw.clear), line = num(hw.line);
  const c = carcass(H, W, D, 0);
  const lens = String(hw.lengths || "").split(/[,،\s]+/).map(num).filter(x => x > 0).sort((a, b) => a - b);
  const L = lens.filter(x => x <= D - 2).pop() || 0;
  const zh = c.Hi / N;
  const fh = (H - 0.3 - 0.3 * (N - 1)) / N, fw = W - 0.3;
  const boxW = c.Wi - 2 * clear;
  const boxH = Math.floor(Math.min(zh - 4, fh - 3) * 2) / 2;
  const parts = [...c.parts,
    part("وش درج", "flap", fw, fh, N, "الأربع حروف", 2 * (fw + fh)),
    part("جنب درج", "shelf", L, boxH, 2 * N, "حرف فوق", L),
    part("قدام وورا الدرج", "shelf", boxW - 2 * T, boxH, 2 * N, "حرف فوق", boxW - 2 * T),
    c.back,
    part("قاع درج", "back", boxW, L, N, "—", 0, "back")];
  let status;
  if (!(H > 0 && W > 0 && D > 0)) status = ["bad", "اكتب كل المقاسات."];
  else if (!L) status = ["bad", `العمق ${fmt(D)} سم أقل من أقصر مجرى (${fmt(lens[0] || 0)} سم). كبّر العمق أو غيّر نوع المجرى.`];
  else if (boxH < 6) status = ["bad", `الأدراج واطية أوي (${fmt(boxH)} سم). قلل عدد الأدراج.`];
  else if (c.Wi > 90) status = ["warn", `الدرج عرضه ${fmt(boxW)} سم، كبير على المجرى. الأحسن تقسمها عمودين.`];
  else status = ["ok", `تمام. هتشتري مجرى طوله ${fmt(L, 0)} سم، وصندوق كل درج ${fmt(boxW)} عرض × ${fmt(L, 0)} عمق × ${fmt(boxH)} ارتفاع.`];
  const zones = []; for (let i = 0; i < N; i++) zones.push(T + i * zh);
  const drill = { title: "المجاري فين على الجنب",
    svgs: [panelSVG(H, D, zones.map(z => ({ h: z + line, slide: L })), "الجنب من جوه")],
    marks: zones.map((z, i) => ({ t: "مجرى " + nameAt(i, N, "الدرج"), n: z + line })).reverse(),
    tip: `الأرقام دي <b>خط المجرى</b> مقاس من طرف الجنب اللي تحت. أول المجرى على بعد <b>٣ مللي</b> من الحرف اللي قدام. صندوق الدرج أصغر من الفتحة بـ <b>${fmt(clear * 2)} سم</b> عشان المجرى (اتأكد من ورقة المجرى).` };
  const boxes = c.boxes.slice();
  for (let i = 0; i < N; i++) {
    const fy = 0.15 + i * (fh + 0.3) + fh / 2, by = zones[i] + 1 + boxH / 2, mv = L * 0.85;
    boxes.push({ kind: "flap", w: fw, h: fh, d: T, x: 0, y: fy, z: D / 2 + T / 2, move: mv });
    boxes.push({ kind: "shelf", w: boxW, h: boxH, d: L, x: 0, y: by, z: D / 2 - L / 2 - 0.3, move: mv });
  }
  return { parts, status, drill, boxes, dots: [], hw: [{ id: hw.id, qty: N }], motion: true };
}

function buildShelf(o) {
  const H = num(o.H), W = num(o.W), D = num(o.D), ns = clampInt(o.shelves, 0, 12);
  const c = carcass(H, W, D, ns);
  let status;
  if (!(H > 0 && W > 0 && D > 0)) status = ["bad", "اكتب كل المقاسات."];
  else if (c.Wi > 90) status = ["warn", `الرف عرضه ${fmt(c.Wi)} سم، ممكن يهبط من الوزن. حط قاطوع في النص أو قسّمها مكتبتين.`];
  else if (ns > 0 && c.space < 18) status = ["warn", `الرفوف قريبة أوي (${fmt(c.space)} سم). قلل عدد الرفوف.`];
  else status = ["ok", `تمام. المسافة بين كل رف والتاني ${fmt(c.space)} سم.`];
  const drill = { title: "الرفوف فين على الجنب",
    svgs: [panelSVG(H, D, c.shelfY.map(y => ({ h: y, line: true })), "الجنب من جوه")],
    marks: [...c.shelfY].reverse().map((y, i) => ({ t: "رف رقم " + AR(ns - i), n: y })),
    tip: `الأرقام دي مكان <b>تحت الرف</b>، مقاسة من طرف الجنب اللي تحت. علّم الجنبين مع بعض وهما نايمين جنب بعض.` };
  return { parts: [...c.parts, c.back], status, drill, boxes: c.boxes, dots: [], hw: [], motion: false };
}

const EDGE_OPTS = [["0", "من غير"], ["1", "حرف طويل"], ["2", "حرفين طوال"], ["4", "الأربع حروف"]];
function edgeOf(spec, l, w) { return spec === "4" ? [2 * (l + w), "الأربع حروف"] : spec === "2" ? [2 * Math.max(l, w), "حرفين طوال"] : spec === "1" ? [Math.max(l, w), "حرف طويل"] : [0, "—"]; }
function buildCustom(t) {
  const parts = (t.parts || []).filter(p => num(p.l) > 0 && num(p.w) > 0).map(p => {
    const [e, eTxt] = edgeOf(String(p.edge), num(p.l), num(p.w));
    return part(p.name || "قطعة", p.mat === "back" ? "back" : "extra", num(p.l), num(p.w), clampInt(p.qty, 1, 500), eTxt, e, p.mat === "back" ? "back" : "main");
  });
  const hw = (t.hw || []).filter(h => hwById(h.id) && num(h.qty) > 0).map(h => ({ id: h.id, qty: num(h.qty) }));
  const nParts = parts.reduce((s, p) => s + p.qty, 0);
  const status = parts.length ? ["ok", `${AR(nParts)} ${nParts >= 3 && nParts <= 10 ? "قطع" : "قطعة"}. شوف التقطيع والحساب من تحت.`] : ["warn", "ضيف القطع اللي محتاجها في الجدول."];
  return { parts, status, drill: null, boxes: [], dots: [], hw, motion: false, custom: true };
}
function buildFree() {
  return { parts: [], status: ["ok", "اكتب القطع اللي عايزها في صفحة التقطيع، وهتطلعلك رسمة التقطيع والحساب."], drill: null, boxes: [], dots: [], hw: [], motion: false };
}
function build() {
  const t = P.type;
  if (t === "shoe") return buildShoe(P.shoe);
  if (t === "cab") return buildCab(P.cab);
  if (t === "shoe2") return buildShoe2(P.shoe2);
  if (t === "drawers") return buildDrawers(P.drawers);
  if (t === "shelf") return buildShelf(P.shelf);
  const c = P.custom.find(x => x.id === t);
  if (c) return buildCustom(c);
  P.type = "free"; return buildFree();
}

/* ================= cutting ================= */
function computeCut(B) {
  const q = clampInt(P.qty, 1, 50), main = [], back = [];
  B.parts.forEach(p => { if (p.l > 0 && p.w > 0) for (let i = 0; i < p.qty * q; i++) (p.mat === "back" ? back : main).push({ name: p.name, kind: p.kind, l: p.l, w: p.w }); });
  P.extra.forEach(e => { const l = num(e.l), w = num(e.w), n = clampInt(e.qty, 0, 200); if (l > 0 && w > 0) for (let i = 0; i < n; i++) main.push({ name: e.name || "قطعة", kind: "extra", l, w }); });
  const L = num(S.sheetL), W = num(S.sheetW), k = num(S.kerf);
  const pm = main.length && L > 0 && W > 0 ? pack(main, L, W, k, !S.grain) : { sheets: [] };
  const pb = back.length && L > 0 && W > 0 ? pack(back, L, W, k, true) : { sheets: [] };
  const area = a => a.reduce((s, it) => s + it.l * it.w, 0);
  let edge = 0; B.parts.forEach(p => edge += (p.edge || 0) * p.qty * q);
  return { q, main: pm, back: pb, mainArea: area(main), backArea: area(back), L, W, edgeM: edge / 100 * 1.1 };
}
const KCOL = { side: "--pSide", top: "--pTop", flap: "--pFlap", shelf: "--pShelf", extra: "--pExtra", back: "--pTop" };
function sheetSVG(sh, L, W) {
  const ink = css("--ink"), edge = css("--woodEdge"), muted = css("--muted");
  let g = `<rect x="0" y="0" width="${L}" height="${W}" fill="${css("--left")}" stroke="${edge}" stroke-width=".6"/>`;
  sh.free.forEach(f => {
    if (Math.min(f.w, f.h) >= 15 && f.w * f.h >= 500) {
      const t = `باقي ${fmt(f.w, 0)}×${fmt(f.h, 0)}`, fs = Math.min(4.2, f.h / 2.2, f.w / (t.length * 0.62));
      g += `<rect x="${f.x + .6}" y="${f.y + .6}" width="${f.w - 1.2}" height="${f.h - 1.2}" fill="none" stroke="${muted}" stroke-width=".35" stroke-dasharray="2 1.5"/>`;
      if (fs >= 2) g += `<text x="${f.x + f.w / 2}" y="${f.y + f.h / 2}" font-size="${fs}" fill="${muted}" text-anchor="middle" dominant-baseline="central">${t}</text>`;
    }
  });
  sh.parts.forEach(p => {
    g += `<rect x="${p.x}" y="${p.y}" width="${p.pw}" height="${p.ph}" fill="${css(KCOL[p.kind] || "--pExtra")}" stroke="${edge}" stroke-width=".45"/>`;
    const dim = `${fmt(p.l)}×${fmt(p.w)}`, nm = esc(p.name);
    const fs = Math.min(5.2, p.ph / 3.4, p.pw / (Math.max(p.name.length, dim.length) * 0.62));
    if (fs >= 2) {
      g += `<text x="${p.x + p.pw / 2}" y="${p.y + p.ph / 2 - fs * 0.62}" font-size="${fs}" font-weight="600" fill="${ink}" text-anchor="middle" dominant-baseline="central">${nm}</text>`;
      g += `<text x="${p.x + p.pw / 2}" y="${p.y + p.ph / 2 + fs * 0.62}" font-size="${fs * 0.85}" fill="${ink}" text-anchor="middle" dominant-baseline="central">${dim}</text>`;
    } else {
      const fs2 = Math.min(p.ph / 1.5, p.pw / (dim.length * 0.62));
      if (fs2 >= 1.6) g += `<text x="${p.x + p.pw / 2}" y="${p.y + p.ph / 2}" font-size="${fs2}" fill="${ink}" text-anchor="middle" dominant-baseline="central">${dim}</text>`;
    }
  });
  return `<svg viewBox="-1 -1 ${L + 2} ${W + 2}" role="img" aria-label="رسمة تقطيع اللوح">${g}</svg>`;
}

/* cut list as plain text for the cutting shop */
function cutListText() {
  const q = CUT.q, lines = [];
  lines.push(`قايمة تقطيع — ${typeName(P.type)}${q > 1 ? ` (${AR(q)} قطع)` : ""}`);
  lines.push(`الخشب تخانة ${fmt(S.T)} سم — اللوح ${fmt(S.sheetW, 0)}×${fmt(S.sheetL, 0)}`);
  lines.push("");
  const grp = {};
  B.parts.forEach(p => { const k = `${p.mat}|${p.name}|${fmt(p.l)}|${fmt(p.w)}|${p.eTxt}`; grp[k] = grp[k] || { ...p, n: 0 }; grp[k].n += p.qty * q; });
  P.extra.forEach(e => { if (num(e.l) > 0 && num(e.w) > 0) { const k = `main|${e.name}|${e.l}|${e.w}|`; grp[k] = grp[k] || { name: e.name || "قطعة", l: num(e.l), w: num(e.w), mat: "main", eTxt: "", n: 0 }; grp[k].n += clampInt(e.qty, 0, 200); } });
  const all = Object.values(grp);
  const mains = all.filter(p => p.mat !== "back"), backs = all.filter(p => p.mat === "back");
  mains.forEach(p => lines.push(`• ${p.name}: ${fmt(p.l)} × ${fmt(p.w)} — عدد ${AR(p.n)}${p.eTxt && p.eTxt !== "—" ? ` — شريط: ${p.eTxt}` : ""}`));
  if (backs.length) { lines.push(""); lines.push("لوح ٣ مللي:"); backs.forEach(p => lines.push(`• ${p.name}: ${fmt(p.l)} × ${fmt(p.w)} — عدد ${AR(p.n)}`)); }
  lines.push("");
  lines.push(`المطلوب: ${AR(CUT.main.sheets.length)} لوح خشب${CUT.back.sheets.length ? ` + ${AR(CUT.back.sheets.length)} لوح ٣ مللي` : ""}${CUT.edgeM > 0 ? ` + ${fmt(CUT.edgeM, 0)} متر شريط حرف` : ""}`);
  lines.push("المقاسات بالسنتي");
  return lines.join("\n");
}

/* ================= render ================= */
let B = null, CUT = null, lastType = null;
function update() {
  B = build();
  CUT = computeCut(B);
  renderPlan(); renderCut(); renderPrice();
  save();
}

function renderTypes() {
  const all = [...BUILTIN.map(t => ({ ...t, icon: THUMBS[t.id] ? `<img src="${THUMBS[t.id]}" alt="" width="64" height="64">` : (ICON[t.id] || ICON.shoe) })), ...P.custom.map(c => ({ id: c.id, name: c.name || "شغلانة", sub: "بتاعتك", icon: ICON.custom }))];
  $("#types").innerHTML = all.map(t => `<button class="type" type="button" data-type="${esc(t.id)}" aria-pressed="${t.id === P.type}">${t.icon}<strong>${esc(t.name)}</strong><span>${esc(t.sub)}</span></button>`).join("")
    + `<button class="type add" type="button" id="newType">${ICON.add}<strong>شغلانة جديدة</strong><span>اعملها بنفسك</span></button>`;
  $$(".type[data-type]").forEach(b => b.onclick = () => { P.type = b.dataset.type; renderTypes(); renderForm(); update(); });
  $("#newType").onclick = () => newCustom();
}
function newCustom(fromParts, fromHw, name) {
  const t = { id: "c" + uid(), name: name || "شغلانتي " + AR(P.custom.length + 1),
    parts: fromParts || [{ name: "جنب", l: 100, w: 40, qty: 2, mat: "main", edge: "1" }, { name: "رف", l: 60, w: 38, qty: 2, mat: "main", edge: "1" }],
    hw: fromHw || [] };
  P.custom.push(t); P.type = t.id;
  renderTypes(); renderForm(); update();
  setTimeout(() => { const n = $("#c-name"); if (n) { n.focus(); n.select(); } }, 50);
}

function renderForm() {
  const custom = P.custom.find(c => c.id === P.type);
  $("#form").hidden = !!custom; $("#customEditor").hidden = !custom;
  if (custom) { renderCustomEditor(custom); $("#formExtra").innerHTML = ""; return; }
  const o = P[P.type] || {};
  const fields = FORMS[P.type](o);
  $("#form").innerHTML = fields.map(([k, l, s, x = {}]) => {
    const input = x.select
      ? `<select id="f-${k}">${opt(x.select, o[k])}</select>`
      : `<input id="f-${k}" type="number" inputmode="decimal" step="${x.int ? 1 : 0.1}" value="${esc(o[k])}">`;
    return `<div class="f"><label for="f-${k}">${l}</label>${s ? `<small>${s}</small>` : ""}${input}${k === "h" ? '<span class="sug" id="sug"></span>' : ""}</div>`;
  }).join("") + (P.type !== "free" ? `<div class="f"><label for="f-qty">هتعمل كام واحدة</label><small>من نفس المقاس</small><input id="f-qty" type="number" inputmode="numeric" min="1" max="50" step="1" value="${esc(P.qty)}"></div>` : "");
  let extra = "";
  if (P.type === "shoe") extra += `<label class="check"><input type="checkbox" id="f-over" ${o.over ? "checked" : ""}> السطح طالع سنتي من الجنبين وقدام</label>`;
  if (P.type !== "free") extra += `<div class="row"><button type="button" class="btn ghost" id="toCustom">عدّل على القطع بنفسك</button><span class="hint flush">بتعمل نسخة منها تقدر تزوّد فيها وتشيل</span></div>`;
  $("#formExtra").innerHTML = extra;
  fields.forEach(([k, , , x = {}]) => {
    const el = $("#f-" + k);
    if (x.select) el.addEventListener("change", () => { P[P.type][k] = el.value; renderForm(); update(); });
    else el.addEventListener("input", () => { P[P.type][k] = el.value; update(); });
  });
  const fq = $("#f-qty"); if (fq) fq.addEventListener("input", () => { P.qty = fq.value; $("#cutQty").value = fq.value; update(); });
  const ov = $("#f-over"); if (ov) ov.addEventListener("change", () => { P.shoe.over = ov.checked; update(); });
  const tc = $("#toCustom"); if (tc) tc.onclick = () => {
    const parts = B.parts.map(p => ({ name: p.name, l: Math.round(p.l * 10) / 10, w: Math.round(p.w * 10) / 10, qty: p.qty, mat: p.mat, edge: p.eTxt === "الأربع حروف" ? "4" : p.edge > 0 ? "1" : "0" }));
    newCustom(parts, B.hw.map(h => ({ ...h })), typeName(P.type) + " (معدّلة)");
  };
}

function renderCustomEditor(t) {
  const box = $("#customEditor");
  box.innerHTML = `
    <div class="f wide"><label for="c-name">اسم الشغلانة</label><input id="c-name" value="${esc(t.name)}" class="txt"></div>
    <h3 class="sub">القطع</h3>
    <div class="ctable" id="c-parts">${t.parts.map((p, i) => `
      <div class="crow" data-i="${i}">
        <div><label for="cp-n-${i}">القطعة</label><input id="cp-n-${i}" data-k="name" value="${esc(p.name)}" class="txt"></div>
        <div><label for="cp-l-${i}">الطول</label><input id="cp-l-${i}" data-k="l" type="number" inputmode="decimal" value="${esc(p.l)}"></div>
        <div><label for="cp-w-${i}">العرض</label><input id="cp-w-${i}" data-k="w" type="number" inputmode="decimal" value="${esc(p.w)}"></div>
        <div><label for="cp-q-${i}">العدد</label><input id="cp-q-${i}" data-k="qty" type="number" inputmode="numeric" value="${esc(p.qty)}"></div>
        <div><label for="cp-e-${i}">شريط</label><select id="cp-e-${i}" data-k="edge">${opt(EDGE_OPTS, p.edge)}</select></div>
        <div><label for="cp-m-${i}">من</label><select id="cp-m-${i}" data-k="mat">${opt([["main", "الخشب"], ["back", "٣ مللي"]], p.mat)}</select></div>
        <button type="button" class="del" data-del="${i}" aria-label="امسح القطعة">✕</button>
      </div>`).join("")}</div>
    <div class="row"><button type="button" class="btn" id="c-addPart">+ ضيف قطعة</button></div>
    <h3 class="sub">المفصلات والإكسسوار</h3>
    <div id="c-hw">${t.hw.length ? t.hw.map((h, i) => `
      <div class="hrow" data-i="${i}">
        <div><label for="ch-id-${i}">النوع</label><select id="ch-id-${i}" data-k="id">${opt(HW.map(x => [x.id, x.name]), h.id)}</select></div>
        <div><label for="ch-q-${i}">العدد</label><input id="ch-q-${i}" data-k="qty" type="number" inputmode="numeric" value="${esc(h.qty)}"></div>
        <button type="button" class="del" data-hdel="${i}" aria-label="امسح">✕</button>
      </div>`).join("") : '<p class="hint flush">مفيش.</p>'}</div>
    <div class="row"><button type="button" class="btn" id="c-addHw">+ ضيف مفصلة أو مجرى</button></div>
    <div class="row split"><button type="button" class="btn danger" id="c-delete">امسح الشغلانة دي</button><span class="hint flush" id="c-confirm"></span></div>`;
  $("#c-name").addEventListener("input", e => { t.name = e.target.value; save(); $$(`.type[data-type="${t.id}"] strong`).forEach(s => s.textContent = t.name || "شغلانة"); });
  box.querySelectorAll(".crow input, .crow select").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => { t.parts[+el.closest(".crow").dataset.i][el.dataset.k] = el.value; update(); }));
  box.querySelectorAll(".hrow input, .hrow select").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => { t.hw[+el.closest(".hrow").dataset.i][el.dataset.k] = el.value; update(); }));
  box.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { t.parts.splice(+b.dataset.del, 1); renderCustomEditor(t); update(); });
  box.querySelectorAll("[data-hdel]").forEach(b => b.onclick = () => { t.hw.splice(+b.dataset.hdel, 1); renderCustomEditor(t); update(); });
  $("#c-addPart").onclick = () => { t.parts.push({ name: "قطعة", l: 50, w: 30, qty: 1, mat: "main", edge: "1" }); renderCustomEditor(t); update(); };
  $("#c-addHw").onclick = () => { t.hw.push({ id: HW[0] ? HW[0].id : "", qty: 2 }); renderCustomEditor(t); update(); };
  let armed = false;
  $("#c-delete").onclick = () => {
    if (!armed) { armed = true; $("#c-delete").textContent = "دوس تاني عشان تتمسح"; $("#c-confirm").textContent = "مش هترجع تاني."; return; }
    P.custom = P.custom.filter(x => x.id !== t.id); P.type = "shoe"; renderTypes(); renderForm(); update();
  };
}

function renderPlan() {
  const st = $("#status"); st.className = "status " + B.status[0]; st.textContent = B.status[1];
  const sug = $("#sug");
  if (sug && B.sug > 0) { sug.innerHTML = `المناسب: ${fmt(B.sug)} سم <button type="button" id="useSug">استخدمه</button>`; $("#useSug").onclick = () => { P.shoe.h = B.sug; $("#f-h").value = B.sug; update(); }; }
  else if (sug) sug.textContent = "";
  $("#drillCard").hidden = !B.drill;
  if (B.drill) {
    $("#drillTitle").textContent = B.drill.title;
    $("#svgs").innerHTML = B.drill.svgs.join("");
    $("#marks").innerHTML = B.drill.marks.length ? B.drill.marks.map(m => m.group ? `<li class="group">${m.group}</li>` : `<li><span class="t">${m.t}</span><span class="n">${fmt(m.n)} سم</span></li>`).join("") : '<li><span class="t">مفيش رفوف</span></li>';
    $("#tip").innerHTML = B.drill.tip;
  }
  $("#card3d").hidden = !B.boxes.length; $("#openRow").hidden = !B.motion;
  build3D();
  const q = CUT.q;
  $("#partsTable").innerHTML = B.parts.length ? `<thead><tr><th>القطعة</th><th>المقاس (سم)</th><th>العدد</th><th>شريط</th><th>من</th></tr></thead><tbody>${B.parts.map(p => `<tr><td>${esc(p.name)}</td><td>${fmt(p.l)} × ${fmt(p.w)}</td><td>${AR(p.qty * q)}</td><td>${p.eTxt || "—"}</td><td>${p.mat === "back" ? "لوح ٣ مللي" : "الخشب"}</td></tr>`).join("")}</tbody>` : "";
  const chips = [];
  if (CUT.main.sheets.length) chips.push(["ألواح خشب", AR(CUT.main.sheets.length), true]);
  if (CUT.back.sheets.length) chips.push(["ألواح ٣ مللي", AR(CUT.back.sheets.length)]);
  if (CUT.edgeM > 0) chips.push(["شريط حرف", fmt(CUT.edgeM, 0) + " متر"]);
  B.hw.forEach(h => { const x = hwById(h.id); if (x) chips.push([x.name, AR(h.qty * q) + (x.cat === "slide" ? " جوز" : "")]); });
  $("#planChips").innerHTML = chips.map(c => `<div class="chip ${c[2] ? "big" : ""}"><div class="k">${esc(c[0])}</div><div class="v">${c[1]}</div></div>`).join("");
}

function renderCut() {
  const { main, back, L, W, q } = CUT;
  $("#cutQty").value = P.qty;
  $$("#presets button").forEach(b => b.setAttribute("aria-pressed", b.dataset.l == S.sheetL && b.dataset.w == S.sheetW));
  const err = $("#cutErr");
  if (main.error) { err.hidden = false; err.textContent = `القطعة "${main.error.name}" (${fmt(main.error.l)}×${fmt(main.error.w)}) أكبر من اللوح. كبّر مقاس اللوح أو صغّر القطعة.`; }
  else err.hidden = true;
  const used = main.sheets.length ? CUT.mainArea / (main.sheets.length * L * W) * 100 : 0;
  const chips = [["ألواح خشب", AR(main.sheets.length), true], ["مستخدم من الخشب", fmt(used, 0) + "٪"]];
  if (back.sheets.length) chips.push(["ألواح ٣ مللي", AR(back.sheets.length)]);
  if (P.type !== "free") chips.push(["العدد", AR(q) + " " + typeName(P.type)]);
  $("#cutChips").innerHTML = chips.map(c => `<div class="chip ${c[2] ? "big" : ""}"><div class="k">${c[0]}</div><div class="v">${esc(c[1])}</div></div>`).join("");
  const legend = `<div class="legend"><span><i style="background:var(--pSide)"></i>جنوب</span><span><i style="background:var(--pTop)"></i>سقف وأرضية</span><span><i style="background:var(--pFlap)"></i>ضلف ووشوش</span><span><i style="background:var(--pShelf)"></i>رفوف وأدراج</span><span><i style="background:var(--pExtra)"></i>قطع تانية</span></div>`;
  $("#sheets").innerHTML = main.sheets.map((sh, i) => {
    const a = sh.parts.reduce((s, p) => s + p.l * p.w, 0) / (L * W) * 100;
    return `<div class="card sheet"><h3>لوح ${AR(i + 1)} <span>${fmt(L)} × ${fmt(W)} — مستخدم ${fmt(a, 0)}٪</span></h3>${sheetSVG(sh, L, W)}${i === 0 ? legend : ""}</div>`;
  }).join("") + (back.sheets.length ? `<div class="card sheet"><h3>لوح ٣ مللي <span>${AR(back.sheets.length)} لوح</span></h3>${back.sheets.map(sh => sheetSVG(sh, L, W)).join("")}</div>` : "");
  $("#shareWa").href = "https://wa.me/?text=" + encodeURIComponent(cutListText());
  renderExtra();
}
function renderExtra(force) {
  const box = $("#extra");
  if (!force && document.activeElement && box.contains(document.activeElement)) return;
  box.innerHTML = P.extra.length ? P.extra.map((e, i) => `<div class="xrow" data-i="${i}">
    <div><label for="x-n-${i}">اسمها</label><input id="x-n-${i}" data-k="name" value="${esc(e.name)}" class="txt"></div>
    <div><label for="x-l-${i}">الطول</label><input id="x-l-${i}" data-k="l" type="number" inputmode="decimal" value="${esc(e.l)}"></div>
    <div><label for="x-w-${i}">العرض</label><input id="x-w-${i}" data-k="w" type="number" inputmode="decimal" value="${esc(e.w)}"></div>
    <div><label for="x-q-${i}">العدد</label><input id="x-q-${i}" data-k="qty" type="number" inputmode="numeric" value="${esc(e.qty)}"></div>
    <button type="button" class="del" data-del="${i}" aria-label="امسح القطعة">✕</button></div>`).join("") : '<p class="hint flush">مفيش قطع زيادة.</p>';
  box.querySelectorAll("input").forEach(inp => inp.addEventListener("input", () => { P.extra[+inp.closest(".xrow").dataset.i][inp.dataset.k] = inp.value; update(); }));
  box.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { P.extra.splice(+b.dataset.del, 1); update(); renderExtra(true); });
}
$("#addExtra").onclick = () => { P.extra.push({ name: "رف", l: 60, w: 25, qty: 1 }); update(); renderExtra(true); };

function renderPrice() {
  const q = CUT.q, L = CUT.L, W = CUT.W;
  const mN = S.fullSheets ? CUT.main.sheets.length : (L * W ? CUT.mainArea / (L * W) : 0);
  const bN = S.fullSheets ? CUT.back.sheets.length : (L * W ? CUT.backArea / (L * W) : 0);
  const rows = [["ألواح الخشب", `${fmt(mN, 2)} × ${money(num(S.pSheet))}`, mN * num(S.pSheet)]];
  if (bN) rows.push(["ألواح ٣ مللي", `${fmt(bN, 2)} × ${money(num(S.pBack))}`, bN * num(S.pBack)]);
  if (CUT.edgeM) rows.push(["شريط الحرف", `${fmt(CUT.edgeM, 0)} متر`, CUT.edgeM * num(S.pEdge)]);
  B.hw.forEach(h => { const x = hwById(h.id); if (x) rows.push([x.name, `${AR(h.qty * q)} × ${money(num(x.price))}`, h.qty * q * num(x.price)]); });
  rows.push(["مسامير وحاجات", `× ${AR(q)}`, q * num(S.pMisc)]);
  rows.push(["المصنعية", `× ${AR(q)}`, q * num(S.pLabor)]);
  const cost = rows.reduce((s, r) => s + r[2], 0), price = cost * (1 + num(S.profit) / 100);
  $("#priceTitle").textContent = q > 1 ? `الحساب لـ ${AR(q)} قطع` : "الحساب";
  $("#priceTable").innerHTML = `<thead><tr><th>البند</th><th>الكمية</th><th>التمن</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td>${money(r[2])}</td></tr>`).join("")}</tbody><tfoot><tr><td>التكلفة</td><td></td><td>${money(cost)}</td></tr></tfoot>`;
  const big = [["التكلفة", money(cost)], ["سعر البيع", money(price), true], ["المكسب", money(price - cost)]];
  if (q > 1) big.push(["سعر الواحدة", money(price / q)]);
  $("#priceBig").innerHTML = big.map(c => `<div class="chip ${c[2] ? "big" : ""}"><div class="k">${c[0]}</div><div class="v">${c[1]}</div></div>`).join("");
  const missing = B.hw.some(h => { const x = hwById(h.id); return x && !num(x.price); });
  $("#priceHint").innerHTML = cost === 0 ? "اكتب الأسعار اللي فوق عشان يطلعلك الحساب." : missing ? 'فيه مفصلات أو مجاري من غير سعر. <a href="#hw">اكتب سعرها في صفحة المفصلات</a>.' : "سعر البيع = التكلفة + نسبة المكسب.";
}

/* ================= hardware library ================= */
function renderHw() {
  const box = $("#hwList");
  box.innerHTML = Object.entries(CATS).map(([cat, c]) => {
    const items = HW.filter(h => h.cat === cat);
    return `<div class="card"><div class="step"><h2>${c.name}</h2><span class="note">السعر لـ ${c.unit}</span></div>
      ${items.length ? items.map(h => {
        const i = HW.indexOf(h);
        return `<div class="hwitem" data-i="${i}">
          <div class="hwhead"><input class="txt hwname" id="h-name-${i}" data-k="name" value="${esc(h.name)}" aria-label="اسم النوع">
            <button type="button" class="del" data-hdel="${i}" aria-label="امسح النوع ده">✕</button></div>
          <div class="form">
            ${cat === "cup" ? `<div class="f"><label for="h-ov-${i}">الضلفة</label><select id="h-ov-${i}" data-k="overlay">${opt(OVERLAYS, h.overlay)}</select></div>` : ""}
            ${c.fields.map(([k, l, s]) => `<div class="f"><label for="h-${k}-${i}">${l}</label><small>${s} (سم)</small><input id="h-${k}-${i}" data-k="${k}" type="number" inputmode="decimal" step="0.1" value="${esc(h[k])}"></div>`).join("")}
            ${cat === "slide" ? `<div class="f"><label for="h-len-${i}">الأطوال اللي بتتباع</label><small>بالسنتي، وبينهم فاصلة</small><input id="h-len-${i}" data-k="lengths" class="txt" value="${esc(h.lengths)}"></div>` : ""}
            <div class="f"><label for="h-price-${i}">السعر</label><small>بالجنيه، لـ ${c.unit}</small><input id="h-price-${i}" data-k="price" type="number" inputmode="decimal" value="${esc(h.price)}"></div>
          </div></div>`;
      }).join("") : '<p class="hint flush">مفيش أنواع هنا.</p>'}
      <div class="row"><button type="button" class="btn" data-add="${cat}">+ ضيف نوع ${c.name}</button></div></div>`;
  }).join("");
  box.querySelectorAll(".hwitem input, .hwitem select").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
    const h = HW[+el.closest(".hwitem").dataset.i], k = el.dataset.k;
    h[k] = (k === "name" || k === "lengths" || k === "overlay") ? el.value : num(el.value);
    if (k === "name") renderForm();
    update();
  }));
  box.querySelectorAll("[data-hdel]").forEach(b => b.onclick = () => { HW.splice(+b.dataset.hdel, 1); renderHw(); renderForm(); update(); });
  box.querySelectorAll("[data-add]").forEach(b => b.onclick = () => {
    const cat = b.dataset.add, base = DEF_HW.find(d => d.cat === cat) || {};
    HW.push({ ...base, id: cat + "-" + uid(), name: "نوع جديد", price: 0 });
    renderHw(); renderForm(); update();
    const last = $("#h-name-" + (HW.length - 1));
    if (last) { last.focus(); last.select(); }
  });
}

/* ================= settings bindings ================= */
function bindNum(id, key) { const el = $(id); el.value = S[key]; el.addEventListener("input", () => { S[key] = num(el.value); update(); }); }
function fieldsHTML(list, prefix) { return list.map(([k, l, s]) => `<div class="f"><label for="${prefix}${k}">${l}</label>${s ? `<small>${s}</small>` : ""}<input id="${prefix}${k}" type="number" inputmode="decimal" step="0.1"></div>`).join(""); }
const WOOD = [["T", "تخانة الخشب", "عادة ١٫٨ سم"]];
const PRICES = [["pSheet", "سعر لوح الخشب", ""], ["pBack", "سعر لوح ٣ مللي", "للضهر وقاع الدرج"], ["pEdge", "سعر متر شريط الحرف", ""], ["pMisc", "مسامير وحاجات تانية", "للقطعة الواحدة"], ["pLabor", "المصنعية", "للقطعة الواحدة"], ["profit", "نسبة المكسب", "٪ فوق التكلفة"]];
$("#setupWood").innerHTML = fieldsHTML(WOOD, "s-");
$("#priceForm").innerHTML = fieldsHTML(PRICES, "s-");
[...WOOD, ...PRICES].forEach(([k]) => bindNum("#s-" + k, k));
["sheetL", "sheetW", "kerf"].forEach(k => bindNum("#s-" + k, k));
$("#s-grain").checked = !!S.grain; $("#s-grain").onchange = e => { S.grain = e.target.checked; update(); };
$("#s-fullSheets").checked = !!S.fullSheets; $("#s-fullSheets").onchange = e => { S.fullSheets = e.target.checked; update(); };
$("#cutQty").addEventListener("input", e => { P.qty = e.target.value; const f = $("#f-qty"); if (f) f.value = e.target.value; update(); });
$("#presets").innerHTML = [[244, 122], [244, 183], [280, 210]].map(([l, w]) => `<button type="button" data-l="${l}" data-w="${w}">${fmt(w, 0)} × ${fmt(l, 0)}</button>`).join("");
$$("#presets button").forEach(b => b.onclick = () => { S.sheetL = +b.dataset.l; S.sheetW = +b.dataset.w; $("#s-sheetL").value = S.sheetL; $("#s-sheetW").value = S.sheetW; update(); });
let resetArmed = false;
$("#resetHw").onclick = () => {
  if (!resetArmed) { resetArmed = true; $("#resetHw").textContent = "دوس تاني عشان ترجّعها"; $("#resetMsg").textContent = "هترجع الأنواع والمقاسات الأصلية، والأسعار هتتمسح."; return; }
  HW = JSON.parse(JSON.stringify(DEF_HW)); S.T = DEF_S.T; $("#s-T").value = S.T;
  resetArmed = false; $("#resetHw").textContent = "رجّع الأنواع الأصلية"; $("#resetMsg").textContent = "رجعت.";
  renderHw(); renderForm(); update();
};

/* share */
$("#copyList").onclick = async () => {
  const txt = cutListText();
  try { await navigator.clipboard.writeText(txt); $("#shareMsg").textContent = "اتنسخت."; }
  catch (e) { const ta = $("#shareText"); ta.hidden = false; ta.value = txt; ta.select(); $("#shareMsg").textContent = "اختارها وانسخها."; }
};
$("#printPlan").onclick = () => window.print();
if (navigator.share) {
  $("#shareNative").hidden = false;
  $("#shareNative").onclick = () => navigator.share({ title: "قايمة تقطيع", text: cutListText() }).catch(() => {});
}

/* ================= views ================= */
const VIEWS = ["plan", "cut", "price", "hw"];
const VNAMES = { plan: "الشغلانة", cut: "التقطيع", price: "الحساب", hw: "المفصلات والخشب" };
function showView() {
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "plan";
  VIEWS.forEach(n => { $("#v-" + n).hidden = n !== v; });
  $$(".tabbar a").forEach(a => { if (a.dataset.view === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  $("#viewName").textContent = VNAMES[v];
  if (v === "plan") requestAnimationFrame(size);
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", showView);

/* ================= 3D ================= */
const view = $("#view3d"); let renderer, scene, camera, controls, group; const S3 = 0.01;
const COL3 = { side: 0xefe9df, top: 0xe2d9c9, flap: 0xc9a273, shelf: 0xe7dccb, back: 0xcfc4b2, extra: 0xd8d8b8 };
function init3D() {
  if (!window.THREE) { view.innerHTML = '<p class="hint" style="padding:12px;margin:0">الرسمة 3D مش قادرة تحمّل دلوقتي، بس الأرقام شغالة.</p>'; return; }
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); view.appendChild(renderer.domElement);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(35, 1, 0.01, 30);
  controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x887766, 0.9));
  const d = new THREE.DirectionalLight(0xffffff, 0.7); d.position.set(-1, 2, 2); scene.add(d);
  new ResizeObserver(size).observe(view);
  (function loop() { requestAnimationFrame(loop); if (!view.offsetParent) return; controls.update(); renderer.render(scene, camera); })();
}
function size() { if (!renderer) return; const w = view.clientWidth, h = view.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
function mesh(w, h, d, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, .001), Math.max(h, .001), Math.max(d, .001)), new THREE.MeshStandardMaterial({ color, roughness: .8 }));
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x8a7a66 }))); return m;
}
function makeGroup(Bx, op) {
  const grp = new THREE.Group();
  let maxX = 1, maxY = 1;
  Bx.boxes.forEach(b => {
    const m = mesh(b.w * S3, b.h * S3, b.d * S3, COL3[b.kind] || 0xe0d8ca);
    maxX = Math.max(maxX, Math.abs(b.x) + b.w / 2); maxY = Math.max(maxY, b.y + b.h / 2);
    if (b.hinge) {
      const hg = new THREE.Group(), hz = b.hinge;
      hg.position.set(hz.px * S3, hz.py * S3, hz.pz * S3);
      m.position.set((b.x - hz.px) * S3, (b.y - hz.py) * S3, (b.z - hz.pz) * S3); hg.add(m);
      const a = hz.sign * op * hz.max * Math.PI / 180; if (hz.axis === "x") hg.rotation.x = a; else hg.rotation.y = a;
      grp.add(hg);
    } else { m.position.set(b.x * S3, b.y * S3, (b.z + (b.move ? b.move * op : 0)) * S3); grp.add(m); }
  });
  return { grp, maxX, maxY };
}
function build3D() {
  if (!scene || !B) return;
  if (group) { scene.remove(group); group.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); }
  const op = num($("#open").value) / 100;
  const r = makeGroup(B, op); group = r.grp; const maxX = r.maxX, maxY = r.maxY;
  B.dots.forEach(d => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 10), new THREE.MeshBasicMaterial({ color: 0xd23b2b })); s.position.set(d.x * S3, d.y * S3, d.z * S3); group.add(s); });
  scene.add(group);
  const H = maxY * S3, Wd = maxX * 2 * S3;
  controls.target.set(0, H / 2, 0);
  if (lastType !== P.type) { const mx = Math.max(Wd, H); camera.position.set(-mx * 1.1, H * 0.85, mx * 1.9); lastType = P.type; }
  size();
}
$("#open").addEventListener("input", build3D);

/* small 3D pictures for the project buttons, drawn once from each type's default sizes */
const THUMBS = {};
function makeThumbs() {
  if (!window.THREE) return;
  try {
    const size = 160, r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(size, size, false);
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x887766, 1)); const dl = new THREE.DirectionalLight(0xffffff, 0.75); dl.position.set(-1, 2, 2); sc.add(dl);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 30);
    const builders = { shoe: () => buildShoe(DEF_P.shoe), shoe2: () => buildShoe2(DEF_P.shoe2), cab: () => buildCab(DEF_P.cab), drawers: () => buildDrawers(DEF_P.drawers), shelf: () => buildShelf(DEF_P.shelf) };
    const opens = { shoe: .7, shoe2: .5, cab: .45, drawers: .6, shelf: 0 };
    for (const id in builders) {
      const g = makeGroup(builders[id](), opens[id]);
      sc.add(g.grp);
      const H = g.maxY * S3, Wd = g.maxX * 2 * S3, mx = Math.max(Wd, H);
      cam.position.set(-mx * 1.5, H * 1.05, mx * 2.6); cam.lookAt(0, H * 0.48, 0);
      r.render(sc, cam); THUMBS[id] = r.domElement.toDataURL("image/png");
      sc.remove(g.grp); g.grp.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); });
    }
    r.dispose(); r.forceContextLoss && r.forceContextLoss();
  } catch (e) {}
}
try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", update); } catch (e) {}

/* ================= start ================= */
if (!["shoe", "shoe2", "cab", "drawers", "shelf", "free"].includes(P.type) && !P.custom.find(c => c.id === P.type)) P.type = "shoe";
init3D(); makeThumbs(); renderTypes(); renderForm(); renderHw(); showView(); update();

/* ================= install as an app ================= */
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e; $("#installBtn").hidden = false; });
$("#installBtn").onclick = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); try { await deferredPrompt.userChoice; } catch (e) {} deferredPrompt = null; $("#installBtn").hidden = true; };
window.addEventListener("appinstalled", () => { $("#installBtn").hidden = true; });
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (isIOS && !standalone) $("#iosHint").hidden = false;
if ("serviceWorker" in navigator && location.protocol === "https:") {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register("sw.js").then(r => r.update()).catch(() => {});
}
