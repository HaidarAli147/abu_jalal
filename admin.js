// Admin panel. The password unlocks admin.enc.json (made by tools/encrypt.mjs), which holds a
// repo-scoped GitHub token; saving commits schedule.json. The token lives only in memory.
// shortcut: the encrypted file is public, so a weak password can be cracked offline; use 12+ chars.
(() => {
  const box = $("adminbox");
  let auth = null; // { repo, token }
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const gh = (path, opt = {}) =>
    fetch(`https://api.github.com/repos/${auth.repo}/${path}`, {
      cache: "no-store",
      ...opt,
      headers: {
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + auth.token,
      },
    });
  const say = (m, bad) => { $("amsg").textContent = m; $("amsg").className = bad ? "bad" : ""; };
  const isFri = (s) => /^\d{4}-\d\d-\d\d$/.test(s) && new Date(s + "T00:00:00").getDay() === 5;
  const split = (s) => s.split("+").map((x) => x.trim()).filter(Boolean);

  async function unlock(pw) {
    const f = await (await fetch("admin.enc.json", { cache: "no-store" })).json();
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: b64(f.salt), iterations: f.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(f.iv) }, key, b64(f.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  function loginView() {
    box.innerHTML = `<h2>دخول الإدارة</h2>
      <form id="alf"><label>كلمة المرور<input id="apw" type="password" autocomplete="current-password"></label>
      <p><button>دخول</button> <button type="button" id="aclose">إغلاق</button></p></form><p id="amsg"></p>`;
    $("aclose").onclick = () => (box.hidden = true);
    $("alf").onsubmit = async (e) => {
      e.preventDefault();
      try { auth = await unlock($("apw").value); } catch { return say("كلمة المرور غير صحيحة (أو الإدارة غير مفعّلة)", true); }
      editor();
    };
  }

  function editor() {
    const d = structuredClone(cfg);
    d.extra ||= []; // extra groups: not in the rotation, only used for swaps
    const L = { g: "groups", x: "extra" };
    // Read the form back into the working copy before any redraw (empty rows are kept until save).
    const parse = () => {
      for (const k in L) d[L[k]] = [...box.querySelectorAll(`[data-${k}]`)].map((i) => split(i.value));
      d.start = $("as").value;
    };
    const rows = (k) => d[L[k]].map((g, i) => `<p class="grow"><b>${i + 1}</b>
      <input data-${k}="${i}" value="${esc(g.join(" + "))}" placeholder="الأسماء بينها +">
      <button data-up="${k}${i}">▲</button> <button data-dn="${k}${i}">▼</button> <button data-rm="${k}${i}">حذف</button></p>`).join("");
    const draw = () => {
      box.innerHTML = `<h2>إدارة الجدول</h2>
        <h3>المجموعات (بالترتيب، والدور يمشي عليها)</h3>${rows("g")}
        <p><button id="gadd">+ مجموعة جديدة</button></p>
        <label>أول جمعة للمجموعة 1<input id="as" type="date" value="${d.start}"></label>
        <h3>مجموعات إضافية (خارج الدور، للتبديل المؤقت)</h3>${rows("x")}
        <p><button id="xadd">+ مجموعة إضافية</button></p>
        <h3>تبديل مؤقت (جمعة واحدة فقط)</h3>
        <ul>${Object.entries(d.overrides).sort().map(([k, v]) =>
          `<li>${k}: ${esc(v)} <button data-del="${k}">حذف</button></li>`).join("")}</ul>
        <p><input id="od" type="date">
        <select id="osel">${[...d.groups, ...d.extra].map((g, i) => g.length ? `<option value="${i}">${esc(names(g))}</option>` : "").join("")}</select>
        <button id="oadd">إضافة</button></p>
        <p><button id="asave">حفظ</button> <button id="aout">خروج</button> <button id="aclose">إغلاق</button></p>
        <p id="amsg"></p>`;
      const each = (attr, fn) => box.querySelectorAll(`[${attr}]`).forEach((b) => (b.onclick = () => {
        parse(); fn(b.dataset[attr.slice(5)]); draw();
      }));
      const at = (v, f) => f(d[L[v[0]]], +v.slice(1)); // v like "g2" = rotation group 3, "x0" = first extra group
      each("data-del", (k) => delete d.overrides[k]);
      each("data-rm", (v) => at(v, (a, i) => a.splice(i, 1)));
      each("data-up", (v) => at(v, (a, i) => { if (i > 0) [a[i - 1], a[i]] = [a[i], a[i - 1]]; }));
      each("data-dn", (v) => at(v, (a, i) => { if (i < a.length - 1) [a[i + 1], a[i]] = [a[i], a[i + 1]]; }));
      $("gadd").onclick = () => { parse(); d.groups.push([]); draw(); };
      $("xadd").onclick = () => { parse(); d.extra.push([]); draw(); };
      $("oadd").onclick = () => {
        const k = $("od").value, s = $("osel").value;
        parse();
        const g = [...d.groups, ...d.extra][+s];
        if (!isFri(k) || !s || !g || !g.length) return say("اختر يوم جمعة ومجموعة", true);
        d.overrides[k] = names(g); draw();
      };
      $("aclose").onclick = () => (box.hidden = true);
      $("aout").onclick = () => { auth = null; loginView(); };
      $("asave").onclick = save;
    };
    const save = async () => {
      parse();
      d.groups = d.groups.filter((g) => g.length);
      d.extra = d.extra.filter((g) => g.length);
      if (!d.groups.length || !isFri(d.start))
        return say("تأكد من المجموعات ومن أن تاريخ البداية يوم جمعة", true);
      try {
        const path = "contents/schedule.json";
        const cur = await gh(path);
        const sha = cur.ok ? (await cur.json()).sha : undefined;
        const text = JSON.stringify(d, null, 2) + "\n";
        const r = await gh(path, {
          method: "PUT",
          body: JSON.stringify({ message: "Update schedule", content: btoa(unescape(encodeURIComponent(text))), sha }),
        });
        if (!r.ok) return say("فشل الحفظ (" + r.status + ")", true);
        cfg = structuredClone(d);
        render();
        draw();
        say("تم الحفظ. يظهر للجميع خلال دقيقة تقريباً.");
      } catch { say("فشل الحفظ: لا يوجد اتصال", true); }
    };
    draw();
  }

  box.hidden = false;
  loginView();
})();
