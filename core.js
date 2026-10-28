"use strict";
// 저장소·라우터·공통 도구.
// shortcut: 데이터와 로그인이 이 브라우저(localStorage)에만 있다 — 실서비스는 Supabase(RLS) + 카카오 로그인으로 바꾼다.

const KEY = "chueok.app.v1";
let DB = load();
function load() {
  let s = null;
  try { s = localStorage.getItem(KEY); } catch (e) {}
  if (s) {
    try { const d = JSON.parse(s); if (d && d.v === 1) return purge(migrate(d)); } catch (e) {}
    try { localStorage.setItem(KEY + ".broken", s); } catch (e) {}  // 깨진 원본은 따로 남겨 두고 새로 시작
    setTimeout(() => toast("저장된 데이터가 깨져 있어 처음 상태로 시작해요. (원본은 따로 보관했어요)"), 500);
  }
  return seed();
}
// 예전에 저장된 데이터를 지금 구조로 맞춘다(홈피 주소 채우기, 없앤 반 데이터 지우기)
function migrate(d) {
  delete d.classes; d.feed = (d.feed || []).filter(f => !/^#\/(c|j)\//.test(f.link || ""));  // 반 기능은 없앴다(2026-10-26 사장님 결정: 학교 반 초대가 따돌림 피해자를 소외시킬 수 있음)
  Object.values(d.users).forEach(u => { if (!u.handle) u.handle = u.id; });
  return d;
}
// 탈퇴 30일 지난 사람의 글·사진·기록·방문록·댓글·신청을 지운다
function purge(d) {
  const gone = Object.values(d.users).filter(u => u.withdrawnAt && Date.now() - new Date(u.withdrawnAt) > 30 * 864e5).map(u => u.id);
  if (!gone.length) return d;
  const g = id => gone.includes(id);
  d.posts = d.posts.filter(p => !g(p.author)); d.posts.forEach(p => p.comments = p.comments.filter(c => !g(c.author)));
  d.diaries = d.diaries.filter(x => !g(x.owner)); d.diaries.forEach(x => x.comments = x.comments.filter(c => !g(c.author)));
  d.photos = d.photos.filter(x => !g(x.owner)); d.guests = d.guests.filter(x => !g(x.owner) && !g(x.author));
  d.requests = d.requests.filter(r => !g(r.from) && !g(r.to)); d.feed = d.feed.filter(f => !g(f.to) && !g(f.from));
  Object.values(d.users).forEach(u => u.friends = u.friends.filter(f => !g(f)));
  gone.forEach(id => delete d.users[id]);
  if (g(d.myId)) d.myId = null;
  return d;
}
// 저장에 실패하면 마지막으로 저장된 상태로 되돌린다(반쯤 바뀐 메모리 상태가 남지 않게)
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(DB)); return true; }
  catch (e) {
    toast("저장 공간이 부족해서 저장하지 못했어요. 사진을 몇 장 지워 주세요.");
    try { const s = localStorage.getItem(KEY); if (s) DB = JSON.parse(s); } catch (e2) {}
    return false;
  }
}
// 다른 탭에서 바꾼 내용을 받아 온다(덮어쓰기 방지)
addEventListener("storage", e => { if (e.key === KEY && e.newValue) { try { DB = JSON.parse(e.newValue); refresh(); } catch (x) {} } });

