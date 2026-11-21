// Edit GROUPS to change people. Order = rotation order.
const GROUPS = [
  ["أحمد", "صادق"],
  ["محمد حسين", "سعيّد علي"],
  ["محمد حسن", "سعيّد محمد هادي"],
  ["حيدر علي", "محمد يعقووب"],
];
// A Friday when GROUPS[0] cleans. Edit to restart the rotation.
const START = "2026-11-27";

const DAY = 864e5;
const fmt = (d) =>
  d.toLocaleDateString("ar-u-ca-gregory", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Pure: which group cleans on the Friday on/after `today`.
function rota(today, start = START, n = GROUPS.length) {
  const s = new Date(start + "T00:00:00");
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const toFri = (5 - t.getDay() + 7) % 7;
  const fri = new Date(t.getTime() + toFri * DAY);
  const weeks = Math.round((fri - s) / (7 * DAY));
  return { fri, idx: ((weeks % n) + n) % n };
}

if (new URLSearchParams(location.search).has("test")) {
  console.assert(
    rota(new Date(2026, 10, 27)).idx === 0,
    "start Friday = group 0",
  );
  console.assert(
    rota(new Date(2026, 11, 4)).idx === 1,
    "next Friday = group 1",
  );
  console.assert(rota(new Date(2026, 11, 25)).idx === 0, "4 weeks later wraps");
  console.assert(rota(new Date(2026, 10, 21)).idx === 0, "before start works");
}

const { fri, idx } = rota(new Date());
const isToday = fri.toDateString() === new Date().toDateString();
const pad = (n) => String(n + 1).padStart(2, "0");
const names = (g) => GROUPS[g].join(" و ");
document.getElementById("ch").textContent = "CH " + pad(idx);
document.getElementById("label").textContent =
  (isToday ? "اليوم " : "الجمعة القادمة: ") + fmt(fri);
document.getElementById("now").textContent = names(idx);
document.getElementById("list").innerHTML = Array.from(
  { length: 8 },
  (_, i) =>
    `<li${i ? "" : ' class="me"'}><b>CH ${pad((idx + i) % GROUPS.length)}</b><span>${names((idx + i) % GROUPS.length)}</span><small>${fmt(new Date(fri.getTime() + i * 7 * DAY))}</small></li>`,
).join("");
