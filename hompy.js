"use strict";
// 홈피: 소식(레이아웃 템플릿)·기록·앨범·방문록·프로필·꾸미기(주인만)

const TABS = [["home", "i_sun", "소식"], ["diary", "i_letter", "기록"], ["photo", "i_camera", "앨범"], ["guest", "i_heart", "방문록"], ["profile", "i_star", "프로필"]];

function countVisit(u) {  // 하루에 한 사람당 한 번만 센다(주인 제외)
  const m = me(); if (m && m.id === u.id) return;
  let vid = m ? m.id : null;
  if (!vid) { try { vid = localStorage.getItem("chueok.anon") || uid("a"); localStorage.setItem("chueok.anon", vid); } catch (e) { return; } }
  const today = kst().key, k = `${u.id}|${today}|${vid}`;
  if (DB.seen[k]) return;
  for (const key of Object.keys(DB.seen)) if (!key.includes(`|${today}|`)) delete DB.seen[key];  // 지난 날짜 기록은 버린다
  DB.seen[k] = 1;
  if (u.today.d !== today) u.today = { d: today, n: 0 };
  u.today.n++; u.total++;
  if (m && isFriend(u.id, m.id) && u.settings.notify.visit !== false) addFeed(u.id, m.id, "님이 내 홈피에 놀러왔어요.", `#/h/${m.id}`);
  save();
}

// 비교용 A안/B안: 주소 ?hv=a|b|auto (이 브라우저에 기억, QA·시연용)
const HV = () => { let v = "auto"; try { const q = new URLSearchParams(location.search).get("hv"); if (q) localStorage.setItem("chueok.hv", q); v = localStorage.getItem("chueok.hv") || "auto"; } catch (e) {} return v === "a" || v === "b" ? v : innerWidth <= 860 ? "b" : "a"; };
// 칸 순서(꾸미기 › 칸 순서). 맨 위 제목 줄은 고정
const SECS = [["room", "내 방", "b-room"], ["info", "소개·기분", "cv-info"], ["diary", "최근 기록", "b-diary"], ["album", "앨범", "b-album"], ["guest", "방문록", "b-guest"], ["friends", "놀러가 볼까?", "b-friends"]];
const secOrder = u => { const o = (u.secOrder || []).filter(k => SECS.some(s => s[0] === k)); return [...o, ...SECS.map(s => s[0]).filter(k => !o.includes(k))]; };
function hompyFrame(u, tab, inner, tpl) {
  const m = me(), own = m && m.id === u.id, today = u.today.d === kst().key ? u.today.n : 0, k = kst();
  const visCnt = own || !u.settings.hideVisits;  // 주인이 방문자 수를 숨기면 남에게는 안 보인다
  const tabs = TABS.map(([t, ic, label]) => `<a class="${t === tab ? "cur" : ""}" href="#/h/${u.id}${t === "home" ? "" : "/" + t}" ${t === tab ? 'aria-current="page"' : ""}><img src="img/${ic}.png" alt="">${label}</a>`).join("")
    + (tab === "home" ? "" : own ? `<a class="own ${tab === "deco" ? "cur" : ""}" href="#/h/${u.id}/deco"><img src="img/i_bow.png" alt="">꾸미기</a>` : m && !isFriend(u.id, m.id) ? `<a class="own" href="#/h/${u.id}/profile" data-act="freqsend" data-id="${u.id}"><img src="img/i_heart.png" alt="">단짝 신청</a>` : "");
  const sg = u.song || {}, songT = sg.title ? sg.title + (sg.artist ? " · " + sg.artist : "") : "";
  // 지금 듣는 노래 한 줄(지금 기분 위). 길면 core.js에서 흐르게 바꾼다
  const yid = ytEmbed(sg.url), auto = own || !m || m.settings.bgmAuto !== false;  // 남의 홈피 자동 재생은 보는 사람 설정
  const np = songT ? `<div class="np5"><img src="img/i_mp3.png" alt="노래"><span class="np5-t" title="${esc(songT)}"><span class="np5-s"><span>${esc(songT)}</span></span></span>${yid ? `<button class="np5-pp" data-act="bgm" aria-label="노래 재생" aria-pressed="false"><img src="img/btn_play_t${String(LAYOUTS[u.layout - 1] ? u.layout : 1).padStart(2, "0")}.png" alt=""></button>` : ""}${own ? `<a class="bv sm np5-ch" href="#/h/${u.id}/deco?s=song" aria-label="노래 변경">변경</a>` : ""}</div>${yid ? `<div class="bgm5"><iframe id="bgm5" data-auto="${auto ? 1 : 0}" src="https://www.youtube-nocookie.com/embed/${yid}enablejsapi=1&autoplay=${auto ? 1 : 0}&playsinline=1&rel=0&origin=${encodeURIComponent(location.origin)}" title="${esc(songT)} 공식 영상" allow="autoplay; encrypted-media" loading="eager"></iframe></div>` : ""}`
    : own ? `<div class="np5"><img src="img/i_mp3.png" alt=""><a class="lnk" href="#/h/${u.id}/deco?s=song">♪ 노래 고르기</a></div>` : "";
  const cover = `
    <section class="y-win ${tpl ? "b-cover " : ""}cover5">
      <div class="y-title"><span class="px">my_homepy.exe</span>${onlineTag(u)}<span class="y-btns" aria-hidden="true"><i>_</i><i>□</i><i>×</i></span></div>
      <div class="cv5-art"><img src="${u.room === "m" ? "img/ym_banner.png" : u.room === "l" ? "img/y_banner.png" : roomImg(u).replace(".png", "_band.png")}" alt=""><img class="stk s1" src="img/i_star.png" alt=""><img class="stk s2" src="img/i_heart.png" alt=""><img class="stk s3" src="img/i_moon.png" alt=""></div>
      <div class="cv5-body">
        <button class="purikura pk-btn" data-act="bigpic" data-id="${u.id}" aria-label="${esc(u.nick)} 사진 크게 보기" title="눌러서 크게 보기" aria-expanded="false"><img src="${avSrc(u.id)}" alt=""><span class="pk-zoom" aria-hidden="true">🔍 크게</span><span class="px">best friend 4ever</span></button>
        <div class="cv5-txt">
          <h1 class="jua glitter ttl">${esc(u.title)}</h1>
          <p class="hand">${esc(u.intro)}</p>${np}
          <div class="chips5">
            ${own ? `<button class="c5 mood" data-act="mood"><img src="img/i_heart.png" alt="">지금 기분 · ${esc(u.mood)} ✎</button>` : `<span class="c5 mood"><img src="img/i_heart.png" alt="">지금 기분 · ${esc(u.mood)}</span>`}
            ${u.birthday && fieldOk(u, "birthday") ? `<span class="c5"><img src="img/i_cherry.png" alt="">${esc(u.birthday)}</span>` : ""}
            ${u.likes && fieldOk(u, "likes") ? `<span class="c5"><img src="img/i_note.png" alt="">${esc(u.likes)}</span>` : ""}
            ${own ? `<button class="c5 share5" data-act="sharemine">🔗 친구에게 알리기</button><a class="c5 pfchg5" href="#/h/${u.id}/deco?s=pic">📷 프로필 사진 바꾸기</a>` : ""}
          </div>
        </div>
        ${!visCnt ? "" : `<div class="lcd" aria-label="방문자 수${u.settings.hideVisits ? " (나만 보여요)" : ""}">${today || !own ? `<div><span class="px dig">${pad4(today)}</span><em>오늘 놀러온 사람</em></div>` : `<button class="lcd-call" data-act="sharemine">♡ 단짝<br>불러 보기</button>`}<div><span class="px dig">${pad4(u.total)}</span><em>지금까지</em></div>${u.settings.hideVisits ? `<em class="hid5">🔒 나만 보여요</em>` : ""}</div>`}
      </div>
    </section>`;
  const nav = `<nav class="y-tabs ${tpl ? "b-tabs" : ""}" aria-label="홈피 메뉴"><span class="start px">♡ start</span>${tabs}<span class="clock px">${String(k.h % 12 || 12).padStart(2, "0")}:${k.mi} ${k.h < 12 ? "am" : "pm"}</span></nav>`;
  const bar = `<header class="y-bar"><div class="y-in"><a class="y-logo" href="#/"><img src="img/i_star.png" alt=""><b class="jua">추억홈피</b><span class="px">since 2026</span></a>
    <span class="y-bar-r">${m ? `<a href="#/h/${m.id}">내 홈피</a>` : `<a href="#/login?next=${encodeURIComponent(`#/h/${u.id}`)}">로그인</a>`}<a href="#/go">놀러가기</a><a href="#/b/then">게시판</a>${m ? `<a href="#/my">마이페이지</a>` : ""}</span></div></header>
    <div class="y-marquee"><div class="mq-in"><span class="px">* welcome to my homepy *</span> <span class="jua">${own ? "오늘도 반짝반짝 빛나는 하루 ♡" : `${esc(u.nick)}님 홈피에 놀러 왔어요 ♡`}</span> <span class="px">* ${kstDate()} *</span></div></div>`;
  const foot = `<footer class="y-foot"><div class="y-in"><span class="px">(c) 2026 chueok homepy</span> 추억홈피(가칭) · 데모 — 다른 서비스와 관계없는 독립 서비스입니다. <a href="#/terms">이용약관</a> · <a href="#/privacy"><b>개인정보 처리방침</b></a></div></footer>`;
  if (HV() === "b") {  // B안: 제목만 맨 위 → (소식 탭이면) 내 방 → 소개·기분·방문자 → 탭 → 나머지
    // 제목 줄: 작은 프리쿠라 + 테마 제목 + 방문자 수(TODAY·TOTAL)
    const head = `<section class="y-win cv-b"><div class="y-title"><span class="px">my_homepy.exe</span>${onlineTag(u)}<span class="y-btns" aria-hidden="true"><i>_</i><i>□</i><i>×</i></span></div>
      <div class="cvb-row cv5-txt"><span class="cvb-picw"><button class="cvb-pic" data-act="bigpic" data-id="${u.id}" aria-label="${esc(u.nick)} 사진 크게 보기" aria-expanded="false"><img class="av" src="${avSrc(u.id)}" alt=""></button></span><h1 class="jua glitter ttl">${esc(u.title)}</h1>
      ${visCnt ? `<span class="cvb-cnt"${u.settings.hideVisits ? ' title="방문자 수는 나만 보여요"' : ""}><span>오늘 <b>${num(today)}</b></span><span>전체 <b>${num(u.total)}</b></span>${u.settings.hideVisits ? `<span class="hid5">🔒 나만 보여요</span>` : ""}</span>` : ""}</div></section>`;
    const info = `<section class="y-win cv-info"><div class="cv5-txt"><p class="hand">${esc(u.intro)}</p>${np}<div class="chips5">${cover.split('<div class="chips5">')[1].split("</div>")[0].replace(/<a class="c5 pfchg5"[^>]*>[^<]*<\/a>/, "")}</div></div>${own ? `<span class="dact5 left">${!today ? `<button class="bv sm" data-act="sharemine">♡ 단짝 부르기</button>` : ""}<a class="bv sm" href="#/h/${u.id}/deco?s=pic">📷 사진 변경</a><button class="bv sm" data-act="ordedit">↕ 순서 변경</button></span>` : ""}</section>`;
    const ord = secOrder(u), hid = u.secHidden || [], ri = ord.indexOf("room");
    // 칸은 짝수 자리, 메뉴 탭은 내 방 바로 다음 홀수 자리에 고정. 숨긴 칸은 안 보이게
    const css = `<style>${SECS.map(([k, , c]) => `.hv-b > .${c}{order:${(ord.indexOf(k) + 1) * 2} !important${hid.includes(k) ? (R.q.ord === "1" && own ? ";opacity:.55" : ";display:none !important") : ""}}`).join("")}.hv-home > .y-tabs{order:${(ri + 1) * 2 + 1} !important}</style>`;
    const body = tab === "home" ? info + nav + inner.replace("<!--ROOM_END-->", "") : nav + inner;  // 다른 탭은 제목 → 탭 → 내용
    return `${bar}<div class="y-bg"><div class="y-in ${tpl ? "tpl" : ""} hv-b ${tab === "home" ? "hv-home" : ""}">${tab === "home" ? css : ""}${head}${body}</div></div>${foot}`;
  }
  return tpl ? `${bar}<div class="y-bg"><div class="y-in tpl">${cover}${nav}${inner}</div></div>${foot}`
    : `${bar}<div class="y-bg"><div class="y-in">${cover}${nav}${inner}</div></div>${foot}`;
}
const win = (file, label, body, more = "", cls = "w3") => `<div class="grid5"><section class="y-win ${cls}"><div class="y-title"><span class="px">${file}</span><b class="jua">${label}</b>${more}</div><div class="dec5">${body}</div></section></div>`;
const hBody = u => `y2k th-${u.theme} font-${FONTS[u.font] ? u.font : "jua"}`;