// ---------- 작은 도구 ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const para = s => esc(maskBad(s)).split(/\n+/).filter(Boolean).map(l => `<p>${l}</p>`).join("");
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const nowISO = () => new Date().toISOString();
const num = n => Number(n || 0).toLocaleString("ko-KR");
const pad4 = n => String(n).padStart(4, "0");  // 4자리 LCD, 넘치면 그대로 늘어난다
// 이미지 주소는 우리 그림(img/) 이나 브라우저에서 줄인 사진(data:image/)만 받는다
const safeSrc = s => /^(img\/[\w.-]+\.png|data:image\/(jpeg|png|webp);base64,[\w+/=]+)$/.test(s || "") ? s : "img/i_polaroid.png";
const safeUrl = s => /^https:\/\/[^\s"'<>]+$/.test(s || "") ? s : "";
// 유튜브 주소 → 영상 id(11자). 아니면 빈 문자열
const ytId = s => isYoutube(s) ? ((String(s).match(/(?:youtu\.be\/|[?&]v=|\/shorts\/)([\w-]{11})/) || [])[1] || "") : "";
const isYoutube = s => /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|playlist\?list=)|youtu\.be\/)[\w-]{6,}/.test(s || "");
const ytList = s => isYoutube(s) ? ((String(s).match(/\/playlist\?list=([\w-]+)/) || [])[1] || "") : "";  // 플레이리스트 id
// 유튜브 삽입 주소의 앞부분(영상이면 id?, 플레이리스트면 videoseries?list=…&)
const ytEmbed = s => { const l = ytList(s); if (l) return `videoseries?list=${l}&`; const id = ytId(s); return id ? `${id}?` : ""; };
// 유튜브 영상 제목 → { title: 곡, artist: 가수(feat.누구) }. 못 나누면 제목 그대로
function parseSong(raw, author = "") {
  let s = String(raw || "").replace(/\[[^\]]*\]|【[^】]*】/g, " ");
  s = s.replace(/\(\s*(official\s*)?(music\s*)?(video|m\/?v|audio|lyrics?(\s*video)?|visuali[sz]er|performance\s*video|가사|뮤직비디오)\s*\)/gi, " ");
  s = s.replace(/\b(official\s*(music\s*)?(video|m\/?v|audio)|music\s*video|m\/v|lyrics?\s*video|visuali[sz]er)\b/gi, " ").replace(/\bMV\b/g, " ");
  let feat = "";
  s = s.replace(/[\(\[]?\s*(?:feat\.?|ft\.?|featuring)\s+([^)\]\-_|]+?)\s*[\)\]]?(?=\s*(?:[-_|'"’”]|$))/i, (m, f) => { feat = f.trim(); return " "; });
  s = s.replace(/\s+\|\s+.*$/, "").replace(/\s+/g, " ").trim();
  let title = "", artist = "";
  const q = s.match(/^(.*?)\s*['‘"“]([^'’"”]+)['’"”]\s*(.*)$/);
  if (q && q[2].trim()) { artist = q[1].trim(); title = q[2].trim(); }
  else { const p = s.match(/^(.+?)\s*(?:\s[-–—|]\s|_)\s*(.+)$/); if (p) { artist = p[1].trim(); title = p[2].trim(); } else title = s; }
  if (artist && /가사|lyric/i.test(String(raw))) [artist, title] = [title, artist];  // 가사 영상은 '곡 – 가수' 순서
  if (!artist && / - Topic$/.test(author)) artist = author.replace(/ - Topic$/, "").trim();
  if (feat) artist = (artist ? artist : "") + `(feat.${feat})`;
  return { title: (title || String(raw || "")).slice(0, 40), artist: artist.slice(0, 30) };
}

function kst(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" }).formatToParts(d).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: p.minute, wd: p.weekday, key: `${p.year}-${p.month}-${p.day}` };
}
const md = iso => { const k = kst(new Date(iso)); return `${String(k.m).padStart(2, "0")}.${String(k.d).padStart(2, "0")}`; };
const mdt = iso => { const k = kst(new Date(iso)); return `${md(iso)} ${String(k.h).padStart(2, "0")}:${k.mi}`; };
function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  return s < 60 ? "방금" : s < 3600 ? `${Math.floor(s / 60)}분 전` : s < 86400 ? `${Math.floor(s / 3600)}시간 전` : md(iso);
}
const WD = { Sun: "일", Mon: "월", Tue: "화", Wed: "수", Thu: "목", Fri: "금", Sat: "토" };

// ---------- 사람·권한 ----------
const me = () => (DB.me && DB.users[DB.me] && !DB.users[DB.me].withdrawnAt) ? DB.users[DB.me] : null;
const user = id => (id && has(DB.users, id) && DB.users[id]) || null;
const alive = u => u && !u.withdrawnAt && !u.admin;
const nick = id => { const u = user(id); return !u ? "알 수 없음" : u.withdrawnAt ? "탈퇴한 사용자" : u.nick; };
const charSrc = id => { const u = user(id); return `img/p_${u && CHARS[u.char] ? u.char : "beanie"}.png`; };
// 프로필 사진: 올린 사진이 있으면 그것(작은 칸은 정사각 썸네일, 크게는 원본), 없으면 캐릭터
// 접속 중: 나 자신, 최근 5분 안에 움직인 사람(데모는 demoOnline). 주인이 숨기면 남에게는 안 보인다
const isOnline = u => !!u && ((me() && me().id === u.id) || u.demoOnline || Date.now() - Date.parse(u.lastSeen || 0) < 5 * 6e4);
const onlineTag = u => { const own = me() && me().id === u.id; if (!own && u.settings.hideOnline) return ""; const on = isOnline(u);
  return `<span class="ol5 ${on ? "on" : "off"}"><i aria-hidden="true"></i><span class="sr">${esc(u.nick)} </span>${on ? "접속중" : "접속하지 않음"}${own && u.settings.hideOnline ? `<span aria-hidden="true"> 🔒</span><span class="sr"> (나만 보여요)</span>` : ""}</span>`; };
const avSrc = id => { const u = user(id); return u && u.pic && u.pic.thumb ? safeSrc(u.pic.thumb) : charSrc(id); };
// 크게 볼 때: 원본. 단 아주 넓거나(2:1 초과) 아주 작은(짧은 변 300px 미만) 사진은 띠·점이 되니 맞춘 정사각으로
const picSrc = id => { const u = user(id), p = u && u.pic; if (!p) return charSrc(id); return p.full && !(p.w / p.h > 2 || Math.min(p.w, p.h) < 300) ? safeSrc(p.full) : safeSrc(p.thumb); };
const isFriend = (a, b) => !!(user(a) && user(a).friends.includes(b));
function canSee(scope, owner) {
  const m = me();
  if (m && m.id === owner) return true;
  return scope === "all" || (scope === "friends" && m && isFriend(owner, m.id));
}
// ---------- 안심 설정 (차단·항목별 공개·검색 숨기기·방문록 권한) ----------
const prv = u => (u && u.privacy) || {};
const blocked = (a, b) => !!(user(a) && (user(a).blocked || []).includes(b));  // a 가 b 를 차단
const eitherBlocked = (a, b) => blocked(a, b) || blocked(b, a);
// 나와 상대 사이에 차단이 있으면 서로 안 보이게
const hiddenFromMe = id => { const m = me(); return !!(m && id && m.id !== id && eitherBlocked(m.id, id)); };
const fieldOk = (u, key) => canSee(prv(u)[key] || "all", u.id);      // 생일·좋아하는 것·그 시절/요즘 나
const findable = u => prv(u).search !== false && !hiddenFromMe(u.id); // 검색·인기·놀러가기·추천에 나오나
const SCOPES = [["all", "전체공개"], ["friends", "단짝 공개"], ["me", "전체 비공개"]];  // 공개 범위 이름은 어디서나 이 세 가지
const scopeLabel = s => (SCOPES.find(x => x[0] === s) || SCOPES[0])[1];
function needLogin() {
  if (me()) return false;
  toast("로그인이 필요해요. 카카오로 3초 만에 시작해요 ♡");
  go(`#/login?next=${encodeURIComponent(location.hash || "#/")}`);
  return true;
}
function addFeed(to, from, text, link) {
  if (!to || to === from || !user(to) || eitherBlocked(to, from)) return;  // 차단한 사이엔 알림도 안 간다
  if (DB.feed.some(f => f.to === to && f.from === from && f.link === link && f.text === text && !f.read)) return;  // 같은 알림 반복 방지
  DB.feed.unshift({ id: uid("n"), to, from, text, link, at: nowISO(), read: false });
  DB.feed = DB.feed.slice(0, 200);
}

// ---------- 화면 알림·대화상자 ----------
function toast(msg) {
  $$(".toast").forEach(x => x.remove());  // 같은 자리에 겹쳐 쌓이지 않게
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); t.addEventListener("click", () => t.remove());
  // 긴 안내(필터 경고·신고 완료)는 다 읽을 때까지 — 글자 수에 맞춰 2.6~8초, 큰 글씨면 1.5배. 누르면 닫힘
  setTimeout(() => t.remove(), Math.min(8000, Math.max(3400, String(msg).length * 70)) * (me()?.settings?.big ? 1.5 : 1));
}
// 브라우저 confirm/prompt 대신 화면 안 대화상자. onOk 가 false 를 돌려주면 닫지 않는다.
// danger: 되돌릴 수 없는 일이면 첫 초점을 '취소'에 둔다.
let modalOpener = null;
function modal({ title, body = "", ok = "확인", cancel = "취소", onOk, danger = false }) {
  closeModal();
  modalOpener = document.activeElement;
  const m = document.createElement("div");
  m.className = "modal-bg"; m.id = "modal";
  m.innerHTML = `<form class="modal y-win" role="dialog" aria-modal="true" aria-labelledby="mtitle">
    <div class="y-title"><b class="jua" id="mtitle">${esc(title)}</b><button type="button" class="mx" data-act="modal-close" aria-label="닫기">×</button></div>
    <div class="modal-in">${body}</div>
    <div class="dact5">${cancel ? `<button type="button" class="bv" data-act="modal-close">${esc(cancel)}</button>` : ""}<button class="bv pri">${esc(ok)}</button></div></form>`;
  document.body.appendChild(m);
  const f = $("form", m);
  f.addEventListener("submit", e => { e.preventDefault(); const fd = new FormData(f), w = formHasBad(fd); if (w) return toast(BLOCK_MSG(w.w, w.part)); if (!onOk || onOk(fd, f) !== false) closeModal(); });
  m.addEventListener("click", e => { if (e.target === m) closeModal(); });
  ((danger && f.querySelector(".dact5 .bv:not(.pri)")) || f.querySelector("input:not([type=hidden]),textarea,select") || f.querySelector(".pri")).focus();
}
function closeModal() {
  const m = $("#modal"); if (!m) return;
  m.remove();
  if (modalOpener && document.contains(modalOpener)) modalOpener.focus();
  modalOpener = null;
}
addEventListener("keydown", e => {
  const m = $("#modal"); if (!m) return;
  if (e.key === "Escape") return closeModal();
  if (e.key !== "Tab") return;  // 초점을 대화상자 안에 가둔다
  const f = $$("button,input,textarea,select,a[href]", m).filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !m.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
});

