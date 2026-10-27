"use strict";
// 내 방 그림: 창밖(한국 시간·동네 날씨) + 가구 배치. 좌표는 원본 1024x683 기준이라 %로 바꿔 그린다.

const TINT = { morning: ["rgba(255,236,214,1)", .10], day: ["rgba(255,250,235,1)", .14], sunset: ["rgba(255,150,100,1)", .12], night: ["rgba(0,0,0,0)", 0] };
const SKYF = { clear: "none", cloud: "saturate(.35) brightness(.9)", rain: "brightness(.7) saturate(.5)", snow: "brightness(.85) saturate(.6)" };
const WXNAME = { clear: "맑음", cloud: "흐림", rain: "비", snow: "눈" };
const timeOf = h => h >= 6 && h < 10 ? "morning" : h >= 10 && h < 17 ? "day" : h >= 17 && h < 19 ? "sunset" : "night";
const pc = (v, base) => +(v / base * 100).toFixed(3);

// 동네 날씨: Open-Meteo(키 없음)를 1시간 캐시. 실패하면 맑음.
// shortcut: 시·도 대표 좌표만 씀 — 실서비스는 기상청 단기예보를 서버에서 동네별로 캐시(docs/v0.5/창밖_시간날씨_구현메모.md).
function wxOf(region) {
  const c = DB.wx[region];
  if (!c || Date.now() - c.at > 36e5) refreshWx(region);
  return c ? c.t : "clear";
}
const wxBusy = {};
async function refreshWx(region) {
  const ll = REGIONS[region]; if (!ll || wxBusy[region]) return;
  wxBusy[region] = true;
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ll[0]}&longitude=${ll[1]}&current=weather_code`);
    const code = (await r.json()).current.weather_code;
    const t = [71, 73, 75, 77, 85, 86].includes(code) ? "snow" : (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95 ? "rain" : [2, 3, 45, 48].includes(code) ? "cloud" : "clear";
    DB.wx[region] = { t, at: Date.now() }; save();
    $$(`.rscene[data-region="${CSS.escape(region)}"]`).forEach(s => { s.dataset.wx = t; $(".sky", s).style.filter = SKYF[t]; $(".wxbadge", s) && ($(".wxbadge", s).textContent = badge(s.dataset.own ? region : "", t)); });
    startFx();
  } catch (e) { DB.wx[region] = { t: "clear", at: Date.now() - 30 * 6e4 }; }  // 30분 뒤 다시 시도
  finally { wxBusy[region] = false; }
}
// 동네 이름은 주인에게만 보인다(다른 사람에겐 시간·날씨만)
const badge = (region, t) => { const k = kst(); return `KST ${String(k.h).padStart(2, "0")}:${k.mi} · ${region ? region + " " : ""}${WXNAME[t]}`; };

// 방 그림: 빈 방은 고른 벽·바닥(1~10), 꾸며진 방은 그 그림
const roomImg = u => u.room === "e" || !ROOMS[u.room] ? `img/room_e${String(EROOMS[u.ebg - 1] ? u.ebg : 1).padStart(2, "0")}.png` : ROOMS[u.room][2];
// 꾸며진 방은 산 사람만(시드 계정은 지금 쓰는 방을 가진 것으로 본다)
const ownRoom = (u, k) => k === "e" || u.room === k || (u.roomsOwned || []).includes(k);
function roomScene(u, edit = false) {
  const r = ROOMS[u.room] ? u.room : "e";
  const meImg = `<img class="me5" src="${charSrc(u.id)}" alt="${esc(u.nick)}의 캐릭터" style="z-index:630">`;
  const t = timeOf(kst().h), w = WIN[r], wx = wxOf(u.region);
  const pos = `left:${pc(w.x, 1024)}%;top:${pc(w.y, 683)}%;width:${pc(w.w, 1024)}%;height:${pc(w.h, 683)}%`;
  const own = me() && me().id === u.id;
  if (r === "e") {  // 빈 방도 창밖은 시간·날씨대로(유리를 뚫은 _cut 그림 뒤에 하늘)
    const items = Object.entries(u.furn || {}).filter(([k]) => FURN[k]).map(([k, [x, y]]) =>
      `<img class="fi" data-k="${k}" src="img/f_${k}.png" alt="${FURN[k][0]}" draggable="false" style="left:${pc(x, 1024)}%;top:${pc(y, 683)}%;width:${pc(FURN[k][1], 1024)}%;z-index:${k === "rug" ? 1 : Math.round(y)}">`).join("");
    return `<div class="rscene${edit ? " edit" : ""}" data-room="e" data-wx="${wx}" data-region="${esc(u.region)}"${own ? ' data-own="1"' : ""}>
    <img class="sky" src="img/sky_l_${t}.png" alt="" style="${pos};filter:${SKYF[wx]}"><canvas class="fx" style="${pos}"></canvas>
    <img class="rcut" src="${roomImg(u).replace(".png", "_cut.png")}" alt="${esc(u.nick)}의 방">${items}${meImg}<span class="wxbadge px">${esc(badge(own ? u.region : "", wx))}</span></div>`;
  }
  return `<div class="rscene" data-room="${r}" data-wx="${wx}" data-region="${esc(u.region)}"${own ? ' data-own="1"' : ""}>
    <img class="sky" src="img/sky_${r}_${t}.png" alt="" style="${pos};filter:${SKYF[wx]}"><canvas class="fx" style="${pos}"></canvas>
    <img class="rcut" src="img/room_${r}_cut.png" alt="${esc(u.nick)}의 ${ROOMS[r][0]}"><div class="tint" style="background:${TINT[t][0]};opacity:${TINT[t][1]}"></div>
    ${meImg}<span class="wxbadge px">${esc(badge(own ? u.region : "", wx))}</span></div>`;
}

// 비·눈 파티클 — 창 크기 캔버스에만 그린다
let fxRaf = 0, fxList = [];
function stopFx() { cancelAnimationFrame(fxRaf); fxList = []; }
function startFx() {
  stopFx();
  for (const s of $$(".rscene[data-wx]")) {
    const kind = s.dataset.wx, cv = $(".fx", s);
    if (!cv || (kind !== "rain" && kind !== "snow")) { cv && cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); continue; }
    cv.width = Math.max(1, cv.clientWidth); cv.height = Math.max(1, cv.clientHeight);
    const n = Math.round((kind === "rain" ? 140 : 90) * cv.width / 250);
    const parts = Array.from({ length: n }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, v: kind === "rain" ? 6 + Math.random() * 4 : .6 + Math.random() * .9, s: Math.random() < .3 ? 3 : 2, d: Math.random() * 6.28 }));
    fxList.push({ kind, cv, g: cv.getContext("2d"), parts });
  }
  if (!fxList.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const tick = () => {
    for (const { kind, cv, g, parts } of fxList) {
      g.clearRect(0, 0, cv.width, cv.height);
      for (const p of parts) {
        if (kind === "rain") { g.strokeStyle = "rgba(195,218,255,.75)"; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - 2, p.y + 10); g.stroke(); p.y += p.v; p.x -= .6; }
        else { g.fillStyle = "rgba(255,255,255,.95)"; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); p.y += p.v; p.d += .03; p.x += Math.sin(p.d) * .4; }
        if (p.y > cv.height) { p.y = -10; p.x = Math.random() * cv.width; }
      }
    }
    fxRaf = requestAnimationFrame(tick);
  };
  tick();
}
addEventListener("resize", () => fxList.length && startFx());

// 꾸미기: 빈 방 가구 끌어서 옮기기(마우스·터치 공통). 놓을 때 저장.
function bindFurnDrag(u) {
  const s = $(".rscene.edit"); if (!s) return;
  let drag = null;
  s.addEventListener("pointerdown", e => {
    const t = e.target.closest(".fi"); if (!t) return;
    const r = s.getBoundingClientRect(), [x, y] = u.furn[t.dataset.k];
    drag = { k: t.dataset.k, el: t, dx: (e.clientX - r.left) / r.width * 1024 - x, dy: (e.clientY - r.top) / r.height * 683 - y };
    t.classList.add("sel"); t.setPointerCapture(e.pointerId);
  });
  const move = e => {
    if (!drag) return;
    const r = s.getBoundingClientRect();
    const x = Math.max(30, Math.min(994, (e.clientX - r.left) / r.width * 1024 - drag.dx));
    const y = Math.max(470, Math.min(683, (e.clientY - r.top) / r.height * 683 - drag.dy));  // 바닥(벽 아래) 안에서만
    u.furn[drag.k] = [Math.round(x), Math.round(y)];
    Object.assign(drag.el.style, { left: pc(x, 1024) + "%", top: pc(y, 683) + "%", zIndex: drag.k === "rug" ? 1 : Math.round(y) });
  };
  s.addEventListener("pointermove", move);
  // 놓는 순간의 위치까지 반영하고 저장
  const end = e => { if (!drag) return; if (e && e.type === "pointerup") move(e); drag.el.classList.remove("sel"); drag = null; save(); };
  s.addEventListener("pointerup", end); s.addEventListener("pointercancel", end);
  // 키보드로도 옮길 수 있게: 가구에 초점 → 화살표
  s.addEventListener("keydown", e => {
    const t = e.target.closest(".fi"); if (!t) return;
    const d = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[e.key]; if (!d) return;
    e.preventDefault();
    const [x, y] = u.furn[t.dataset.k], nx = Math.max(30, Math.min(994, x + d[0])), ny = Math.max(470, Math.min(683, y + d[1]));
    u.furn[t.dataset.k] = [nx, ny];
    Object.assign(t.style, { left: pc(nx, 1024) + "%", top: pc(ny, 683) + "%", zIndex: t.dataset.k === "rug" ? 1 : ny });
    save();
  });
  $$(".fi", s).forEach(f => { f.tabIndex = 0; f.setAttribute("role", "button"); f.setAttribute("aria-label", `${FURN[f.dataset.k][0]} — 화살표로 옮기기`); });
}