VIEWS.hompy = (id, tab) => {
  const u = byHandle(id);  // 바꾼 홈피 주소로도 들어온다
  if (!u || u.admin) return null;
  if (u.withdrawnAt) return { body: "v4p y5p", title: "홈피 없음", html: portal("", `<section class="box">${empty("탈퇴해서 닫힌 홈피예요.", `<a class="pbtn" href="#/go">다른 홈피 놀러가기</a>`)}</section>`, welcomeBox()) };
  if (hiddenFromMe(u.id)) { const iBlocked = blocked(me().id, u.id);
    return { body: "v4p y5p", title: "볼 수 없는 홈피", html: portal("", `<section class="box">${empty(iBlocked ? "내가 차단한 사람의 홈피예요." : "볼 수 없는 홈피예요.", iBlocked ? `<button class="pbtn" data-act="unblock" data-id="${u.id}">차단 풀기</button>` : `<a class="pbtn" href="#/go">다른 홈피 놀러가기</a>`)}</section>`, welcomeBox()) }; }
  const f = { home: hHome, diary: hDiary, photo: hPhoto, guest: hGuest, profile: hProfile, deco: hDeco }[tab];
  if (!f) return null;
  if (tab === "home") countVisit(u);
  return f(u);
};

// ---------- 소식 (레이아웃 템플릿 tpl-N) ----------
function hHome(u) {
  const m = me(), own = m && m.id === u.id;
  const dys = DB.diaries.filter(d => d.owner === u.id && canSee(d.scope, u.id) && seeHidden(d)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
  const phs = DB.photos.filter(p => p.owner === u.id && canSee(p.scope || "all", u.id) && seeHidden(p)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  const gbs = DB.guests.filter(g => g.owner === u.id).sort((a, b) => b.at.localeCompare(a.at));
  const gbShow = gbs.filter(g => (!g.secret || (m && (m.id === g.owner || m.id === g.author))) && seeHidden(g) && !hiddenFromMe(g.author)).slice(0, 3);
  const pool = Object.values(DB.users).filter(x => alive(x) && x.id !== u.id && (!m || x.id !== m.id) && findable(x));
  const sug = [...pool.filter(x => x.region === u.region), ...pool.filter(x => x.region !== u.region)].slice(0, 2);
  const inner = `
    <div class="b-icons"><a href="#/h/${u.id}"><img src="${roomImg(u)}" alt=""><span>내 방</span></a><a href="#/h/${u.id}/diary"><img src="img/i_letter.png" alt=""><span>기록</span></a><a href="#/h/${u.id}/photo"><img src="img/i_camera.png" alt=""><span>앨범</span></a><a href="#/h/${u.id}/guest"><img src="img/i_heart.png" alt=""><span>방문록</span></a><a href="#/h/${u.id}/profile"><img src="img/i_cd.png" alt=""><span>프로필</span></a>${own ? `<a href="#/h/${u.id}/deco"><img src="img/i_bow.png" alt=""><span>꾸미기</span></a>` : ""}</div>
    <section class="y-win b-room"><div class="y-title"><span class="px">my_room.bmp</span><b class="jua">${own ? "내 방" : `${esc(u.nick)}의 방`}</b><span class="y-more rh5">${own ? `<a class="bv sm" href="#/h/${u.id}/deco">🎀 꾸미기</a>` : `${!m ? `<a class="bv sm pri" href="#/login?next=${encodeURIComponent(`#/h/${u.id}/profile?ask=1`)}">♡ 단짝 신청</a>` : isFriend(u.id, m.id) ? `<span class="badge5">♡ 단짝</span>` : DB.requests.some(r => r.from === m.id && r.to === u.id) ? `<span class="badge5 gray">신청 보냈어요</span>` : `<button class="bv sm pri" data-act="freqsend" data-id="${u.id}">♡ 단짝 신청</button>`}<a class="bv sm" href="#/h/${u.id}/guest" aria-label="방문록 남기기">💌 방문록</a>`}</span></div>
      <div class="room5">${roomScene(u)}${own ? `<button class="memo hand" data-act="memo" title="한 줄 메모 바꾸기">${esc(u.memo || "한 줄 메모를 남겨 보세요 ✎")}</button>` : u.memo ? `<span class="memo hand">${esc(u.memo)}</span>` : ""}</div>
      ${!m ? `<div class="cta5"><p class="hand">${esc(u.nick)}님 홈피에 놀러 왔어요 ♡</p><a class="btn-k" href="#/login?next=${encodeURIComponent(`#/h/${u.id}/profile?ask=1`)}">💬 나도 만들고 단짝 신청하기</a><small class="gray">카카오로 3초면 돼요</small></div>` : ""}</section><!--ROOM_END-->
    <section class="y-win b-diary"><div class="y-title"><span class="px">diary.txt</span><b class="jua">최근 기록</b><a class="y-more" href="#/h/${u.id}/diary">더보기 ›</a></div>
      <ul class="lst5">${dys.map(d => `<li><a href="#/h/${u.id}/diary?d=${d.id}">${esc(d.title)}</a><em class="px">${md(d.at)}</em></li>`).join("") || `<li><span class="gray">${own ? "첫 기록을 남겨 보세요 ✎" : "아직 공개된 기록이 없어요"}</span></li>`}</ul></section>
    <section class="y-win b-album"><div class="y-title"><span class="px">photo.jpg</span><b class="jua">앨범</b><a class="y-more" href="#/h/${u.id}/photo">더보기 ›</a></div>
      <div class="alb5">${phs.map(p => `<figure><a href="#/h/${u.id}/photo?v=${p.id}"><img src="${safeSrc(p.src)}" alt="${esc(p.caption)}"></a><figcaption class="hand">${esc(maskBad(p.caption))}</figcaption></figure>`).join("") || `<p class="gray">사진이 아직 없어요</p>`}</div></section>
    <section class="y-win b-guest"><div class="y-title"><span class="px">guestbook</span><b class="jua">방문록</b><a class="y-more" href="#/h/${u.id}/guest">전체 ${gbs.filter(g => !hiddenFromMe(g.author)).length} ›</a></div>
      <div class="bub5s">${gbShow.map(g => `<div class="bub5"><img class="av" src="${avSrc(g.author)}" alt=""><p><b>${esc(nick(g.author))}</b>${g.secret ? "🔒 " : ""}${esc(shown(g.author, g.text))}</p></div>`).join("") || `<p class="gray">첫 방문록을 기다려요 ♡</p>`}</div></section>
    <section class="y-win b-friends"><div class="y-title"><span class="px">friends</span><b class="jua">놀러가 볼까?</b><a class="y-more" href="#/go">랜덤방문 ›</a></div>
      <p class="vsub5">${own && u.region ? `같은 동네(${esc(u.region)}) · 요즘 홈피` : "요즘 홈피"}</p>
      <div class="sug5">${sug.map(x => `<a href="#/h/${x.id}"><img class="av" src="${avSrc(x.id)}" alt=""><span>${esc(x.nick)}</span></a>`).join("")}</div></section>`;
  return { body: `${hBody(u)} tpl-${u.layout}`, title: u.title, html: hompyFrame(u, "home", inner, true), after: () => own && R.q.ord === "1" && bindOrdEdit(u) };
}
ACT.memo = () => { const m = me(); modal({ title: "한 줄 메모", body: `<input class="inp5 grow" name="t" maxlength="30" value="${esc(m.memo || "")}" placeholder="오늘은 비 오는 날 노래 ♪">`, ok: "바꾸기", onOk: d => { m.memo = (d.get("t") || "").trim(); save(); refresh(); } }); };
// 홈피 어디서나 자랑하기(가입 완료 화면에만 있던 공유를 홈피로)
ACT.sharemine = () => modal({ title: "친구에게 알리기", body: `<p>꾸민 홈피를 친구들에게 보여 주세요 ♡</p>
  <button type="button" class="btn-k" data-act="sharehome">💬 카톡·밴드로 보내기</button>
  <button type="button" class="bv" data-act="copylink">🔗 링크 복사</button>
  <button type="button" class="bv" data-act="storycard">📷 인스타 스토리용 그림 저장</button><p class="dnote5">데모라 친구 브라우저에선 이 홈피가 안 보여요.</p>`, ok: "닫기", cancel: "" });
ACT.mood = () => { const m = me(); modal({ title: "지금 기분", body: `<div class="moods">${Object.entries(MOODS).map(([k, e]) => `<label class="rad"><input type="radio" name="m" value="${k}" ${k === m.mood ? "checked" : ""}>${e} ${k}</label>`).join("")}</div>`, ok: "바꾸기", onOk: d => setMood(m, d.get("m")) }); };
function setMood(u, mood) {
  if (!MOODS[mood]) return;
  u.mood = mood;
  const t = kst(), label = `${String(t.m).padStart(2, "0")}.${String(t.d).padStart(2, "0")}`;
  u.moodLog = [{ d: label, mood }, ...u.moodLog.filter(x => x.d !== label)].slice(0, 10);
  save(); refresh();
}
ACT.freqsend = el => {
  if (!me()) return go(`#/login?next=${encodeURIComponent(`#/h/${el.dataset.id}/profile?ask=1`)}`);  // 가입하고 오면 신청이 이어진다
  const to = el.dataset.id, m = me();
  if (eitherBlocked(m.id, to)) return toast("차단 관계라 단짝 신청을 할 수 없어요.");
  if (DB.requests.some(r => r.from === m.id && r.to === to)) return toast("이미 신청했어요. 상대가 받아 주면 단짝이 돼요.");
  const back = DB.requests.find(r => r.from === to && r.to === m.id);
  if (back) { DB.requests = DB.requests.filter(r => r !== back); m.friends.push(to); user(to).friends.push(m.id); save(); toast("서로 신청해서 바로 단짝이 됐어요 ♡"); return refresh(); }
  modal({ title: `${nick(to)}님께 단짝 신청`, body: `<label class="fld"><span>어떤 사이예요? (선택)</span><input class="inp5 grow" name="rel" maxlength="12" placeholder="예: 고딩 짝꿍"></label>`, ok: "신청하기 ♡",
    onOk: d => { DB.requests.push({ id: uid("q"), from: m.id, to, rel: (d.get("rel") || "").trim(), at: nowISO() }); if (user(to).settings.notify.friend) addFeed(to, m.id, "님이 단짝을 신청했어요.", "#/my"); save(); toast("단짝 신청을 보냈어요 ♡"); } });
};

// ---------- 기록 ----------
function hDiary(u) {
  const m = me(), own = m && m.id === u.id, now = kst();
  const [qy, qm] = /^\d{4}-\d{2}$/.test(R.q.m || "") ? R.q.m.split("-").map(Number) : [0, 0];
  const [y, mo] = qy >= 2000 && qy <= 2100 && qm >= 1 && qm <= 12 ? [qy, qm] : [now.y, now.m];
  const all = DB.diaries.filter(d => d.owner === u.id && canSee(d.scope, u.id) && seeHidden(d)).sort((a, b) => b.at.localeCompare(a.at));
  const inMonth = all.filter(d => { const k = kst(new Date(d.at)); return k.y === y && k.m === mo; });
  const days = new Set(inMonth.map(d => kst(new Date(d.at)).d));
  const sel = R.q.day ? +R.q.day : 0;
  let list = R.q.d ? all.filter(d => d.id === R.q.d) : sel ? inMonth.filter(d => kst(new Date(d.at)).d === sel) : inMonth;
  const first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay(), last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const ym = (yy, mm) => `${yy}-${String(mm).padStart(2, "0")}`;
  const prev = mo === 1 ? ym(y - 1, 12) : ym(y, mo - 1), next = mo === 12 ? ym(y + 1, 1) : ym(y, mo + 1);
  const cal = `<div class="cal">${"일월화수목금토".split("").map(w => `<span class="w">${w}</span>`).join("")}${"<span></span>".repeat(first)}${Array.from({ length: last }, (_, i) => i + 1).map(d => {
    const cls = [days.has(d) ? "has" : "", y === now.y && mo === now.m && d === now.d ? "today" : "", d === sel ? "pick" : ""].join(" ").trim();
    return days.has(d) ? `<a class="${cls}" href="${withQ({ day: d === sel ? "" : d, d: "" })}">${d}</a>` : `<span class="${cls}">${d}</span>`;
  }).join("")}</div>`;
  const form = own ? `<details class="dwrite" ${R.q.w ? "open" : ""}><summary class="pbtn">✏ 기록 쓰기</summary>
    <form class="frm" data-form="diary"><input class="inp5 grow" name="title" maxlength="40" required placeholder="제목"><textarea class="edit5 hand" name="body" maxlength="3000" required placeholder="오늘 하루는 어땠나요?"></textarea>${SAFE_NOTE}
      <div class="frow"><label>기분</label>${Object.keys(MOODS).map(k => `<label class="rad"><input type="radio" name="mood" value="${k}" ${k === u.mood ? "checked" : ""}>${MOODS[k]} ${k}</label>`).join("")}</div>
      <div class="frow"><label>날씨</label>${Object.keys(WEATHERS).map((k, i) => `<label class="rad"><input type="radio" name="weather" value="${k}" ${i === 0 ? "checked" : ""}>${WEATHERS[k]} ${k}</label>`).join("")}</div>
      <div class="frow"><label>공개</label>${SCOPES.map(([v, t]) => `<label class="rad"><input type="radio" name="scope" value="${v}" ${u.settings.scope === v ? "checked" : ""}>${t}</label>`).join("")}</div>
      <div class="dact5"><button class="bv pri">남기기 ♡</button></div></form></details>` : "";
  const body = `<h3 class="sec-h jua">✏ 기록 <span class="sec-r"><a href="${withQ({ m: prev, day: "", d: "" })}" aria-label="이전 달">◀</a> ${y}년 ${mo}월 <a href="${withQ({ m: next, day: "", d: "" })}" aria-label="다음 달">▶</a></span></h3>
    ${cal}${form}
    ${R.q.d || sel ? `<p class="qnote">${R.q.d ? "고른 기록 1개" : `${mo}월 ${sel}일 기록`} · <a href="${withQ({ d: "", day: "" })}">${mo}월 전체 보기</a></p>` : ""}
    ${list.map(d => { const k = kst(new Date(d.at)); return `<article class="dy" id="d-${d.id}">
      <div class="dy-h"><span class="stamp jua">${md(d.at)}</span><span>${WD[k.wd] || ""}요일 · ${WEATHERS[d.weather] || ""} ${esc(d.weather)} · 기분 <b class="or">${esc(d.mood)}</b></span><span class="scope">${scopeLabel(d.scope)}</span></div>
      ${isHidden(d) ? `<div class="warn5">🚫 신고로 다른 사람에게 가려져 있어요. ${own ? appealBtn(d) : ""}</div>` : ""}
      <h4 class="jua">${esc(d.title)}</h4><div class="hand">${para(d.body)}</div>
      ${d.from ? `<p><a class="lnk" href="#/p/${esc(d.from)}">원래 글 보기 ›</a></p>` : ""}
      <div class="dy-f"><button class="lnkbtn" data-act="dlike" data-id="${d.id}">♡ 공감 ${d.likes.length}</button> · 💬 댓글 ${d.comments.filter(c => !hiddenFromMe(c.author)).length}${own ? ` · <button class="lnkbtn" data-act="ddel" data-id="${d.id}">지우기</button>` : m ? ` · <a href="#/report/diary:${d.id}">신고</a>` : ""}</div>
      ${d.comments.filter(c => !hiddenFromMe(c.author)).map(c => `<div class="reply"><b>${esc(nick(c.author))}</b> ${esc(shown(c.author, c.text))}</div>`).join("")}
      <form class="cw sm" data-form="dcomment" data-id="${d.id}"><input class="inp5 grow" name="text" maxlength="200" placeholder="댓글 달기" aria-label="기록 댓글"><button class="pbtn sm">등록</button></form>
    </article>`; }).join("") || empty(own ? "이 달엔 아직 기록이 없어요. 오늘 하루를 남겨 볼까요?" : "보여줄 수 있는 기록이 없어요.")}`;
  return { body: hBody(u), title: `${u.title} · 기록`, html: hompyFrame(u, "diary", win("diary.txt", "기록", body)) };
}
FORM.diary = (f, d) => {
  const m = me(), t = (d.get("title") || "").trim(), b = (d.get("body") || "").trim();
  if (!t || !b) return toast("제목과 내용을 써 주세요.");
  DB.diaries.unshift({ id: uid("d"), owner: m.id, title: t, body: b, mood: d.get("mood"), weather: d.get("weather"), scope: d.get("scope"), at: nowISO(), likes: [], comments: [] });
  if (d.get("mood") !== m.mood) setMood(m, d.get("mood"));
  if (save()) { toast("기록을 남겼어요 ♡"); go(`#/h/${m.id}/diary`); }
};
const diaryOf = el => DB.diaries.find(x => x.id === el.dataset.id);
ACT.dlike = el => { if (needLogin()) return; const d = diaryOf(el); if (toggle(d.likes, me().id)) addFeed(d.owner, me().id, "님이 내 기록에 공감했어요.", `#/h/${d.owner}/diary?d=${d.id}`); save(); refresh(); };
ACT.ddel = el => modal({ title: "기록 지우기", body: "<p>이 기록을 지울까요?</p>", ok: "지우기", danger: true, onOk: () => { const d = diaryOf(el); if (!d || !me() || d.owner !== me().id) return; DB.diaries = DB.diaries.filter(x => x.id !== el.dataset.id); save(); refresh(withQ({ d: "" })); } });
FORM.dcomment = (f, d) => {
  if (needLogin()) return;
  const t = (d.get("text") || "").trim(); if (!t) return;
  const dy = DB.diaries.find(x => x.id === f.dataset.id);
  if (!dy || !canSee(dy.scope, dy.owner) || hiddenFromMe(dy.owner)) return toast("볼 수 없는 기록이에요.");
  dy.comments.push({ id: uid("c"), author: me().id, text: t.slice(0, 200), at: nowISO() });
  addFeed(dy.owner, me().id, "님이 내 기록에 댓글을 남겼어요.", `#/h/${dy.owner}/diary?d=${dy.id}`);
  save(); refresh();
};

// ---------- 앨범 ----------
const FOLDERS = ["그때 그 시절", "요즘", "우리들"];
function hPhoto(u) {
  const m = me(), own = m && m.id === u.id;
  const all = DB.photos.filter(p => p.owner === u.id && canSee(p.scope || "all", u.id) && seeHidden(p)).sort((a, b) => b.at.localeCompare(a.at));
  const folder = FOLDERS.includes(R.q.f) ? R.q.f : "";
  const list = folder ? all.filter(p => p.folder === folder) : all;
  const per = 9, pages = Math.max(1, Math.ceil(list.length / per)), page = Math.min(pages, Math.max(1, +R.q.page || 1));
  const body = `<h3 class="sec-h jua">📷 앨범 <span class="sec-r">전체 ${all.length}장</span></h3>
    <div class="folders">${["", ...FOLDERS].map(f => `<a class="${f === folder ? "cur" : ""}" href="${withQ({ f, page: "", v: "" })}">📁 ${f || "전체"}</a>`).join("")}</div>
    ${own ? `<details class="upl-d"><summary class="pbtn">📷 사진 올리기</summary><form class="upl" data-form="photo"><label class="pbtn">📷 사진 고르기<input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" class="sr" required data-change="pickname"></label><span class="gray" id="pickname">고른 사진 없음</span>
      <input class="inp5" name="caption" maxlength="20" placeholder="사진 이름" aria-label="사진 이름"><select class="sel5" name="folder" aria-label="폴더">${FOLDERS.map(f => `<option ${f === folder ? "selected" : ""}>${f}</option>`).join("")}</select>
      <span class="frow">${SCOPES.map(([v, t]) => `<label class="rad"><input type="radio" name="scope" value="${v}" ${u.settings.scope === v ? "checked" : ""}>${t}</label>`).join("")}</span><button class="pbtn">올리기</button></form>
      <p class="warn5">📷 다른 사람(아이 포함)이 나온 사진은 동의를 받고, 되도록 ‘단짝 공개’로 올려 주세요. 사진 속 촬영 위치 정보는 올릴 때 지워져요.</p>
      <p class="ord-help">권장 크기: 정사각형 1080×1080px. 다른 비율도 잘리지 않고 네모 칸 안에 다 보여요(남는 곳은 빈 바탕).</p></details>` : ""}
    <div class="album">${list.slice((page - 1) * per, page * per).map(p => `<figure class="pol"><button class="ph" data-act="pview" data-id="${p.id}" aria-label="${esc(p.caption)} 크게 보기"><img src="${safeSrc(p.src)}" alt=""></button><figcaption class="hand">${esc(p.caption)}${own && p.scope && p.scope !== "all" ? ` <span class="gray">(${scopeLabel(p.scope)})</span>` : ""}${isHidden(p) ? ` <span class="gray">🚫가림</span>` : ""}</figcaption></figure>`).join("") || empty(own ? "첫 사진을 올려 보세요." : "사진이 아직 없어요.")}</div>
    ${pages > 1 ? `<div class="pager">${Array.from({ length: pages }, (_, i) => `<a class="${i + 1 === page ? "cur" : ""}" href="${withQ({ page: i + 1 })}">${i + 1}</a>`).join("")}</div>` : ""}`;
  return { body: hBody(u), title: `${u.title} · 앨범`, html: hompyFrame(u, "photo", win("photo.jpg", "앨범", body)), after: () => { if (R.q.v) ACT.pview({ dataset: { id: R.q.v } }); } };
}
CHG.pickname = el => { $("#pickname").textContent = el.files[0] ? el.files[0].name : "고른 사진 없음"; };
let photoBusy = false;
FORM.photo = async (f, d) => {
  const m = me(), file = d.get("file");
  if (!file || !file.size) return toast("사진을 골라 주세요.");
  if (photoBusy) return;  // 두 번 눌러도 한 장만
  photoBusy = true;
  try {
    const src = await readImage(file);
    DB.photos.unshift({ id: uid("f"), owner: m.id, src, caption: (d.get("caption") || "").trim() || "이름 없는 사진", folder: FOLDERS.includes(d.get("folder")) ? d.get("folder") : "요즘", scope: ["all", "friends", "me"].includes(d.get("scope")) ? d.get("scope") : "friends", at: nowISO() });
    if (!save()) return;  // save()가 저장 전 상태로 되돌린다
    toast("사진을 올렸어요 ♡"); refresh(withQ({ page: "" }));
  } catch (e) { toast(e.message); }
  finally { photoBusy = false; }
};
ACT.pview = el => {
  const p = DB.photos.find(x => x.id === el.dataset.id); if (!p || !canSee(p.scope || "all", p.owner) || !seeHidden(p)) return;
  const own = me() && me().id === p.owner;
  modal({ title: p.caption, body: `<img class="pbig" src="${safeSrc(p.src)}" alt="${esc(p.caption)}"><p class="gray">${esc(p.folder)} · ${md(p.at)}${own ? ` · ${scopeLabel(p.scope || "all")}` : ""}</p>${isHidden(p) && own ? `<div class="warn5">🚫 신고로 다른 사람에게 가려져 있어요. ${appealBtn(p)}</div>` : ""}${!own && me() ? `<a class="bv sm rp5" href="#/report/photo:${p.id}">🚨 신고하기</a>` : ""}`, danger: own, ok: own ? "이 사진 지우기" : "닫기", cancel: own ? "닫기" : "",
    onOk: () => { if (!own) return; DB.photos = DB.photos.filter(x => x.id !== p.id); save(); toast("사진을 지웠어요."); refresh(withQ({ v: "" })); } });
};

// ---------- 방문록 ----------
function hGuest(u) {
  const m = me(), own = m && m.id === u.id;
  const list = DB.guests.filter(g => g.owner === u.id).sort((a, b) => b.at.localeCompare(a.at));
  const rel = id => { const r = DB.requests.find(x => x.from === id && x.to === u.id); return isFriend(u.id, id) ? "단짝" : r ? "단짝 신청 중" : ""; };
  const gp = prv(u).guest || "all", canWrite = own || (m && (gp === "all" || (gp === "friends" && isFriend(u.id, m.id))));
  const body = `<h3 class="sec-h jua">💌 방문록 <span class="sec-r">전체 ${list.filter(g => !hiddenFromMe(g.author)).length}${own ? ` · 쓰기: ${{ all: "누구나", friends: "단짝만", off: "닫음" }[gp]} <a class="lnk" href="#/my?sec=safe">바꾸기</a>` : ""}</span></h3>
    ${!m ? `<p class="warn5">로그인하면 남길 수 있어요. <a class="lnk" href="#/login?next=${encodeURIComponent(`#/h/${u.id}/guest`)}">로그인</a></p>` : !canWrite ? `<p class="warn5">${gp === "off" ? "주인이 방문록을 닫아 두었어요." : "단짝만 방문록을 남길 수 있는 홈피예요."}</p>` : `<form class="gw" data-form="guest"><img class="av" src="${avSrc(m.id)}" alt=""><textarea class="gw-in hand" name="text" maxlength="300" placeholder="놀러 왔으면 한 줄 남기고 가기 ♪" aria-label="방문록"></textarea>
      <div class="gw-f"><label class="chk"><input type="checkbox" name="secret"> 비밀로 하기</label><button class="pbtn sm">남기기</button></div></form>${SAFE_NOTE}`}
    ${list.map(g => {
      if (hiddenFromMe(g.author)) return "";
      if (!seeHidden(g)) return `<article class="gb lock"><div class="gb-h"><span class="lk">🚫</span><b>가려진 글</b><span class="d">${mdt(g.at)}</span></div><p>신고로 잠시 가려진 방문록이에요.</p></article>`;
      const see = !g.secret || (m && (m.id === g.owner || m.id === g.author)), mine = m && (m.id === g.owner || m.id === g.author);
      if (!see) return `<article class="gb lock"><div class="gb-h"><span class="lk">🔒</span><b>비밀글</b><span class="d">${mdt(g.at)}</span></div><p>주인과 글쓴이만 볼 수 있는 글이에요.</p></article>`;
      return `<article class="gb"><div class="gb-h"><img class="av" src="${avSrc(g.author)}" alt=""><b>${esc(nick(g.author))}</b>${rel(g.author) ? `<span class="rel">${rel(g.author)}</span>` : ""}${g.secret ? `<span class="rel">🔒 비밀</span>` : ""}<span class="d">${mdt(g.at)}</span>${user(g.author) && !user(g.author).withdrawnAt ? `<a class="go" href="#/h/${g.author}">🏠 놀러가기</a>` : ""}</div>
        ${isHidden(g) ? `<div class="warn5">🚫 신고로 다른 사람에게 가려져 있어요. ${m && m.id === g.author ? appealBtn(g) : ""}</div>` : ""}<p class="hand">${esc(shown(g.author, g.text))}</p>
        ${g.reply ? `<div class="reply"><b>${esc(u.nick)}</b> ${esc(g.reply)}</div>` : ""}
        <div class="acts">${own && !g.reply ? `<button class="lnkbtn" data-act="greply" data-id="${g.id}">답글</button>` : ""}${mine ? ` <button class="lnkbtn" data-act="gdel" data-id="${g.id}">지우기</button>` : ""}${m && m.id !== g.author ? ` <a href="#/report/guest:${g.id}">신고</a> <button class="lnkbtn" data-act="block" data-id="${g.author}">차단</button>` : ""}</div></article>`;
    }).join("") || empty("첫 방문록을 남겨 주세요 ♡")}`;
  return { body: hBody(u), title: `${u.title} · 방문록`, html: hompyFrame(u, "guest", win("guestbook", "방문록", body)) };
}
FORM.guest = (f, d) => {
  if (needLogin()) return;
  const t = (d.get("text") || "").trim(); if (!t) return toast("한 줄이라도 써 주세요 :)");
  const owner = byHandle(R.path[1])?.id; if (!owner) return;
  const gp = prv(user(owner)).guest || "all";
  if (owner !== me().id && (eitherBlocked(owner, me().id) || gp === "off" || (gp === "friends" && !isFriend(owner, me().id)))) return toast("이 홈피에는 방문록을 남길 수 없어요.");
  DB.guests.unshift({ id: uid("g"), owner, author: me().id, text: t.slice(0, 300), secret: !!d.get("secret"), at: nowISO(), reply: "" });
  if (user(owner).settings.notify.guest) addFeed(owner, me().id, "님이 방문록을 남겼어요.", `#/h/${owner}/guest`);
  save(); toast("방문록을 남겼어요 ♡"); refresh();
};
ACT.greply = el => modal({ title: "답글", body: `<input class="inp5 grow" name="t" maxlength="200" required>`, ok: "달기", onOk: d => { const g = DB.guests.find(x => x.id === el.dataset.id); if (!g || !me() || g.owner !== me().id) return; g.reply = (d.get("t") || "").trim(); addFeed(g.author, me().id, "님이 내 방문록에 답글을 달았어요.", `#/h/${g.owner}/guest`); save(); refresh(); } });
ACT.gdel = el => modal({ title: "방문록 지우기", body: "<p>이 방문록을 지울까요?</p>", ok: "지우기", danger: true, onOk: () => { const g = DB.guests.find(x => x.id === el.dataset.id), m = me(); if (!g || !m || (m.id !== g.owner && m.id !== g.author)) return; DB.guests = DB.guests.filter(x => x.id !== el.dataset.id); save(); refresh(); } });

// ---------- 프로필 ----------
function hProfile(u) {
  const m = me(), own = m && m.id === u.id, edit = own && R.q.edit;
  const friends = u.friends.map(user).filter(f => alive(f) && !hiddenFromMe(f.id));
  const prof = edit ? `<form class="frm" data-form="profile">
      <label class="fld"><span>홈피 이름</span><input class="inp5 grow" name="title" maxlength="20" required value="${esc(u.title)}"></label>
      <label class="fld"><span>한 줄 소개</span><input class="inp5 grow" name="intro" maxlength="40" value="${esc(u.intro)}"></label>
      <label class="fld"><span>좋아하는 것</span><input class="inp5 grow" name="likes" maxlength="40" value="${esc(u.likes)}"></label>
      <label class="fld"><span>그 시절 나</span><input class="inp5 grow" name="then" maxlength="60" value="${esc(u.then)}"></label>
      <label class="fld"><span>요즘 나</span><input class="inp5 grow" name="now" maxlength="60" value="${esc(u.now)}"></label>${SAFE_NOTE}
      <div class="dact5"><a class="bv" href="#/h/${u.id}/profile">취소</a><button class="bv pri">저장하기 ♡</button></div></form>`
    : `<div class="prof-top"><div class="purikura small"><img src="${avSrc(u.id)}" alt=""><span class="px">since ${new Date(u.joinedAt).getFullYear()}</span></div>
        <div><h2 class="jua">${esc(u.nick)}</h2><p class="hand">${esc(u.intro)}</p>
          <div class="chips5"><span class="c5 mood"><img src="img/i_heart.png" alt="">지금 기분 · ${esc(u.mood)}</span>${own && u.region ? `<span class="c5"><img src="img/i_sun.png" alt="">${esc(u.region)} <small>(나만 보여요)</small></span>` : ""}</div></div></div>
      <table class="ptbl">${[["birthday", "생일"], ["likes", "좋아하는 것"], ["then", "그 시절 나"], ["now", "요즘 나"]].filter(([k]) => fieldOk(u, k)).map(([k, n]) => `<tr><th>${n}</th><td>${esc(u[k] || "-")}${own && pval(u, k) !== "all" ? ` <em class="gray">(${scopeLabel(pval(u, k))})</em>` : ""}</td></tr>`).join("")}</table>
      ${!own && m ? `<p class="acts"><button class="lnkbtn gray" data-act="block" data-id="${u.id}">🚫 이 사람 차단하기</button> · <a class="gray" href="#/report/user:${u.id}">🚨 이 사람 신고하기</a></p>` : ""}
      <h3 class="th-h jua">♡ 오늘의 기분 기록</h3><div class="moodlog">${u.moodLog.map(x => `<span>${esc(x.d)} ${esc(x.mood)}</span>`).join("") || `<span>${esc(u.mood)}</span>`}</div>`;
  const reqSent = m && DB.requests.some(r => r.from === m.id && r.to === u.id);
  const body = `<div class="grid5">
    <section class="y-win w2"><div class="y-title"><span class="px">profile.txt</span><b class="jua">프로필</b>${own && !edit ? `<a class="y-more" href="#/h/${u.id}/profile?edit=1">수정 ›</a>` : ""}</div><div class="dec5 prof">${prof}</div></section>
    <section class="y-win"><div class="y-title"><span class="px">friends</span><b class="jua">${own ? "내 단짝" : "단짝"}</b><span class="y-more">${friends.length}명</span></div><div class="dec5">
      <ul class="bud">${friends.map(f => `<li><img class="av" src="${avSrc(f.id)}" alt=""><a href="#/h/${f.id}"><b>${esc(f.nick)}</b></a><em>${esc(f.intro.slice(0, 14))}</em></li>`).join("") || `<li class="gray">아직 단짝이 없어요</li>`}</ul>
      ${own ? `<a class="bv pri wide" href="#/my">받은 신청 보기 (${DB.requests.filter(r => r.to === u.id).length})</a>`
        : m && isFriend(u.id, m.id) ? `<p class="bv wide">우리는 단짝 ♡</p>` : reqSent ? `<p class="bv wide">신청 보냈어요 ♡</p>` : `<button class="bv pri wide" data-act="freqsend" data-id="${u.id}">단짝 신청하기 ♡</button>`}
    </div></section></div>`;
  return { body: hBody(u), title: `${u.title} · 프로필`, html: hompyFrame(u, "profile", body),
    after: () => { const mm = me(); if (R.q.ask && mm && mm.id !== u.id && !isFriend(u.id, mm.id) && !DB.requests.some(r => r.from === mm.id && r.to === u.id)) { history.replaceState(null, "", location.href.replace(/[?&]ask=1/, "")); delete R.q.ask; ACT.freqsend({ dataset: { id: u.id } }); } } };
}
FORM.profile = (f, d) => {
  const m = me(), t = (d.get("title") || "").trim();
  if (t.length < 2) return toast("홈피 이름은 2자 이상이에요.");
  Object.assign(m, { title: t, intro: (d.get("intro") || "").trim(), likes: (d.get("likes") || "").trim(), then: (d.get("then") || "").trim(), now: (d.get("now") || "").trim() });
  save(); toast("프로필을 저장했어요."); go(`#/h/${m.id}/profile`);
};

// ---------- 꾸미기 (주인만) ----------
const DTABS = [["room", "내 방"], ["order", "화면 순서"], ["theme", "배경"], ["pic", "프로필 사진"], ["closet", "내 캐릭터 옷장"], ["layout", "레이아웃"], ["font", "글꼴"], ["song", "인생곡"]];
function hDeco(u) {
  const m = me();
  if (!m || m.id !== u.id) return { redirect: `#/h/${u.id}` };
  const s = DTABS.some(([k]) => k === R.q.s) ? R.q.s : "room";
  const card = (img, no, name, desc, sel, act, val, extra = "") => `<button class="lay ${sel ? "sel" : ""}" data-act="${act}" data-v="${val}" aria-pressed="${sel}"><img src="${img}" alt=""><b><span class="px">${no}</span> ${name}</b><em>${desc}</em>${sel ? `<span class="lk">사용 중</span>` : ""}${extra}</button>`;
  let inner = "";
  if (s === "room") {
    const p2 = i => String(i).padStart(2, "0");
    inner = `<h3 class="th-h jua">빈 방 <span class="fsub">무료 · 마음대로 바꿔요</span></h3><div class="rpick epick">${EROOMS.map((n, i) => card(`img/room_e${p2(i + 1)}_s.png`, p2(i + 1), n, "", u.room === "e" && (EROOMS[u.ebg - 1] ? u.ebg : 1) === i + 1, "setebg", i + 1)).join("")}</div>
      <h3 class="th-h jua">꾸며진 방 <span class="fsub">구슬 ${ROOM_PRICE}개 · 한 번 사면 계속</span></h3><div class="rpick">${["l", "m"].map((k, i) => card(ROOMS[k][2], "S" + (i + 1), ROOMS[k][0], ROOMS[k][1], u.room === k, "setroom", k, ownRoom(u, k) ? (u.room === k ? "" : `<span class="pr5 have">보유</span>`) : `<span class="pr5">구슬 ${ROOM_PRICE}개</span>`)).join("")}</div>
      ${u.room === "e" ? `<h3 class="th-h jua">가구 <span class="px fsub">drag &amp; drop</span></h3>
        <p class="lay-note hand">가구를 누르면 방에 놓이고, 다시 누르면 빠져요. 방 안 가구는 끌어서 옮겨요(키보드는 화살표). 아래쪽에 둘수록 앞에 보여요.</p>
        <h3 class="th-h jua">지금 내 방</h3><div class="room5 deco-room">${roomScene(u, true)}</div>
        <div class="dact5 left"><button class="bv" data-act="preset" data-v="l">러블리 배치</button><button class="bv" data-act="preset" data-v="m">스트릿 배치</button><button class="bv" data-act="preset" data-v="">전부 빼기</button></div>
        <div class="shop5 fur">${Object.entries(FURN).map(([k, [n, , price]]) => { const have = u.furnOwned.includes(k), on = k in u.furn;
          return `<button class="it5 ${have ? "have" : ""} ${on ? "on" : ""}" data-act="furn" data-v="${k}" aria-pressed="${on}"><img src="img/f_${k}.png" alt=""><b>${n}</b>${have ? `<span class="hv">${on ? "놓음" : "보유"}</span>` : `<span class="pr px">${price}</span>`}</button>`; }).join("")}</div>`
        : `<h3 class="th-h jua">지금 내 방</h3><div class="room5 deco-room">${roomScene(u)}</div><p class="lay-note hand">창밖은 지금 한국 시간과 내 동네(${esc(u.region)}) 날씨대로 바뀌어요. 가구를 직접 놓으려면 위에서 ‘빈 방’을 골라 주세요.</p>`}`;
  } else if (s === "order") {
    const ord = secOrder(u);
    const hid = u.secHidden || [], nm = k => SECS.find(s => s[0] === k)[1];
    inner = `<p class="ord-help">내 홈피 첫 화면(소식)에 보이는 칸의 순서를 바꾸고, 안 쓰는 칸은 숨길 수 있어요. 맨 위 이름 줄과 내 방 바로 아래 메뉴는 그대로예요. 바꾸면 바로 저장돼요.</p>
      <ol class="ord5">${ord.map((k, i) => `<li class="${hid.includes(k) ? "off" : ""} ${R.q.moved === k ? "moved" : ""}"><span class="ord-n">${i + 1}</span><b>${nm(k)}${hid.includes(k) ? " <em>(숨김)</em>" : ""}</b><span class="ord-b">
        <button class="bv sm" data-act="secmove" data-k="${k}" data-d="top" ${i === 0 ? "disabled" : ""} aria-label="${nm(k)} 맨 위로">⤒ 맨 위</button><button class="bv sm" data-act="secmove" data-k="${k}" data-d="-1" ${i === 0 ? "disabled" : ""} aria-label="${nm(k)} 위로">▲</button><button class="bv sm" data-act="secmove" data-k="${k}" data-d="1" ${i === ord.length - 1 ? "disabled" : ""} aria-label="${nm(k)} 아래로">▼</button>${k === "room" ? "" : `<button class="bv sm" data-act="sechide" data-k="${k}" aria-pressed="${hid.includes(k)}" aria-label="${nm(k)} ${hid.includes(k) ? "보이기" : "숨기기"}">${hid.includes(k) ? "보이기" : "숨기기"}</button>`}</span></li>`).join("")}</ol>
      <div class="dact5 left"><button class="bv" data-act="secreset">처음 순서로</button></div>
      <p class="ord-help">폰에서는 바로 이 순서로 보여요. PC는 고른 레이아웃 배치를 따르고, 홈피 맨 아래에서 ‘B+안’을 고르면 PC도 이 순서로 보여요.</p>`;
  } else if (s === "theme") {
    inner = `<p class="lay-note hand">배경은 레이아웃과 따로 골라요. 어떤 레이아웃에든 어울려요 ☆</p>
      <h3 class="th-h jua">♡ 러블리</h3><div class="lay-grid">${THEMES.slice(0, 5).map(([n, d], i) => card(`img/thumb_th${String(i + 1).padStart(2, "0")}.png`, String(i + 1).padStart(2, "0"), n, d, u.theme === i + 1, "settheme", i + 1)).join("")}</div>
      <h3 class="th-h jua">★ 스트릿</h3><div class="lay-grid">${THEMES.slice(5).map(([n, d], i) => card(`img/thumb_th${String(i + 6).padStart(2, "0")}.png`, String(i + 6).padStart(2, "0"), n, d, u.theme === i + 6, "settheme", i + 6)).join("")}</div>`;
  } else if (s === "layout") {
    inner = `<p class="lay-note hand">레이아웃을 바꿔도 내 글·사진·방은 그대로예요. 마음에 드는 배치를 골라 보세요 ♡</p>
      <div class="lay-grid">${LAYOUTS.map(([n, d], i) => card(`img/tpl${String(i + 1).padStart(2, "0")}.png`, String(i + 1).padStart(2, "0"), n, d, u.layout === i + 1, "setlayout", i + 1)).join("")}</div>`;
  } else if (s === "pic") {
    if (PF) { const L = pfLay();
      inner = `<p class="lay-note">사진을 끌어서 위치를 맞추고, 아래 막대로 크기를 정해 주세요. 네모 칸 안이 작은 사진으로 보여요. (키보드: 화살표로 옮기기)</p>
      <div class="pf-ed"><p id="pfhelp" class="sr">사진을 끌거나, 이 칸에서 화살표 키, 또는 아래 방향 버튼으로 옮겨요. 네모 칸 안이 작은 사진으로 보여요.</p><span id="pfst" class="sr" role="status" aria-live="polite"></span>
      <div class="pf-box" tabindex="0" role="application" aria-roledescription="사진 위치 맞추기" aria-label="프로필 사진 위치 맞추기" aria-describedby="pfhelp"><img id="pfimg" src="${safeSrc(PF.src)}" alt="" draggable="false" style="left:${L.x}px;top:${L.y}px;width:${L.w}px;height:${L.h}px"></div>
      <div class="pf-mv" role="group" aria-label="사진 옮기기"><button type="button" class="bv sm" data-act="pfmv" data-v="u" aria-label="위로 옮기기">▲</button><button type="button" class="bv sm" data-act="pfmv" data-v="l" aria-label="왼쪽으로 옮기기">◀</button><button type="button" class="bv sm" data-act="pfmv" data-v="r" aria-label="오른쪽으로 옮기기">▶</button><button type="button" class="bv sm" data-act="pfmv" data-v="d" aria-label="아래로 옮기기">▼</button></div>
      <label class="fld pf-z"><span>크기</span><input type="range" min="1" max="3" step="0.05" value="${PF.z}" data-change="pfzoom" aria-label="사진 크기" aria-valuetext="${Math.round(PF.z * 100)}%"></label>
      <div class="dact5 left"><button class="bv pri" data-act="pfsave">이대로 저장</button><button class="bv" data-act="pfcancel">취소</button></div></div>`;
    } else {
      inner = `<p class="lay-note">홈피 이름 옆 작은 칸, 방문록·댓글에 보이는 사진이에요. 안 올리면 내 캐릭터가 보여요.</p>
      <div class="pf-now"><figure><img class="av pf-th" src="${avSrc(u.id)}" alt="작은 칸 미리보기"><figcaption>작은 칸</figcaption></figure><figure><img class="pf-full" src="${picSrc(u.id)}" alt="크게 보기 미리보기"><figcaption>누르면 보이는 사진</figcaption></figure></div>
      <div class="dact5 left"><label class="bv pri pf-up">📷 ${u.pic ? "다른 사진 올리기" : "사진 올리기"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="sr" data-change="pfpick"></label>${u.pic ? `<button class="bv" data-act="pfdel">캐릭터로 돌아가기</button>` : ""}</div>
      <p class="ord-help">권장 크기: 정사각형 1080×1080px. 어떤 비율이든 올린 뒤 작은 칸에 보일 곳을 직접 맞춰요. 누르면 보이는 큰 사진은 자르지 않고 다 보여요.</p>
      <p class="warn5">📷 다른 사람(아이 포함) 얼굴이 나온 사진은 동의를 받고 올려 주세요. 사진 속 촬영 위치 정보는 올릴 때 지워져요.</p>`;
    }
  } else if (s === "closet") {
    inner = (u.freeCharUsed ? "" : `<p class="free5">🎁 가입 뒤 첫 1번은 아무 캐릭터나 무료로 바꿀 수 있어요</p>`) + CHAR_GROUPS.map(([g, ks]) => `<h3 class="th-h jua">${g}</h3><div class="cl-grid">${ks.map(k => { const [n, price] = CHARS[k], have = u.chars.includes(k), on = u.char === k;
      return `<button class="cl ${on ? "sel" : ""}" data-act="wear" data-v="${k}" aria-pressed="${on}"><img src="img/p_${k}.png" alt=""><b>${n}</b>${on ? `<span class="hv">입는 중</span>` : have ? `<span class="hv">보유</span>` : `<span class="pr">구슬 ${price}</span>`}</button>`; }).join("")}</div>`).join("") + `<p class="lay-note hand">가진 캐릭터로는 언제든 무료로 갈아입어요. 새 캐릭터는 구슬이 들어요.</p>`;
  } else if (s === "font") {
    inner = `<div class="lay-grid">${Object.entries(FONTS).map(([k, [n, fam]]) => `<button class="lay fontpick ${u.font === k ? "sel" : ""}" data-act="setfont" data-v="${k}" aria-pressed="${u.font === k}"><span class="fsample" style="font-family:'${fam}','Jua',sans-serif">${esc(u.title)}</span><b>${n}</b>${u.font === k ? `<span class="lk">사용 중</span>` : ""}</button>`).join("")}</div>
      <p class="lay-note hand">홈피 이름 글꼴이 바뀌어요. (도트 영문체는 한글이 기본 글꼴로 보여요)</p>`;
  } else {
    const sg = u.song || {};
    inner = `<form class="frm" data-form="song"><label class="fld"><span>노래 제목 <small class="gray">(비워 두면 유튜브 영상 제목을 가져와요)</small></span><input class="inp5 grow" name="title" maxlength="40" value="${esc(sg.title)}"></label>
      <label class="fld"><span>가수</span><input class="inp5 grow" name="artist" maxlength="30" value="${esc(sg.artist)}"></label>
      <label class="fld"><span>공식 영상 링크 (유튜브)</span><input class="inp5 grow" name="url" maxlength="200" value="${esc(sg.url)}" placeholder="영상 또는 플레이리스트 링크"></label>
      <p class="warn5">음원 파일은 올릴 수 없어요. 저작권 때문에 공식 영상 링크만 걸 수 있어요.</p><div class="dact5">${sg.title ? `<button type="button" class="bv" data-act="songdel">🗑 노래 지우기</button>` : ""}<button class="bv pri">저장하기 ♡</button></div></form>`;
  }
  const body = `<div class="grid5"><section class="y-win w3"><div class="y-title"><span class="px">decorate.exe</span><b class="jua">홈피 꾸미기</b><span class="own5">주인만 보여요</span><span class="y-more">내 구슬 <b class="px bead5">${u.beads}</b> <a class="lnk chg5" href="#/my">충전</a></span></div>
    <div class="dec5"><div class="dtabs" role="tablist">${DTABS.map(([k, n]) => `<a class="${k === s ? "cur" : ""}" role="tab" aria-selected="${k === s}" href="#/h/${u.id}/deco?s=${k}">${n}</a>`).join("")}</div>
    ${inner}<div class="dact5"><a class="bv pri" href="#/h/${u.id}">내 홈피에서 보기 ›</a></div></div></section></div>`;
  return { body: hBody(u), title: "홈피 꾸미기", html: hompyFrame(u, "deco", body), after: () => { bindFurnDrag(u); bindPf(); } };
}
const applied = msg => { save(); toast(msg); refresh(); };
ACT.secmove = el => {
  const m = me(); if (!m) return; const o = secOrder(m), k = el.dataset.k, i = o.indexOf(k), top = el.dataset.d === "top", j = top ? 0 : i + +el.dataset.d;
  if (i < 0 || j < 0 || j >= o.length || i === j) return;
  o.splice(i, 1); o.splice(j, 0, k); m.secOrder = o; save();
  toast(`${SECS.find(s => s[0] === k)[1]} 칸을 ${j + 1}번째로 옮겼어요.`); refresh(withQ({ moved: k }));
  // 다시 그린 뒤 같은 칸의 버튼으로 포커스를 돌린다(끝이라 꺼졌으면 반대 방향)
  setTimeout(() => { const b = $$(`.ord5 [data-k="${k}"]`).filter(x => !x.disabled); (b.find(x => x.dataset.d === el.dataset.d) || b[0])?.focus(); }, 0);
};
ACT.sechide = el => { const m = me(); if (!m) return; const k = el.dataset.k, h = new Set(m.secHidden || []); h.has(k) ? h.delete(k) : h.add(k); m.secHidden = [...h]; save(); toast(`${SECS.find(s => s[0] === k)[1]} 칸을 ${h.has(k) ? "숨겼어요" : "다시 보이게 했어요"}.`); refresh();
  setTimeout(() => $(`.ord5 [data-act="sechide"][data-k="${k}"]`)?.focus(), 0); };
ACT.secreset = () => modal({ title: "처음 순서로", body: "<p>칸 순서와 숨김을 처음대로 돌릴까요?</p>", ok: "돌리기", danger: true, onOk: () => { const m = me(); if (!m) return; delete m.secOrder; delete m.secHidden; applied("처음 순서로 돌렸어요."); } });
// 제목 줄 작은 사진을 누르면 예전 표지의 큰 프리쿠라 카드
// 사진을 누르면 창 대신 바로 아래에 사진만 펼친다(다시 누르면 접힘)
ACT.bigpic = el => { const u = user(el.dataset.id); if (!u) return; const row = el.closest(".cvb-row, .cv5-body") || el, nx = row.nextElementSibling, cov = row.closest(".cover5"), z = $(".pk-zoom", el);
  if (nx && nx.classList.contains("pic-open")) { nx.remove(); cov && cov.classList.remove("pic-on"); el.setAttribute("aria-expanded", "false"); z && (z.textContent = "🔍 크게"); return; }
  row.insertAdjacentHTML("afterend", `<div class="pic-open"><img src="${picSrc(u.id)}" alt="${esc(u.nick)}의 사진"></div>`); el.setAttribute("aria-expanded", "true");
  // PC 표지는 칸을 늘리지 않고 위에 겹쳐 띄운다(레이아웃 02·07이 무너지던 것)
  if (cov) { cov.classList.add("pic-on"); z && (z.textContent = "✕ 접기"); row.nextElementSibling.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } };
// 지금 쓰던 꾸며진 방은 바꿔도 계속 가진 것으로 남긴다(시드 계정처럼 산 기록이 없는 경우)
// 다시 그린 뒤 누른 카드로 포커스를 돌린다(키보드로 10종을 비교할 때 자리를 잃지 않게)
const refocus = sel => setTimeout(() => $(sel)?.focus(), 0);
const keepRoom = m => { if (m.room !== "e" && ROOMS[m.room] && !(m.roomsOwned || []).includes(m.room)) m.roomsOwned = [...(m.roomsOwned || []), m.room]; };
ACT.setebg = el => { const m = me(), i = +el.dataset.v; if (!m || !EROOMS[i - 1]) return; keepRoom(m); m.room = "e"; m.ebg = i;
  m.furn = Object.fromEntries(Object.entries(m.furn).filter(([k]) => m.furnOwned.includes(k))); applied(`빈 방을 ${ro(EROOMS[i - 1])} 바꿨어요.`); refocus(`[data-act="setebg"][data-v="${i}"]`); };
ACT.setroom = el => { const m = me(), k = el.dataset.v; if (!m || !ROOMS[k] || k === "e") return;
  if (ownRoom(m, k)) { keepRoom(m); m.room = k; applied(`${ro(ROOMS[k][0])} 바꿨어요.`); return refocus(`[data-act="setroom"][data-v="${k}"]`); }
  buy(m, ROOM_PRICE, ROOMS[k][0], () => { keepRoom(m); m.roomsOwned = [...(m.roomsOwned || []), k]; m.room = k; }); };
ACT.settheme = el => { me().theme = +el.dataset.v; applied(`배경을 ${ro(THEMES[+el.dataset.v - 1][0])} 바꿨어요.`); };
ACT.setlayout = el => { me().layout = +el.dataset.v; applied(`레이아웃을 ${ro(LAYOUTS[+el.dataset.v - 1][0])} 바꿨어요.`); };
ACT.setfont = el => { me().font = el.dataset.v; applied("글꼴을 바꿨어요."); };
function buy(m, price, name, then) {
  if (m.beads < price) return modal({ title: "구슬이 모자라요", body: `<p><b>${esc(eul(name))}</b> 사려면 구슬 <b>${price}</b>개가 필요해요. (지금 ${m.beads}개)</p>`, ok: "충전하러 가기", onOk: () => { go("#/my"); setTimeout(ACT.charge, 150); } });
  modal({ title: "구슬로 사기", body: `<p><b>${esc(eul(name))}</b> 구슬 <b>${price}</b>개로 살까요? (지금 ${m.beads}개)</p>`, ok: "사기",
    onOk: () => { if (m.beads < price) { toast("구슬이 모자라요. 마이페이지에서 충전할 수 있어요."); return; } m.beads -= price; m.beadLog.push({ t: name, n: -price, at: nowISO() }); then(); applied(`${eul(name)} 샀어요 ♡`); } });
}
ACT.wear = el => { const m = me(), k = el.dataset.v; if (!m || !CHARS[k]) return; if (m.chars.includes(k)) { m.char = k; return applied(`${ro(CHARS[k][0])} 갈아입었어요.`); } if (!m.freeCharUsed) return modal({ title: "캐릭터 바꾸기", body: `<p><b>${esc(ro(CHARS[k][0]))}</b> 바꿀까요? 가입 뒤 첫 1번은 무료예요.</p><p class="gray">다음부터 새 캐릭터는 구슬 20~30개가 들어요.</p>`, ok: "무료로 바꾸기", onOk: () => { m.freeCharUsed = true; m.chars.push(k); m.char = k; applied(`${ro(CHARS[k][0])} 바꿨어요 ♡`); } });
  buy(m, CHARS[k][1], CHARS[k][0], () => { m.chars.push(k); m.char = k; }); };
ACT.furn = el => {
  const m = me(), k = el.dataset.v;
  if (!m.furnOwned.includes(k)) return buy(m, FURN[k][2], FURN[k][0], () => { m.furnOwned.push(k); m.furn[k] = [512, 600]; });
  if (k in m.furn) delete m.furn[k]; else m.furn[k] = [512, 600];
  save(); refresh();
};
ACT.preset = el => {
  const m = me(), p = PRESET[el.dataset.v] || {}, missing = Object.keys(p).filter(k => !m.furnOwned.includes(k));
  m.furn = Object.fromEntries(Object.entries(p).filter(([k]) => m.furnOwned.includes(k)).map(([k, v]) => [k, [...v]]));
  save(); refresh();
  if (missing.length) toast(`없는 가구는 빼고 놓았어요: ${missing.map(k => FURN[k][0]).join(", ")}`);
};
// 등록한 노래 지우기(지우면 소개 칸 노래 줄이 '♪ 노래 고르기'로 돌아간다)
ACT.songdel = () => modal({ title: "노래 지우기", body: "<p>등록한 노래를 지울까요?</p>", ok: "지우기", danger: true, onOk: () => { me().song = { title: "", artist: "", url: "" }; applied("노래를 지웠어요."); } });
FORM.song = async (f, d) => {
  const url = (d.get("url") || "").trim();
  if (url && !isYoutube(url)) return toast("유튜브 공식 영상 주소(https://www.youtube.com/… 또는 https://youtu.be/…)만 넣을 수 있어요.");
  let title = (d.get("title") || "").trim(), artist = (d.get("artist") || "").trim();
  if (!title && !url) return toast("노래 제목이나 유튜브 링크 중 하나는 넣어 주세요.");
  if (!title) {  // 제목을 비우면 유튜브 oEmbed로 영상 제목을 가져온다(실패하면 다시 넣어 달라고)
    toast("영상 제목을 가져오는 중이에요…");
    const here = location.hash, j = await ytMeta(url);
    if (location.hash !== here) return;  // 가져오는 사이 다른 화면으로 나갔으면 저장하지 않는다(스크롤은 상관없음)
    if (!j || !j.title) return toast(location.hostname.endsWith("claude.ai") || location.hostname.endsWith("claudeusercontent.com") ? "이 데모 링크에서는 유튜브 제목을 가져올 수 없어요. 노래 제목을 직접 넣어 주세요." : "영상 제목을 가져오지 못했어요. 노래 제목을 직접 넣어 주세요.");
    if (ytList(url)) title = String(j.title).slice(0, 40);  // 플레이리스트는 제목 그대로
    else { const p = parseSong(j.title, j.author_name); title = p.title; if (!artist) artist = p.artist; }
    if (!title) return toast("영상 제목을 가져오지 못했어요. 노래 제목을 직접 넣어 주세요.");
  }
  me().song = { title, artist, url };
  applied("인생곡을 저장했어요 ♪");
};

// 프로필 사진 편집: 240px 네모 칸 기준으로 위치(x,y)·확대(z)를 정하고, 저장할 때 400px 정사각 썸네일을 만든다
let PF = null; const PFS = 240;
function pfLay() { const b = Math.max(PFS / PF.w, PFS / PF.h) * PF.z, w = PF.w * b, h = PF.h * b;
  PF.x = Math.min(0, Math.max(PFS - w, PF.x)); PF.y = Math.min(0, Math.max(PFS - h, PF.y)); return { s: b, w, h, x: PF.x, y: PF.y }; }
const pfApply = () => { const L = pfLay(), im = $("#pfimg"); if (im) Object.assign(im.style, { left: L.x + "px", top: L.y + "px", width: L.w + "px", height: L.h + "px" }); };
CHG.pfpick = async el => {
  try { const src = await readImage(el.files[0], 1600), im = new Image(); im.src = src; await im.decode();
    PF = { src, w: im.naturalWidth, h: im.naturalHeight, z: 1, x: 0, y: 0 };
    if (PF.w / PF.h > 2) toast("아주 넓은 사진이에요. 크게 볼 때도 네모 칸에 맞춘 부분이 보여요.");
    else if (Math.min(PF.w, PF.h) < 300) toast("작은 사진이라 흐리게 보일 수 있어요. 1080×1080 정도를 권해요.");
    const L = pfLay(); PF.x = (PFS - L.w) / 2; PF.y = (PFS - L.h) * 0.15;  // 얼굴은 대개 위쪽이라 위 15% 지점부터
    refresh(); setTimeout(() => $(".pf-box")?.focus(), 0); } catch (e) { toast(e.message); } };
CHG.pfzoom = el => { el.setAttribute("aria-valuetext", Math.round(el.value * 100) + "%"); const o = pfLay(), cx = (PFS / 2 - o.x) / o.s, cy = (PFS / 2 - o.y) / o.s; PF.z = +el.value; const n = pfLay(); PF.x = PFS / 2 - cx * n.s; PF.y = PFS / 2 - cy * n.s; pfApply(); };
function bindPf() {
  const box = $(".pf-box"); if (!box || !PF) return; let d = null;
  box.addEventListener("pointerdown", e => { d = { x: e.clientX - PF.x, y: e.clientY - PF.y }; box.setPointerCapture(e.pointerId); });
  box.addEventListener("pointermove", e => { if (!d) return; PF.x = e.clientX - d.x; PF.y = e.clientY - d.y; pfApply(); });
  const end = () => { d = null; }; box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
  box.addEventListener("keydown", e => { const k = { ArrowLeft: [-8, 0, "왼쪽으로"], ArrowRight: [8, 0, "오른쪽으로"], ArrowUp: [0, -8, "위로"], ArrowDown: [0, 8, "아래로"] }[e.key]; if (!k) return; e.preventDefault(); pfMove(k[0], k[1], k[2]); });
  $("[data-change=pfzoom]")?.addEventListener("input", e => CHG.pfzoom(e.target));
}
ACT.pfsave = async () => { const m = me(); if (!m || !PF) return; const L = pfLay(), im = new Image(); im.src = PF.src; await im.decode();
  const c = document.createElement("canvas"); c.width = c.height = 400; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 400, 400);
  g.drawImage(im, -L.x / L.s, -L.y / L.s, PFS / L.s, PFS / L.s, 0, 0, 400, 400);
  const r = Math.min(1, 900 / Math.max(PF.w, PF.h)), f = document.createElement("canvas"); f.width = Math.round(PF.w * r); f.height = Math.round(PF.h * r); f.getContext("2d").drawImage(im, 0, 0, f.width, f.height);
  const old = m.pic; m.pic = { thumb: c.toDataURL("image/jpeg", 0.85), full: f.toDataURL("image/jpeg", 0.82), w: PF.w, h: PF.h };
  if (!save()) { m.pic = old; return toast("저장 공간이 모자라요. 더 작은 사진으로 해 주세요."); }
  PF = null; toast("프로필 사진을 바꿨어요 ♡"); refresh(); setTimeout(() => $(".pf-up")?.focus(), 0); };
ACT.pfcancel = () => { PF = null; refresh(); setTimeout(() => $(".pf-up")?.focus(), 0); };
// 위치 옮기기 버튼(리더기·터치용)과 상태 알림
// 실제로 움직였는지 보고 알린다(끝에 닿으면 "더 못 옮겨요"). 같은 문구가 이어져도 다시 읽히게 끝에 보이지 않는 글자를 번갈아 붙인다
let pfTick = 0;
const pfMove = (dx, dy, n) => { const ox = PF.x, oy = PF.y; PF.x += dx; PF.y += dy; pfApply(); const s = $("#pfst"); if (!s) return;
  s.textContent = (PF.x !== ox || PF.y !== oy ? `사진을 ${n} 옮겼어요` : `더 ${n}는 못 옮겨요`) + (pfTick++ % 2 ? "\u200b" : ""); };
ACT.pfmv = el => { const [dx, dy, n] = { l: [-16, 0, "왼쪽으로"], r: [16, 0, "오른쪽으로"], u: [0, -16, "위로"], d: [0, 16, "아래로"] }[el.dataset.v]; pfMove(dx, dy, n); };
ACT.pfdel = () => modal({ title: "캐릭터로 돌아가기", body: "<p>올린 프로필 사진을 지우고 내 캐릭터로 돌아갈까요?</p>", ok: "돌아가기", danger: true, onOk: () => { const m = me(); delete m.pic; applied("캐릭터로 돌아갔어요."); } });

// 홈피 화면에서 바로 순서 바꾸기(폰 B+): 칸마다 ☰ 손잡이를 끌어서 놓거나 ▲▼로 옮긴다. 놓는 즉시 저장
ACT.ordedit = () => go(withQ({ ord: 1 }));
ACT.ordexit = () => { go(withQ({ ord: "", moved: "" })); setTimeout(() => $("[data-act=ordedit]")?.focus(), 80); };
function bindOrdEdit(u) {
  const box = $(".hv-b.hv-home"); if (!box) return;
  const hid = u.secHidden || [], nm = k => SECS.find(s => s[0] === k)[1];
  const secs = () => SECS.map(([k, , c]) => [k, $(`:scope > .${c}`, box)]).filter(x => x[1]).sort((a, b) => a[1].getBoundingClientRect().top - b[1].getBoundingClientRect().top);
  const list = secs();
  list.forEach(([k, el], i) => el.insertAdjacentHTML("afterbegin", `<div class="oe5 ord5"><span class="oe-h" data-k="${k}" aria-hidden="true">☰</span><b>${nm(k)}${hid.includes(k) ? " <em>(숨김)</em>" : ""}</b><span class="oe-b">
    <button class="bv sm" data-act="secmove" data-k="${k}" data-d="-1" ${i === 0 ? "disabled" : ""} aria-label="${nm(k)} 위로">▲</button><button class="bv sm" data-act="secmove" data-k="${k}" data-d="1" ${i === list.length - 1 ? "disabled" : ""} aria-label="${nm(k)} 아래로">▼</button>${k === "room" ? "" : `<button class="bv sm" data-act="sechide" data-k="${k}" aria-pressed="${hid.includes(k)}">${hid.includes(k) ? "보이기" : "숨기기"}</button>`}</span></div>`));
  box.classList.add("oe-on"); document.body.classList.add("oe-mode");
  document.body.insertAdjacentHTML("beforeend", `<div class="oe-done" role="status">☰ 를 끌어서 순서를 바꿔요 <button class="bv sm pri" data-act="ordexit">완료</button></div>`);
  let d = null;
  box.addEventListener("pointerdown", e => { const h = e.target.closest(".oe-h"); if (!h) return; e.preventDefault(); d = { k: h.dataset.k, to: -1, y: e.clientY }; h.setPointerCapture(e.pointerId); h.closest("section").classList.add("oe-drag"); requestAnimationFrame(tick); });
  const aim = y => { const l = secs(); let to = l.length;
    for (let i = 0; i < l.length; i++) { const r = l[i][1].getBoundingClientRect(); if (y < r.top + r.height / 2) { to = i; break; } }
    d.to = to; l.forEach(([, el], i) => el.classList.toggle("oe-drop", i === to)); box.classList.toggle("oe-drop-end", to === l.length); };
  const tick = () => { if (!d) return; const v = d.y < 100 ? -(100 - d.y) / 6 : d.y > innerHeight - 150 ? (d.y - innerHeight + 150) / 6 : 0; if (v) { scrollBy(0, v); aim(d.y); } requestAnimationFrame(tick); };
  box.addEventListener("pointermove", e => { if (!d) return; d.y = e.clientY; aim(e.clientY); });
  const end = () => { if (!d) return; const { k, to } = d; d = null; $$(".oe-drag, .oe-drop").forEach(x => x.classList.remove("oe-drag", "oe-drop")); box.classList.remove("oe-drop-end"); if (to < 0) return;
    const o = secs().map(x => x[0]), from = o.indexOf(k); o.splice(from, 1); o.splice(to > from ? to - 1 : to, 0, k);
    const m = me(); m.secOrder = o; save(); toast(`${nm(k)} 칸을 ${o.indexOf(k) + 1}번째로 옮겼어요.`); refresh(withQ({ ord: 1, moved: k })); };
  box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
  if (R.q.moved) $(`.oe5 [data-k="${R.q.moved}"]`)?.closest("section")?.classList.add("oe-moved");
}

// 배경 노래(유튜브): 들어오면 자동 재생을 시도한다. 브라우저가 소리 있는 자동 재생을 막으면 화면을 처음 누를 때 시작한다.
// ▶️/⏸️로 멈춤·재생. 재생 상태는 유튜브 플레이어가 보내는 메시지로 받는다.
let bgmState = -1, bgmPaused = false;
const bgmSend = func => $("#bgm5")?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
function bgmBind() {
  const f = $("#bgm5"); bgmState = -1; if (!f) return;
  f.addEventListener("load", () => {
    f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: "bgm5" }), "*");
    if (f.dataset.auto !== "1") return;  // 자동 재생 끔: ▶️를 눌러야 나온다
    setTimeout(() => { if (bgmState !== 1 && !bgmPaused) document.addEventListener("pointerdown", e => { if (!e.target.closest("[data-act=bgm]") && !bgmPaused) bgmSend("playVideo"); }, { once: true, capture: true }); }, 1500);
  });
}
ACT.bgm = () => { if (bgmState === 1) { bgmPaused = true; bgmSend("pauseVideo"); } else { bgmPaused = false; bgmSend("playVideo"); } };
addEventListener("message", e => {
  if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
  let d; try { d = JSON.parse(e.data); } catch (x) { return; }
  const st = d.event === "onStateChange" ? d.info : d.event === "infoDelivery" && d.info && typeof d.info.playerState === "number" ? d.info.playerState : null;
  if (st == null) return; bgmState = st; const b = $(".np5-pp"); if (!b) return; const on = st === 1;
  { const im = $("img", b); im.src = im.src.replace(on ? "btn_play_" : "btn_pause_", on ? "btn_pause_" : "btn_play_"); }  // 레이아웃별 버튼 그림 b.setAttribute("aria-pressed", on); b.setAttribute("aria-label", on ? "노래 멈추기" : "노래 재생");
});

