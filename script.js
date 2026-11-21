// Data lives in schedule.json (edited from the admin panel, see admin.js).
// overrides: { "YYYY-MM-DD": "names" } replaces ONE Friday; the rotation carries on underneath.
const DAY = 864e5;
let cfg;
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (d) =>
  d.toLocaleDateString("ar-u-ca-gregory", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const names = (g) => g.join(" و ");
const pad = (n) => String(n + 1).padStart(2, "0");
// setDate (not +n*DAY) so daylight-saving changes never shift the date.
const addDays = (d, n) => {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
};
const nextFriday = (today) => addDays(today, (5 - today.getDay() + 7) % 7);

// Who cleans on Friday `fri`: the rotation slot, unless that Friday is overridden.
function who(fri, c) {
  const n = c.groups.length;
  const weeks = Math.round((fri - new Date(c.start + "T00:00:00")) / (7 * DAY));
  const idx = ((weeks % n) + n) % n;
  const o = c.overrides[iso(fri)];
  return { idx, text: o || names(c.groups[idx]), swapped: !!o };
}

function render() {
  const fri = nextFriday(new Date());
  const now = who(fri, cfg);
  $("ch").textContent = "CH " + pad(now.idx);
  $("label").textContent = (iso(fri) === iso(new Date()) ? "اليوم " : "الجمعة القادمة: ") + fmt(fri);
  $("now").textContent = now.text;
  $("list").innerHTML = Array.from({ length: 8 }, (_, i) => {
    const d = addDays(fri, 7 * i);
    const w = who(d, cfg);
    return `<li${i ? "" : ' class="me"'}><b>CH ${pad(w.idx)}</b><span>${esc(w.text)}${w.swapped ? " <em>(تبديل)</em>" : ""}</span><small>${fmt(d)}</small></li>`;
  }).join("");
}

if (new URLSearchParams(location.search).has("test")) {
  const c = {
    start: "2026-11-27",
    groups: [["a"], ["b"], ["c"], ["d"]],
    overrides: { "2026-12-04": "x" },
  };
  console.assert(who(new Date(2026, 10, 27), c).idx === 0, "start Friday = group 0");
  console.assert(who(new Date(2026, 11, 4), c).idx === 1, "next Friday = group 1");
  console.assert(who(new Date(2026, 11, 4), c).text === "x", "override wins");
  console.assert(who(new Date(2026, 11, 11), c).text === "c", "override is one week only");
  console.assert(who(new Date(2026, 11, 25), c).idx === 0, "4 weeks later wraps");
  console.assert(who(new Date(2026, 10, 20), c).idx === 3, "before start works");
  console.assert(addDays(new Date(2026, 2, 27), 7).getHours() === 0, "DST-safe");
}

fetch("schedule.json?t=" + Date.now(), { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((j) => {
    if (!Array.isArray(j.groups) || !j.groups.length) throw 0;
    cfg = { overrides: {}, ...j };
    render();
  })
  .catch(() => { $("now").textContent = "تعذّر تحميل الجدول"; });

// The admin code is only downloaded when someone asks for it (keeps the TV page light).
$("admin").addEventListener(
  "click",
  () => document.body.append(Object.assign(document.createElement("script"), { src: "admin.js" })),
  { once: true },
);
