"use strict";
// 로그인(카카오·네이버 흉내)·가입 2단계: ① 카카오·네이버로 시작(약관) → ② 캐릭터·닉네임 고르면 끝.
// 홈피 주소는 자동으로 만들고, 동네·생일·주소 바꾸기·꾸미기는 나중에(마이페이지·꾸미기).
// shortcut: 카카오·네이버 로그인은 흉내만 낸다 — 실서비스는 각 OAuth(닉네임·출생연도만) 연동. 일반(아이디·비밀번호) 가입은 없다.

const STEPS = ["카카오·네이버로 시작", "캐릭터·이름"];
const RESERVED = ["admin", "root", "help", "login", "start", "my", "go", "search", "cyworld", "minihompy", "official"];
function obFrame(step, inner) {
  const steps = step ? `<ol class="steps two">${STEPS.map((t, i) => `<li class="${i + 1 < step ? "ok" : i + 1 === step ? "cur" : ""}"><b>${i + 1 < step ? "✔" : i + 1}</b>${t}</li>`).join("")}</ol>` : "";
  return `<div class="hp-bg ob-bg"><div class="ob-top"><a class="logo" href="#/"><img src="img/i_star.png" alt=""><b class="jua">추억홈피</b></a></div>
    <div class="ob-card">${steps}<div class="ob-page">${inner}</div></div></div>`;
}
const ob = (step, title, inner) => ({ body: "v4o y5o", title, html: obFrame(step, inner) });
// 가입하고 오면 단짝 신청을 이어 보낼 상대(주소가 #/h/<주소>/profile?ask=1 일 때만)
const askTarget = next => { const a = /^#\/h\/(\w+)(?:\/\w*)?(?:\?[\w=&%-]*)?$/.exec(next || ""), u = a && (byHandle(a[1]) || user(a[1])); return u && alive(u) && !u.admin ? u : null; };
const askDefault = next => {
  const t = askTarget(next); if (!t) return false;
  if (/\/profile\?ask=1$/.test(next)) return true;  // '나도 만들고 단짝 신청하기' 버튼이 만든 주소 모양만  // '나도 만들고 단짝 신청하기'를 직접 누름
  let e = ""; try { e = sessionStorage.getItem("entry") || ""; } catch (x) {}
  const eu = askTarget(e); return !!eu && eu.id === t.id;
};
const nextAfter = () => { const n = R.q.next || ""; return /^#\/[\w\/%?=&.+-]*$/.test(n) && !n.startsWith("#/login") && !n.startsWith("#/start") ? n : ""; };  // 우리 화면 주소만 따라간다

VIEWS.login = () => {
  const m = me(); if (m) return { redirect: nextAfter() || `#/h/${m.id}` };
  const back = DB.myId && DB.users[DB.myId];
  return ob(back ? 0 : 1, "시작하기", `
    <h2 class="ob-h2 jua">추억홈피 시작하기</h2>
    ${back ? `<div class="warn5">이 브라우저에 <b>${esc(back.nick)}</b> 님 홈피가 있어요.${back.withdrawnAt ? " (탈퇴 신청 중 — 다시 로그인하면 되살아나요)" : ""}</div>` : ""}
    <form class="frm" data-form="login">
      ${back ? "" : `<div class="agree"><label class="rad all"><input type="checkbox" data-change="agreeall"> <b>전체 동의</b></label>
        <label class="rad"><input type="checkbox" name="age" class="ag" required> [필수] 만 14세 이상이에요</label>
        <span class="agr5"><label class="rad"><input type="checkbox" name="terms" class="ag" required> [필수] 이용약관</label><button type="button" class="lnkbtn lnk" data-act="policy" data-k="terms">보기</button></span>
        <span class="agr5"><label class="rad"><input type="checkbox" name="privacy" class="ag" required> [필수] 개인정보 수집·이용</label><button type="button" class="lnkbtn lnk" data-act="policy" data-k="privacy">처리방침 보기</button></span>
        <p class="agn5"><b>모으는 항목</b> 카카오 또는 네이버의 회원 식별값·닉네임·출생연도<br><b>목적</b> 회원 확인·만 14세 이상 확인·홈피 운영·신고 처리<br><b>보관</b> 탈퇴 후 30일(법이 정한 기록은 그 기간)<br>다른 회원에게 피해를 줘 이용이 막힌 사람은 1년 동안 다시 가입할 수 없어요. 이걸 확인하려고 계정 정보를 알아볼 수 없게 바꿔서 1년만 보관해요.<br>동의하지 않을 수 있지만, 그러면 가입할 수 없어요.</p>
        <label class="rad"><input type="checkbox" name="mkt" class="ag"> [선택] 이벤트·혜택 알림</label>
        <p class="agn5">이벤트 소식을 알림으로 보내요. 동의하지 않아도 가입할 수 있고, 동의는 언제든 운영자에게 알려 철회할 수 있어요.</p></div>
      <label class="fld"><span>출생연도 <small>(데모라 직접 골라요 · 실서비스는 카카오·네이버에서 받아요)</small></span><select class="inp" name="by" required><option value="">고르기</option>${Array.from({ length: 81 }, (_, i) => kst().y - 10 - i).map(y => `<option value="${y}">${y}년</option>`).join("")}</select></label>`}
      <button class="btn-k big" name="via" value="kakao">💬 카카오로 3초 만에 시작 <small>(데모)</small></button>
      <button class="btn-k big btn-n" name="via" value="naver">네이버로 3초 만에 시작 <small>(데모)</small></button>
      <p class="ob-note">카카오·네이버에서 닉네임·출생연도만 받아요(프로필 사진·친구 목록은 받지 않아요). 카카오·네이버 친구에게 내 홈피가 알려지지 않아요. 추억홈피는 <b>만 14세 이상</b>만 가입할 수 있어요. 아이디·비밀번호 가입은 없어요.<br>추억홈피는 다른 서비스와 관계없는 독립 서비스예요. 예전 데이터는 가져오지 않아요.</p>
      ${!back && askTarget(nextAfter()) ? `<p class="ob-note">가입하면 다음 화면에서 <b>${esc(askTarget(nextAfter()).nick)}</b>님께 단짝 신청을 보낼지 고를 수 있어요.</p>` : ""}
      <div class="ob-nav"><a class="pbtn ghost" href="#/start/1">‹ 이전</a></div>
    </form>`);
};
CHG.agreeall = el => $$(".ag").forEach(c => c.checked = el.checked);
FORM.login = (f, d) => {
  const back = DB.myId && DB.users[DB.myId];
  if (back) {  // 이 브라우저의 기존 계정으로 다시 로그인 (탈퇴 30일 안이면 되살림)
    if (back.withdrawnAt && Date.now() - new Date(back.withdrawnAt) < 30 * 864e5) { delete back.withdrawnAt; toast("다시 오셨네요! 홈피를 되살렸어요 ♡"); }
    else if (back.withdrawnAt) { DB.myId = null; save(); return refresh(); }
    DB.me = back.id; save(); return go(nextAfter() || `#/h/${back.id}`);
  }
  if (!d.get("age") || !d.get("terms") || !d.get("privacy")) return toast("필수 약관에 모두 동의해 주세요. (전체 동의를 누르면 한 번에 돼요)");
  const by = +d.get("by"); if (!by) return toast("출생연도를 골라 주세요.");
  if (kst().y - by < 14) return toast("만 14세 이상만 가입할 수 있어요.");  // 14(생일 전 13세일 수 있음)는 받고 10대로 둔다 — isTeen 참고
  // 데모: 카카오·네이버에서 받은 닉네임 대신 임시 닉네임을 넣어 둔다(바로 고칠 수 있음)
  DB.pending = { via: d.get("via") === "naver" ? "naver" : "kakao", mkt: !!d.get("mkt"), next: nextAfter(), nick: `추억친구${Math.floor(100 + Math.random() * 900)}`, char: "", tone: "", big: false, birthYear: by };
  save(); go("#/start/2");
};

VIEWS.start = step => {
  const m = me(), P = DB.pending;
  if (step === 3 && R.q.done && m) return obDone(m);
  if (m) return { redirect: `#/h/${m.id}` };
  if (step === 1) return ob(0, "내 홈피 만들기", `
    <h1 class="ob-h jua">그때 감성으로,<br>내 홈피 만들어 볼까요? ✨</h1>
    <p class="ob-sub hand">그때 그 감성 그대로, 지금의 나를 담아서 :)</p>
    <img class="ob-room" src="img/room5.png" alt="꾸민 홈피 예시">
    <a class="btn-k big" href="#/login">💬 카카오·네이버로 3초 만에 시작</a>
    <p class="ob-note">카카오·네이버 로그인 → 캐릭터 고르기, <b>두 단계면 끝</b>. 홈피 주소는 자동으로 생겨요.<br>추억홈피는 다른 서비스와 관계없는 독립 서비스예요. 예전 데이터는 가져오지 않아요.</p>
    <div class="ob-mini"><span>🏠 지금까지 만든 홈피 <b class="or">${num(Object.values(DB.users).filter(alive).length)}</b>개</span><span>💌 오늘 놀러간 횟수 <b class="or">${num(Object.values(DB.users).reduce((s, u) => s + (u.today.d === kst().key ? u.today.n : 0), 0))}</b>번</span></div>`);
  if (!P) return { redirect: "#/login" };
  if (step !== 2) return { redirect: "#/start/2" };
  // 캐릭터는 미리 골라 두지 않는다(남성이 모르고 여자 캐릭터로 가입하던 문제). 방 톤·글씨 크기도 여기서 고른다.
  return ob(2, "캐릭터·이름", `<h2 class="ob-h2 jua">내 캐릭터와 방을 골라 주세요</h2>
    <form class="frm" data-form="ob2">
      <h3 class="ob-h3 jua">캐릭터</h3>
      ${CHAR_GROUPS.map(([g, ks]) => `<p class="chg">${g}</p><div class="chars">${ks.map(k => `<label class="ch ${P.char === k ? "sel" : ""}"><input type="radio" name="char" value="${k}" ${P.char === k ? "checked" : ""} class="sr" data-change="pickcard" required><img src="img/p_${k}.png" alt=""><span>${CHARS[k][0]}</span><i>✔</i></label>`).join("")}</div>`).join("")}
      <h3 class="ob-h3 jua">방 분위기</h3>
      <div class="rooms two">${[["l", "♡ 딸기우유 빈 방", "img/room_e02_s.png"], ["m", "★ 네이비 밤 빈 방", "img/room_e08_s.png"]].map(([k, n, img]) => `<label class="rm ${P.tone === k ? "sel" : ""}"><input type="radio" name="tone" value="${k}" ${P.tone === k ? "checked" : ""} class="sr" data-change="pickcard"><img src="${img}" alt=""><span>${n}</span></label>`).join("")}</div>
      <p class="ob-note">가구 3개가 놓인 빈 방으로 시작해요. 벽·바닥 색은 10가지 중에서 언제든 무료로 바꾸고, 다 꾸며진 방(러블리·스트릿)은 꾸미기에서 구슬로 살 수 있어요.</p>
      <h3 class="ob-h3 jua">글씨 크기</h3>
      <div class="frow">${[["", "보통"], ["1", "크게"]].map(([v, n]) => `<label class="rad"><input type="radio" name="big" value="${v}" ${(P.big ? "1" : "") === v ? "checked" : ""}>${n}</label>`).join("")}</div>
      <label class="fld"><span>닉네임 <small>(${P.via === "naver" ? "네이버" : "카카오"} 닉네임을 가져왔어요 · 바꿔도 돼요)</small></span><input class="inp" name="nick" value="${esc(P.nick)}" required minlength="2" maxlength="10"></label>
      ${askTarget(P.next) && !(isTeen(askTarget(P.next)) && !isTeen(P)) ? `<label class="chk"><input type="checkbox" name="askok" ${askDefault(P.next) ? "checked" : ""}><span>가입하면 <b>${esc(askTarget(P.next).nick)}</b>님께 단짝 신청 보내기<br><small class="gray">신청하면 상대에게 내 닉네임과 홈피가 보여요.</small></span></label><input type="hidden" name="askid" value="${askTarget(P.next).id}">` : ""}
      <p class="ob-note">홈피 주소는 자동으로 만들어요. 동네(창밖 날씨)·생일·주소는 나중에 마이페이지에서, 방·배경·옷은 꾸미기에서 바꿀 수 있어요.</p>
      <p class="warn5" id="tonewarn" role="alert" hidden>방 분위기를 골라 주세요. (딸기우유 / 네이비 밤)</p>
      <div class="ob-nav"><a class="pbtn ghost" href="#/login${P.next ? `?next=${encodeURIComponent(P.next)}` : ""}">‹ 이전</a><button class="pbtn">완성하기 ✨</button></div></form>`);
};
// 카드형 라디오: 고른 카드에 sel 표시
CHG.pickcard = el => { if (el.name === "tone") $("#tonewarn")?.setAttribute("hidden", ""); $$(`input[name="${el.name}"]`).forEach(i => i.closest("label").classList.toggle("sel", i.checked)); };
// 주소(=handle) 검사. self: 내 주소를 바꿀 때 내 것은 빼고 본다
function idState(id, self) {
  if (!/^[a-z0-9_]{3,15}$/.test(id)) return [false, "영문 소문자·숫자·_ 3~15자"];
  const taken = RESERVED.includes(id) || Object.values(DB.users).some(u => u.id !== self && (u.id === id || u.handle === id));
  return taken ? [false, "✖ 이미 있는 주소예요"] : [true, "✔ 쓸 수 있어요"];
}
CHG.idcheck = el => { el.value = el.value.toLowerCase().replace(/\s/g, ""); const [ok, msg] = idState(el.value, me()?.id); const s = $("#idmsg"); if (!s) return; s.textContent = el.value ? msg : ""; s.className = ok ? "ok" : "ng"; };
const autoId = () => { let id; do { id = "u" + Math.random().toString(36).slice(2, 8); } while (!idState(id)[0]); return id; };
FORM.ob2 = (f, d) => {
  const P = DB.pending; if (!P) return go("#/");  // 빠른 두 번 클릭: 이미 가입 처리됨
  const nk = (d.get("nick") || "").trim(), ch = d.get("char"), tone = d.get("tone");
  if (!CHARS[ch]) return toast("캐릭터를 하나 골라 주세요.");
  if (!["l", "m"].includes(tone)) { const w = $("#tonewarn"); if (w) { w.hidden = false; w.scrollIntoView({ block: "nearest" }); } return; }
  if (nk.length < 2) return toast("닉네임은 2자 이상이에요.");
  if (nickReserved(nk)) return toast("운영자로 오해할 수 있는 닉네임(운영자·관리자·어드민 등)은 쓸 수 없어요.");
  const id = autoId(), st = tone === "m", t = kst();
  DB.users[id] = {
    id, handle: id, nick: nk, char: ch, chars: [ch], room: "e", ebg: st ? 8 : 2, theme: st ? 6 : 1, layout: 1, font: "jua", region: "", beads: 0, beadLog: [],
    title: `${nk}의 홈피`, intro: "그 시절 감성으로 새로 시작 ☆", mood: "설렘", moodLog: [{ d: `${String(t.m).padStart(2, "0")}.${String(t.d).padStart(2, "0")}`, mood: "설렘" }], birthday: "",
    likes: "", then: "", now: "", memo: "", song: { title: "", artist: "", url: "" }, furn: Object.fromEntries(FURN_START.map(k => [k, [...(PRESET.l[k] || [512, 600])]])), furnOwned: [...FURN_START],
    friends: [], today: { d: "", n: 0 }, total: 0, settings: { scope: "friends", big: d.get("big") === "1", notify: { guest: true, friend: true, comment: false, visit: true } }, joinedAt: nowISO(), mkt: P.mkt, via: P.via, birthYear: P.birthYear,
  };
  DB.me = DB.myId = id;
  const next = P.next; DB.pending = null;
  const t0 = askTarget(next), to = d.get("askok") && t0 && t0.id === d.get("askid") && canReach(DB.users[id], t0) ? t0 : null;
  if (to) { DB.requests.push({ id: uid("q"), from: id, to: to.id, rel: "", at: nowISO() }); if (to.settings.notify.friend) addFeed(to.id, id, "님이 단짝을 신청했어요.", "#/my"); toast(`${nick(to.id)}님께 단짝 신청도 보냈어요 ♡`); }
  // 데모: 첫 단짝 신청 하나를 넣어 둔다(마이페이지에서 수락해 볼 수 있게). 지민은 성인이라 10대에게는 넣지 않는다
  if (!isTeen(DB.users[id]) && (!to || to.id !== "jimin")) { DB.requests.push({ id: uid("q"), from: "jimin", to: id, rel: "고딩 짝꿍", at: nowISO() }); addFeed(id, "jimin", "님이 단짝을 신청했어요.", "#/my"); }
  if (!save()) return;
  go(`#/start/3?done=1${next ? "&next=" + encodeURIComponent(next) : ""}`);
};
function obDone(m) {
  const next = nextAfter();
  return ob(0, "완성", `<h2 class="ob-h jua">🎉 ${esc(m.title)}가<br>생겼어요!</h2>
    <div class="done"><div class="mini-hp"><div class="mh-top"><span>오늘 <b class="or">0</b> · 지금까지 0</span><b class="jua">✦ ${esc(m.title)} ✦</b></div>
      <div class="mh-body"><img class="mh-av" src="${avSrc(m.id)}" alt=""><div class="mh-room">${roomScene(m)}</div></div></div>
      <div class="addr-box"><span>추억홈피.kr/@${esc(m.handle)} <small>(예시&nbsp;주소)</small></span><button class="pbtn ghost sm" data-act="copylink">링크 복사</button></div><p class="dnote5">데모라 친구 브라우저에선 이 홈피가 안 보여요.</p></div>
    <div class="later5"><b class="jua">나중에 해도 되는 것</b><ul>
      <li><a href="#/h/${m.id}/deco">🎀 방·배경·레이아웃 꾸미기</a></li>
      <li><a href="#/my">🌦 내 동네(창밖 날씨) · 생일 · 홈피 주소 바꾸기</a></li></ul></div>
    <button class="btn-k big" data-act="sharehome">💬 친구에게 알리기</button>
    <div class="share2"><button class="pbtn ghost" data-act="storycard">📷 인스타 스토리용 그림 저장</button><a class="pbtn ghost" href="${next || `#/h/${m.id}`}">🏠 ${next ? "하던 곳으로 돌아가기" : "내 홈피 가기"}</a></div>`);
}
ACT.copylink = () => copyText(homeUrl(me().id), "내 홈피 링크를 복사했어요 ♡");
ACT.sharehome = () => share(Date.now() - Date.parse(me().joinedAt || 0) < 3 * 864e5 ? "야 나 홈피 새로 만들었다 ㅋㅋ 놀러 와~" : "야 내 홈피 꾸며 놨어 ㅋㅋ 놀러 와~", homeUrl(me().id));
// 인스타 스토리용 세로 그림(1080x1920): 내 방 + 캐릭터 + 홈피 이름. 얼굴 사진·동네·생일은 넣지 않는다.
ACT.storycard = async () => {
  const m = me(), c = document.createElement("canvas"); c.width = 1080; c.height = 1920;
  const g = c.getContext("2d"), img = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  try {
    const [room, ch] = await Promise.all([img(roomImg(m)), img(charSrc(m.id))]);
    const bg = g.createLinearGradient(0, 0, 0, 1920); bg.addColorStop(0, "#ffd6ea"); bg.addColorStop(1, "#d4ecff"); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#fff"; g.fillRect(60, 380, 960, 680);
    if (m.room === "e" || !ROOMS[m.room]) {  // 빈 방: 창밖 하늘 → 유리 뚫린 방 → 가구 순서로 그린다(홈피 화면과 같게)
      const W = WIN.e, k = 920 / 1024, sky = await img(`img/sky_l_${timeOf(kst().h)}.png`), cut = await img(roomImg(m).replace(".png", "_cut.png"));
      g.drawImage(sky, 80 + W.x * k, 400 + W.y * k, W.w * k, W.h * k); g.drawImage(cut, 80, 400, 920, 614);
      for (const [f, [x, y]] of Object.entries(m.furn || {}).filter(([f]) => FURN[f]).sort((a, b) => (a[0] === "rug" ? -1 : a[1][1]) - (b[0] === "rug" ? -1 : b[1][1]))) {
        const fi = await img(`img/f_${f}.png`), fw = FURN[f][1] * k, fh = fi.height * fw / fi.width; g.drawImage(fi, 80 + x * k - fw / 2, 400 + y * k - fh, fw, fh); }
    } else g.drawImage(room, 80, 400, 920, 614);
    const h = 520, w = ch.width * h / ch.height; g.drawImage(ch, 540 - w / 2, 1060 - h, w, h);
    g.fillStyle = "#e0559a"; g.textAlign = "center"; g.font = "88px Jua, sans-serif"; g.fillText(`✦ ${m.title} ✦`.slice(0, 18), 540, 250, 980);
    g.fillStyle = "#4a3a86"; g.font = "52px Jua, sans-serif"; g.fillText("내 홈피 놀러 와 ♡", 540, 1220);
    g.font = "44px sans-serif"; g.fillText(`추억홈피.kr/@${m.handle}`, 540, 1320); g.font = "32px sans-serif"; g.fillText("(예시 주소)", 540, 1370);
    const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = `추억홈피_${m.id}_스토리.png`; document.body.appendChild(a); a.click(); a.remove();
    toast("스토리용 그림을 저장했어요. 인스타 스토리에 올려 보세요 ♡");
  } catch (e) { toast("그림을 만들지 못했어요. 잠시 뒤 다시 해 주세요."); }
};