// 영상(플레이리스트) 제목 알아내기: ① 유튜브 oEmbed ② 막히면(데모 링크 등) 보이지 않는 유튜브 플레이어가 보내는 영상 정보
async function ytMeta(url) {
  try { const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`); if (r.ok) { const j = await r.json(); if (j.title) return j; } } catch (e) {}
  const emb = ytEmbed(url); if (!emb) return null;
  return new Promise(ok => {
    const fr = document.createElement("iframe"); fr.className = "bgm5"; fr.setAttribute("aria-hidden", "true"); fr.tabIndex = -1;
    fr.src = `https://www.youtube-nocookie.com/embed/${emb}enablejsapi=1&autoplay=0&origin=${encodeURIComponent(location.origin)}`;
    const done = v => { removeEventListener("message", on); clearTimeout(tm); fr.remove(); ok(v); };
    const on = e => { if (e.source !== fr.contentWindow) return; let d; try { d = JSON.parse(e.data); } catch (x) { return; }
      const vd = d.info && d.info.videoData; if (vd && vd.title) done({ title: vd.title, author_name: vd.author || "" }); };
    const tm = setTimeout(() => done(null), 5000);
    addEventListener("message", on);
    fr.addEventListener("load", () => fr.contentWindow.postMessage(JSON.stringify({ event: "listening", id: "ytmeta" }), "*"));
    document.body.appendChild(fr);
  });
}