// ---------- 사진 줄이기 (업로드 전 브라우저에서 640px JPEG 로) ----------
function readImage(file, max = 640) {
  return new Promise((ok, no) => {
    if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return no(new Error("사진 파일(jpg·png·webp·gif)만 올릴 수 있어요."));
    if (file.size > 15e6) return no(new Error("15MB 이하 사진만 올릴 수 있어요."));
    const r = new FileReader();
    r.onerror = () => no(new Error("사진을 읽지 못했어요."));
    r.onload = () => {
      const im = new Image();
      im.onerror = () => no(new Error("사진을 읽지 못했어요."));
      im.onload = () => {
        const s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        ok(c.toDataURL("image/jpeg", 0.78));
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch (e) { modal({ title: "복사해서 쓰세요", body: `<textarea class="inp5 grow tall" readonly>${esc(text)}</textarea>`, cancel: "" }); }
}
async function share(text, url) {
  if (navigator.share) { try { await navigator.share({ title: "추억홈피", text, url }); return; } catch (e) { if (e.name === "AbortError") return; } }
  copyText(`${text} ${url}`, "메시지를 복사했어요. 카톡 대화방에 붙여 넣어 주세요 ♡");
}
// 홈피 주소: 내부 id 는 그대로 두고, 바꿀 수 있는 주소(handle)로도 찾는다
const handleOf = id => user(id)?.handle || id;
const byHandle = h => user(h) || Object.values(DB.users).find(u => u.handle === h) || null;
const homeUrl = id => `${location.origin}${location.pathname}#/h/${handleOf(id)}`;

// ---------- 라우터 ----------
let R = { path: [], q: {} };
// 처음 연 주소(받은 링크). 단짝 신청 기본값은 링크로 들어온 홈피에만 켠다(놀러가기·검색으로 들른 홈피는 끔)
function go(h) { if (location.hash === h) route(); else location.hash = h; }
// 같은 화면 다시 그리기(스크롤 유지). 주소를 바꿔야 하면 h 를 준다.
let keepScroll = false;
function refresh(h) { keepScroll = true; h && location.hash !== h ? (location.hash = h) : route(); }
const dec = s => { try { return decodeURIComponent(s); } catch (e) { return s; } };
function parseHash() {
  const [p, qs] = (location.hash.slice(1) || "/").split("?");
  let q = {};
  try { q = Object.fromEntries(new URLSearchParams(qs || "")); } catch (e) {}
  return { path: p.split("/").filter(Boolean).map(dec), q };
}
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const withQ = (patch) => { const q = { ...R.q, ...patch }; Object.keys(q).forEach(k => (q[k] === "" || q[k] == null) && delete q[k]); const s = new URLSearchParams(q).toString(); return "#/" + R.path.map(encodeURIComponent).join("/") + (s ? "?" + s : ""); };
function route() {
  closeModal(); stopFx();
  if (!route.ran) { route.ran = 1; try { if (!sessionStorage.getItem("entry")) sessionStorage.setItem("entry", location.hash || "#/"); } catch (e) {} }
  R = parseHash();
  const [a, b, c] = R.path;
  const V = VIEWS;
  let out;
  try {
    out = !a ? V.home()
      : a === "b" ? V.board(b)
      : a === "p" ? V.post(b)
      : a === "write" ? V.write(b)
      : a === "report" ? V.report(b, c)
      : a === "login" ? V.login()
      : a === "start" ? V.start(+b || 1)
      : a === "my" ? V.my()
      : a === "admin" ? V.admin()
      : a === "search" ? V.search()
      : a === "help" ? V.help()
      : a === "terms" || a === "privacy" ? V.policy(a)
      : a === "go" ? V.goRandom()
      : a === "h" ? V.hompy(b, c || "home")
      : null;
  } catch (e) { console.error(e); out = { body: "v4p y5p", title: "오류", html: portal("", `<section class="box empty5"><h2 class="jua">화면을 그리다 문제가 생겼어요</h2><p>${esc(e.message)}</p><a class="pbtn" href="#/">처음으로</a></section>`, "") }; }
  if (!out) out = V.notFound();
  if (out.redirect) return void location.replace(out.redirect);
  document.body.className = out.body + (me()?.settings?.big ? " bigtext" : "");  // 큰 글씨 설정
  document.title = (out.title ? maskBad(out.title) + " — " : "") + "추억홈피";
  $$(".oe-done").forEach(x => x.remove()); document.body.classList.remove("oe-mode");  // 순서 편집 모드의 아래 띠는 화면이 바뀌면 지운다
  $("#app").innerHTML = out.html;
  { const m = me(); if (m && Date.now() - Date.parse(m.lastSeen || 0) > 6e4) { m.lastSeen = nowISO(); save(); } }  // 내 접속 시각(1분에 한 번만 저장)
  mqStart(); document.fonts && document.fonts.ready.then(mqStart);  // 글꼴을 다 불러온 뒤 길이를 다시 잰다
  npStart(); document.fonts && document.fonts.ready.then(npStart);
  typeof bgmBind === "function" && bgmBind();
  // B+안: CSS order로 정한 칸 순서대로 실제 문서 순서도 바꾼다(스크린리더·Tab이 화면과 같은 순서로)
  $$(".hv-b").forEach(el => [...el.children].filter(c => c.tagName !== "STYLE").sort((a, b) => (+getComputedStyle(a).order || 0) - (+getComputedStyle(b).order || 0)).forEach(c => el.appendChild(c)));
  // 클로드 앱처럼 바깥 화면이 스크롤되는 곳에서도 새 화면은 맨 위부터 보이게
  mobileNav();
  if (!keepScroll) { scrollTo(0, 0); try { document.getElementById("app").scrollIntoView({ block: "start" }); } catch (e) {} }
  keepScroll = false;
  out.after?.();
  startFx();
}
addEventListener("hashchange", route);
// 데모 확인용 주소 옵션: ?reset=1(처음 데이터) &as=<계정 id>|out|pending &room=l|m|e — 화면 캡처·사용자 테스트에서 상태를 바로 맞춘다
(() => {
  const q = new URLSearchParams(location.search); if (![...q.keys()].length) return;
  if (q.get("reset")) DB = seed();
  const as = q.get("as");
  if (as === "out") { DB.me = null; DB.myId = null; }
  else if (as === "pending") { DB.me = null; DB.myId = null; DB.pending = { mkt: false, next: "", nick: "추억친구482", char: "", tone: "", big: false }; }
  else if (as && user(as)) DB.me = DB.myId = as;
  if (me() && ROOMS[q.get("room")]) me().room = q.get("room");
  save();
})();

// ---------- 이벤트 위임 (data-act 클릭, data-form 제출, data-change 변경) ----------
const ACT = {}, FORM = {}, CHG = {};
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const f = ACT[el.dataset.act]; if (!f) return;
  e.preventDefault(); f(el, e);
});
document.addEventListener("submit", e => {
  const f = e.target.closest("form[data-form]"); if (!f) return;
  e.preventDefault(); const fd = new FormData(f);
  if (!FILTER_SKIP.has(f.dataset.form)) { const w = formHasBad(fd); if (w) return toast(BLOCK_MSG(w.w, w.part)); }  // 욕설·음란·혐오 표현 막기
  FORM[f.dataset.form]?.(f, fd);
});
document.addEventListener("change", e => { const el = e.target.closest("[data-change]"); if (el) CHG[el.dataset.change]?.(el, e); });
document.addEventListener("input", e => { const el = e.target.closest("[data-input]"); if (el) CHG[el.dataset.input]?.(el, e); });
ACT["modal-close"] = closeModal;
ACT.nav = el => go(el.dataset.href);

// 폰 화면 아래 고정 메뉴: 앱 뷰어(클로드 앱 등)가 화면 위쪽을 덮어도 어디로든 갈 수 있게
function mobileNav() {
  const m = me(), cur = location.hash || "#/";
  const items = [["#/", "🏠", "홈"], [m ? `#/h/${m.id}` : "#/login", "🌟", "내 홈피"], ["#/go", "🎲", "놀러가기"], ["#/b/then", "📋", "게시판"], [m ? "#/my" : "#/login", "👤", m ? "마이" : "로그인"]];
  let nav = document.getElementById("mnav");
  if (!nav) { nav = document.createElement("nav"); nav.id = "mnav"; nav.setAttribute("aria-label", "아래 메뉴"); document.body.appendChild(nav); }
  nav.innerHTML = items.map(([h, i, n]) => `<a href="${h}" class="${(h === "#/" ? cur === "#/" || cur.startsWith("#/?") : cur.startsWith(h)) ? "on" : ""}"><span aria-hidden="true">${i}</span>${n}</a>`).join("");
}

// 맨 위 환영 문구: 넘치면 왼쪽으로 끝까지 흐르고, 끝에서 2초 멈췄다가 처음으로 돌아가 다시(움직임 줄이기면 흐르지 않고 줄을 바꿔 다 보여 준다)
function mqStart() {
  $$(".y-marquee").forEach(b => { const i = b.firstElementChild; if (!i) return; i.getAnimations().forEach(a => a.cancel()); b.classList.remove("mq-run");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    b.classList.add("mq-run"); const cs = getComputedStyle(b), d = Math.ceil(i.scrollWidth - (b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
    if (d <= 0) return b.classList.remove("mq-run");
    const s = d / 40, T = 1 + s + 2;
    const an = i.animate([{ transform: "translateX(0)" }, { transform: "translateX(0)", offset: 1 / T }, { transform: `translateX(${-d}px)`, offset: (1 + s) / T }, { transform: `translateX(${-d}px)` }], { duration: T * 1000, iterations: Infinity });
    // 멈출 수 있게(WCAG 2.2.2): 누르기·Enter·Space로 멈춤/다시, 마우스를 올리면 잠시 멈춤
    b.tabIndex = 0; b.setAttribute("role", "button"); b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", i.textContent.replace(/\s+/g, " ").trim() + " — 흐르는 문구, 누르면 멈춰요");
    const st = () => b.getAttribute("aria-pressed") === "true";
    b.onclick = () => { const p = !st(); b.setAttribute("aria-pressed", p); p ? an.pause() : an.play(); };
    b.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); b.click(); } };
    b.onmouseenter = () => an.pause(); b.onmouseleave = () => { if (!st()) an.play(); }; });
}
let mqT = 0; addEventListener("resize", () => { clearTimeout(mqT); mqT = setTimeout(mqStart, 200); });

// 노래 한 줄: 넘치면 흐르게(이미 흐르는 줄은 건너뜀, 글꼴을 다 불러온 뒤 한 번 더 잰다)
function npStart() { $$(".np5-t:not(.run)").forEach(t => { const s = t.firstElementChild; if (s.scrollWidth <= t.clientWidth + 1) return; t.classList.add("run"); t.tabIndex = 0; t.setAttribute("role", "button"); t.setAttribute("aria-pressed", "false"); t.setAttribute("aria-label", t.title + " — 흐르는 노래 제목, 누르면 멈춰요");
    // 누르거나 Enter·Space로 멈춤/다시 흐름(리더기·터치용)
    t.onclick = () => { const p = t.classList.toggle("stop"); t.setAttribute("aria-pressed", p); }; t.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t.click(); } }; s.insertAdjacentHTML("beforeend", `<span aria-hidden="true">${s.innerHTML}</span>`); s.style.animationDuration = Math.max(6, s.scrollWidth / 2 / 35) + "s"; }); }
