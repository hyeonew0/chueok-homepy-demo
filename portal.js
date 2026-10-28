"use strict";
// 포털 화면: 메인·게시판·글 보기·글쓰기·신고·검색·마이페이지·운영자
const VIEWS = {};

// ---------- 글 도우미 ----------
const likeN = p => (p.likeBase || 0) + p.likes.length;
const hotScore = p => likeN(p) * 2 + p.comments.length * 3 + p.views / 100;
const cmN = p => p.comments.filter(c => !hiddenFromMe(c.author)).length;  // 차단한 사람 댓글은 세지 않는다
const isHidden = p => !!(p.hidden && new Date(p.hidden.until) > Date.now());
const canManage = p => { const m = me(); return !!m && (m.id === p.author || m.admin); };
const livePosts = () => DB.posts.filter(p => !p.deleted && alivePostAuthor(p) && canSee(p.scope || "all", p.author) && !hiddenFromMe(p.author));
const alivePostAuthor = p => { const u = user(p.author); return u && !u.withdrawnAt; };
const board = id => has(BOARDS, id) ? BOARDS[id] : null;
// 받침에 따라 '으로/로', '을/를' (ㄹ받침은 '로')
const jong = s => { const c = String(s).charCodeAt(String(s).length - 1) - 0xac00; return c >= 0 && c < 11172 ? c % 28 : 0; };
const ro = s => `${s}${jong(s) && jong(s) !== 8 ? "으로" : "로"}`;
const eul = s => `${s}${jong(s) ? "을" : "를"}`;
// 음원 파일 직링크는 받지 않는다(저작권)
const isAudio = s => /\.(mp3|wav|m4a|flac|ogg|aac|wma)(\?|#|$)/i.test(s || "");
// 탈퇴한 사람이 남긴 댓글·방문록 본문은 숨긴다
const shown = (author, text) => user(author) && user(author).withdrawnAt ? "(탈퇴한 사용자의 글이에요)" : maskBad(text);
const tagCls = (board, cat) => BOARDS[board] ?TAGC[Math.max(0, BOARDS[board].cats.indexOf(cat)) % TAGC.length] : "t-pur";
const kstDate = () => { const k = kst(); return `${k.y}.${String(k.m).padStart(2, "0")}.${String(k.d).padStart(2, "0")} ${WD[k.wd] || ""}`; };
const unread = () => { const m = me(); return m ? DB.feed.filter(f => f.to === m.id && !f.read && !hiddenFromMe(f.from)).length : 0; };

function portal(active, main, aside) {
  const m = me(), n = unread();
  return `
<header class="m-head">
  <div class="wrap m-top">
    <a class="logo" href="#/"><img src="img/i_star.png" alt=""><b class="jua">추억홈피</b></a>
    <div class="m-tag">좋은 사람들과<br>다시, 그때로 …</div>
    <form class="m-search" role="search" data-form="search"><input name="q" placeholder="추억을 검색해 보세요 …" aria-label="검색어" value="${esc(R.path[0] === "search" ? R.q.q || "" : "")}" maxlength="40"><button>검색</button></form>
    <div class="m-links">${m
      ? `<a href="#/h/${m.id}">내 홈피</a><i>|</i><a href="#/my">마이페이지${n ? ` <b class="nbadge">${n}</b>` : ""}</a><i>|</i><button class="lnkbtn" data-act="logout">로그아웃</button>`
      : `<a href="#/login">로그인</a><i>|</i><a href="#/login">회원가입</a>`}<i>|</i><a href="#/help">도움말</a></div>
  </div>
  <nav class="m-nav" aria-label="게시판"><div class="wrap">
    <a class="jua ${active === "home" ? "on" : ""}" href="#/">🏠 홈</a>${Object.entries(BOARDS).map(([k, b]) => `<a class="jua ${active === k ? "on" : ""}" href="#/b/${k}">${b.name}</a>`).join("")}
    <span class="slogan hand">추억은 언제나, 여기에 💛</span>
  </div></nav>
  <div class="y-marquee"><div class="mq-in"><span class="px">* welcome *</span> <span class="jua">오늘도 반짝반짝, 그때 그 시절처럼 ♡</span> <span class="px">* ${kstDate()} *</span></div></div>
</header>
<div class="wrap m-body">
  <div class="col">${main}</div>
  <aside class="col">${aside}</aside>
</div>
<footer class="m-foot"><div class="wrap">
  <span>🏘️ <a href="#/terms">이용약관</a> | <a href="#/privacy"><b>개인정보 처리방침</b></a> | <a href="#/help">이용 규칙·도움말</a></span>
  <span>추억홈피 · 다른 서비스와 관계없는 독립 서비스 · since 2026 ★</span>
  <span class="gray">운영: 상호·대표·사업자등록번호·주소·이메일 실서비스 오픈 때 표시돼요 · 문의: <a href="#/help">운영자에게 알리기</a></span>
</div></footer>`;
}
function welcomeBox() {
  const m = me();
  return m ? `<section class="box welcome"><p><b>${esc(m.nick)}</b>님, 반가워요 ♡</p>
      <a class="btn-h" href="#/h/${m.id}">🏠 내 홈피 가기</a><a class="btn-k" href="#/write">✏ 글쓰기</a>
      <div class="minilinks"><a href="#/h/${m.id}/deco">꾸미기</a><a href="#/my">마이페이지</a><a href="#/go">놀러가기</a></div></section>`
    : `<section class="box welcome"><p>추억홈피에 오신 것을 환영합니다!</p>
      <a class="btn-k" href="#/login">💬 카카오로 시작</a><a class="btn-h" href="#/login">🏠 내 홈피 만들기</a>
      <div class="minilinks"><a href="#/go">홈피 구경하기</a><a href="#/help">도움말</a></div></section>`;
}
function hotBox(title = "이번 주 인기글", n = 5) {
  const list = livePosts().filter(p => !p.notice && !isHidden(p) && Date.now() - new Date(p.at) < 7 * 864e5).sort((a, b) => hotScore(b) - hotScore(a)).slice(0, n);
  return `<section class="box"><div class="box-h"><span class="ic">🔥</span><h2 class="jua" style="font-size:18px">${title}</h2></div>
    <ul class="feed">${list.map((p, i) => `<li><span class="n2">${i + 1}</span><a href="#/p/${p.id}">${esc(maskBad(p.title))}</a></li>`).join("") || `<li>아직 없어요</li>`}</ul></section>`;
}
const banner = () => `<a class="banner" href="${me() ? `#/h/${me().id}/deco` : "#/login"}"><h3 class="jua">그때 감성으로<br>내 홈피 만들기 ›</h3><img src="img/p_gyaru.png" alt=""><div class="grass">그때의 나를 만나보세요 ✨</div></a>`;
const empty = (msg, btn = "") => `<div class="empty5"><img src="img/i_cloud.png" alt=""><p>${msg}</p>${btn}</div>`;

// ---------- 메인 ----------
VIEWS.home = () => {
  const tab = R.q.tab === "new" ? "new" : "hot";
  const posts = livePosts().filter(p => !p.notice && !isHidden(p));
  const rank = [...posts].sort((a, b) => tab === "new" ? b.at.localeCompare(a.at) : hotScore(b) - hotScore(a)).slice(0, 6);
  const hot = Object.values(DB.users).filter(u => alive(u) && findable(u) && !(u.settings && u.settings.hideVisits)).sort((a, b) => (b.today.d === kst().key ? b.today.n : 0) * 50 + b.total - ((a.today.d === kst().key ? a.today.n : 0) * 50 + a.total)).slice(0, 4);
  const thenList = posts.filter(p => p.board === "then").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  const m = me();
  const feed = m ? DB.feed.filter(f => f.to === m.id && !hiddenFromMe(f.from)).slice(0, 5) : [];
  const main = `
    <section class="box">
      <div class="tabs" role="tablist"><a class="jua ${tab === "hot" ? "on" : ""}" role="tab" aria-selected="${tab === "hot"}" href="#/?tab=hot">인기글</a><a class="jua ${tab === "new" ? "on" : ""}" role="tab" aria-selected="${tab === "new"}" href="#/?tab=new">최신글</a><span class="note">오늘도 좋은 추억이 쌓이고 있어요 :)</span></div>
      <ul class="rank">${rank.map((p, i) => `<li><span class="n">${i + 1}</span><a class="t" href="#/p/${p.id}">${esc(maskBad(p.title))}</a><span class="cmt">💬 ${cmN(p)}</span></li>`).join("")}</ul>
    </section>
    <section class="box">
      <div class="box-h"><span class="ic">👑</span><h2 class="jua">오늘 인기 홈피</h2><span class="note">추억은 늘 좋은 사람들에게서 :)</span><a class="more" href="#/go">놀러가기 ›</a></div>
      <div class="cards">${hot.map(u => `<a class="card" href="#/h/${u.id}"><img class="av" src="${avSrc(u.id)}" alt=""><b class="jua">${esc(u.nick)}</b><p>${esc(u.intro)}</p><div class="foot"><span>${u.today.d === kst().key && u.today.n ? `오늘 <span class="or">${num(u.today.n)}</span>명` : `지금까지 <span class="or">${num(u.total)}</span>명`}</span><span class="homebtn">🏠</span></div></a>`).join("")}</div>
    </section>
    <section class="box">
      <div class="box-h"><span class="ic">📋</span><h2 class="jua">그때 그 시절</h2><span class="sub">그리운 그 시절의 이야기를 함께 나눠요.</span><a class="more" href="#/b/then" style="margin-left:auto">더보기 ›</a></div>
      ${boardTable(thenList, false)}
    </section>`;
  const aside = welcomeBox() + `
    <section class="box">
      <div class="box-h"><span class="ic">💠</span><h2 class="jua" style="font-size:18px">${m ? "내 새소식" : "새로 올라온 글"}</h2>${m ? `<a class="more" href="#/my" style="margin-left:auto">더보기 ›</a>` : ""}</div>
      <ul class="feed">${m
        ? feed.map(f => `<li><img class="av" src="${avSrc(f.from)}" alt=""><a href="${esc(f.link)}"><b>${esc(nick(f.from))}</b> ${esc(f.text)}</a><span class="ago">${ago(f.at)}</span></li>`).join("") || `<li>아직 새소식이 없어요. 단짝을 불러 볼까요?</li>`
        : [...posts].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5).map(p => `<li><img class="av" src="${avSrc(p.author)}" alt=""><a href="#/p/${p.id}"><b>${esc(nick(p.author))}</b> 님이 새 글을 남겼어요.</a><span class="ago">${ago(p.at)}</span></li>`).join("")}</ul>
    </section>` + banner() + `
    <section class="box"><div class="box-h"><span class="ic">📒</span><h2 class="jua" style="font-size:18px">오늘의 한마디</h2></div>
      <div class="saying"><p>그 시절의 우리가 있었기에,<br>지금의 우리가 있습니다. :)</p><img src="img/i_mp3.png" alt=""></div></section>`;
  return { body: "v4p y5p", title: "좋은 사람들과 다시, 그때로", html: portal("home", main, aside) };
};

function boardTable(list, withNo = true, emptyMsg = "아직 글이 없어요. 첫 글을 남겨 주세요 ♡") {
  const rows = list.map(p => {
    const hid = isHidden(p), title = hid ? `<span class="gray">🚫 신고로 잠시 가려진 글이에요</span>` : esc(maskBad(p.title));
    const link = hid && !canManage(p) ? title : `<a href="#/p/${p.id}">${title}</a>`;
    return `<tr class="${p.notice ? "notice" : ""}"><td class="gray hide-m">${p.notice ? `<span class="tag t-not">공지</span>` : withNo ? p.id : ""}</td><td>${p.notice ? "" : `<span class="tag ${tagCls(p.board, p.cat)}">${esc(p.cat)}</span>`}</td>
      <td>${p.notice ? `<b>${link}</b>` : link}${cmN(p) ? ` <span class="or">[${cmN(p)}]</span>` : ""}${p.photos.length ? " 📷" : ""}${p.scope && p.scope !== "all" ? ` <span class="gray">(${scopeLabel(p.scope)})</span>` : ""}</td>
      <td class="hide-m">${user(p.author)?.admin ? esc(nick(p.author)) : `<a href="#/h/${p.author}">${esc(nick(p.author))}</a>`}</td><td class="gray hide-m">${md(p.at)}</td><td class="gray hide-m">${p.notice ? "-" : num(p.views)}</td></tr>`;
  }).join("");
  return `<table class="board"><thead><tr><th class="hide-m">번호</th><th>분류</th><th>제목</th><th class="hide-m">작성자</th><th class="hide-m">작성일</th><th class="hide-m">조회</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="6">${empty(emptyMsg)}</td></tr>`}</tbody></table>`;
}

// ---------- 게시판 ----------
const PER = 10;
VIEWS.board = bid => {
  const b = board(bid); if (!b) return null;
  const cat = b.cats.includes(R.q.cat) ? R.q.cat : "전체", sort = ["new", "hot", "cmt"].includes(R.q.sort) ? R.q.sort : "new";
  const q = (R.q.q || "").trim().toLowerCase(), field = R.q.f === "title" ? "title" : "all";
  let list = livePosts().filter(p => p.board === bid && !p.notice && (cat === "전체" || p.cat === cat));
  if (q) list = list.filter(p => p.title.toLowerCase().includes(q) || (field === "all" && p.body.toLowerCase().includes(q)));
  list.sort((a, c) => sort === "hot" ? hotScore(c) - hotScore(a) : sort === "cmt" ? c.comments.length - a.comments.length : c.at.localeCompare(a.at));
  const pages = Math.max(1, Math.ceil(list.length / PER)), page = Math.min(pages, Math.max(1, +R.q.page || 1));
  const notices = livePosts().filter(p => p.board === bid && p.notice);
  const shown = [...(page === 1 && !q ? notices : []), ...list.slice((page - 1) * PER, page * PER)];
  const canWrite = !b.adminOnly || me()?.admin;
  const main = `
    <section class="box">
      <div class="box-h"><span class="ic">📋</span><h2 class="jua">${b.name}</h2><span class="sub">${b.desc}</span></div>
      <div class="bbar">
        <div class="chips">${["전체", ...b.cats].map(c => `<a class="${c === cat ? "cur" : ""}" href="${withQ({ cat: c === "전체" ? "" : c, page: "" })}">${c}</a>`).join("")}</div>
        <div class="bbar-r"><label class="sr">정렬</label><select class="sel5" data-change="sort" aria-label="정렬"><option value="new" ${sort === "new" ? "selected" : ""}>최신순</option><option value="hot" ${sort === "hot" ? "selected" : ""}>인기순</option><option value="cmt" ${sort === "cmt" ? "selected" : ""}>댓글순</option></select>
          ${canWrite ? `<a class="pbtn sm" href="#/write?b=${bid}">✏ 글쓰기</a>` : ""}</div>
      </div>
      ${q ? `<p class="qnote">“${esc(R.q.q)}” 검색 결과 ${list.length}건 · <a href="${withQ({ q: "", page: "" })}">검색 지우기</a></p>` : ""}
      ${boardTable(shown, true, q ? `“${esc(R.q.q)}” 검색 결과가 없어요.${cat !== "전체" ? ` (지금 ‘${esc(cat)}’ 분류 안에서만 찾았어요)` : ""}` : undefined)}
      <div class="pager">${page > 1 ? `<a href="${withQ({ page: page - 1 })}">‹ 이전</a>` : ""}${Array.from({ length: pages }, (_, i) => `<a class="${i + 1 === page ? "cur" : ""}" href="${withQ({ page: i + 1 })}">${i + 1}</a>`).join("")}${page < pages ? `<a href="${withQ({ page: page + 1 })}">다음 ›</a>` : ""}</div>
      <form class="bsearch" data-form="bsearch"><select class="sel5" name="f" aria-label="검색 범위"><option value="all">제목+내용</option><option value="title" ${field === "title" ? "selected" : ""}>제목</option></select><input class="bs-in" name="q" value="${esc(R.q.q || "")}" placeholder="이 게시판에서 검색" maxlength="40" aria-label="게시판 검색어"><button class="pbtn sm">검색</button></form>
    </section>`;
  return { body: "v4p y5p", title: b.name, html: portal(bid, main, welcomeBox() + hotBox() + banner()) };
};
CHG.sort = el => go(withQ({ sort: el.value, page: "" }));
FORM.bsearch = (f, d) => go(withQ({ q: (d.get("q") || "").trim(), f: d.get("f"), page: "" }));
FORM.search = (f, d) => { const q = (d.get("q") || "").trim(); if (!q) return toast("검색어를 넣어 주세요."); go(`#/search?q=${encodeURIComponent(q)}`); };

// ---------- 글 보기 ----------
VIEWS.post = id => {
  const p = DB.posts.find(x => x.id === id);
  if (!p || p.deleted || !alivePostAuthor(p)) return { body: "v4p y5p", title: "글 없음", html: portal("", `<section class="box">${empty("지워졌거나 없는 글이에요.", `<a class="pbtn" href="#/">처음으로</a>`)}</section>`, welcomeBox()) };
  if (!canSee(p.scope || "all", p.author) || hiddenFromMe(p.author)) return { body: "v4p y5p", title: "볼 수 없는 글", html: portal(p.board, `<section class="box">${empty(p.scope === "friends" && !hiddenFromMe(p.author) ? "단짝에게만 보이는 글이에요." : "볼 수 없는 글이에요.", `<a class="pbtn" href="#/b/${p.board}">목록으로</a>`)}</section>`, welcomeBox()) };
  const hid = isHidden(p), m = me();
  if (hid && !canManage(p)) return { body: "v4p y5p", title: "가려진 글", html: portal(p.board, `<section class="box">${empty("신고가 들어와 잠시 가려진 글이에요. (최대 30일)", `<a class="pbtn" href="#/b/${p.board}">목록으로</a>`)}</section>`, welcomeBox()) };
  try { const seen = JSON.parse(sessionStorage.getItem("seen") || "[]"); if (!seen.includes(id)) { p.views++; seen.push(id); sessionStorage.setItem("seen", JSON.stringify(seen)); save(); } } catch (e) {}
  const a = user(p.author), b = BOARDS[p.board] || { name: "게시판" };
  const sib = livePosts().filter(x => x.board === p.board && !x.notice && !isHidden(x)).sort((x, y) => y.at.localeCompare(x.at));
  const i = sib.findIndex(x => x.id === id), prev = i > 0 ? sib[i - 1] : null, next = i >= 0 && i < sib.length - 1 ? sib[i + 1] : null;
  const liked = m && p.likes.includes(m.id), disliked = m && p.dislikes.includes(m.id), scrapped = m && p.scraps.includes(m.id);
  const main = `
    <article class="box post">
      ${hid ? `<div class="warn5">🚫 신고(${esc(REPORT_REASONS[p.hidden.reason]?.[0] || "")})로 ${md(p.hidden.until)}까지 다른 사람에게 가려져 있어요. ${m && m.id === p.author ? appealBtn(p) : ""}</div>` : ""}
      <div class="crumb"><a href="#/b/${p.board}">📋 ${b.name}</a> › <span class="tag ${tagCls(p.board, p.cat)}">${esc(p.cat)}</span>${p.scope === "friends" ? ` <span class="gray">단짝 공개</span>` : ""}</div>
      <h1 class="jua">${esc(maskBad(p.title))}</h1>
      <div class="author"><img class="av" src="${avSrc(p.author)}" alt="">
        <div><b>${esc(nick(p.author))}</b> ${a && !a.admin ? `<a class="go" href="#/h/${p.author}">🏠 홈피 놀러가기</a>` : ""}<div class="meta">${mdt(p.at)}${p.edited ? " (수정됨)" : ""} · 조회 ${num(p.views)} · 추천 ${num(likeN(p))} · 댓글 ${cmN(p)}</div></div></div>
      <div class="pbody">${para(p.body)}
        ${p.link ? `<p>🔗 <a class="lnk" href="${esc(safeUrl(p.link))}" target="_blank" rel="noopener noreferrer nofollow">${esc(p.link)}</a></p>` : ""}
        ${p.photos.map(s => `<figure class="pol big"><div class="ph"><img src="${safeSrc(s)}" alt="첨부 사진"></div></figure>`).join("")}</div>
      <div class="vote"><a href="#" role="button" class="up ${liked ? "on" : ""}" data-act="like" data-id="${p.id}" aria-pressed="${!!liked}"><b>${num(likeN(p))}</b>추천 ♡</a><a href="#" role="button" class="${disliked ? "on" : ""}" data-act="dislike" data-id="${p.id}" aria-pressed="${!!disliked}"><b>${p.dislikes.length}</b>비추천</a></div>
      <div class="ptools"><a class="pbtn ghost sm" href="#/b/${p.board}">목록</a><button class="pbtn ghost sm ${scrapped ? "on" : ""}" data-act="scrap" data-id="${p.id}">${scrapped ? "스크랩됨 ✔" : "스크랩"}</button><button class="pbtn ghost sm" data-act="tohompy" data-id="${p.id}">내 홈피에 담기</button>
        <span class="sp"></span>${canManage(p) ? `<a class="pbtn ghost sm" href="#/write/${p.id}">수정</a><button class="pbtn ghost sm" data-act="delpost" data-id="${p.id}">삭제</button>` : `<a class="pbtn ghost sm" href="#/report/${p.id}">신고</a>`}</div>
      <h2 class="cmh jua">💬 댓글 ${cmN(p)}</h2>
      ${p.comments.filter(c => !hiddenFromMe(c.author)).map(c => `<div class="cm" id="c-${c.id}"><img class="av" src="${avSrc(c.author)}" alt=""><div><div class="who"><b>${esc(nick(c.author))}</b> ${c.author === p.author ? `<span class="op">글쓴이</span>` : user(c.author) && !user(c.author).admin ? `<a class="go" href="#/h/${c.author}" aria-label="${esc(nick(c.author))} 홈피">🏠</a>` : ""} <span class="d">${mdt(c.at)}</span></div>
        <p>${!seeHidden(c) ? `<span class="gray">🚫 신고로 잠시 가려진 댓글이에요.</span>` : `${isHidden(c) ? `<span class="gray">(신고로 다른 사람에게 가려짐)</span> ` : ""}${esc(shown(c.author, c.text))}`}</p><div class="acts"><button class="lnkbtn" data-act="clike" data-id="${p.id}" data-c="${c.id}">추천 ${(c.likeBase || 0) + c.likes.length}</button> · ${m && (m.id === c.author || m.admin) ? `<button class="lnkbtn" data-act="cdel" data-id="${p.id}" data-c="${c.id}">삭제</button>` : `<a href="#/report/${p.id}/${c.id}">신고</a>${m ? ` · <button class="lnkbtn" data-act="block" data-id="${c.author}">차단</button>` : ""}`}${isHidden(c) && m && m.id === c.author ? ` · ${appealBtn(c)}` : ""}</div></div></div>`).join("") || `<p class="gray">첫 댓글을 남겨 주세요 :)</p>`}
      <form class="cw" data-form="comment" data-id="${p.id}"><textarea class="inp5 grow" name="text" maxlength="500" rows="2" placeholder="${m ? "댓글을 남기면 내 홈피 주소도 같이 보여요 :)" : "로그인하고 댓글을 남겨 주세요"}" aria-label="댓글"></textarea><button class="pbtn sm">등록</button></form>
      <ul class="pn">${prev ? `<li><span>▲ 이전글</span><a href="#/p/${prev.id}">${esc(prev.title)}</a></li>` : ""}${next ? `<li><span>▼ 다음글</span><a href="#/p/${next.id}">${esc(next.title)}</a></li>` : ""}</ul>
    </article>`;
  const aside = a && !a.admin ? `<section class="box hp-card"><img class="av" src="${avSrc(a.id)}" alt=""><b class="jua">${esc(a.title)}</b><p class="hand">${esc(a.intro)}</p>
      ${a.settings.hideVisits && !(me() && me().id === a.id) ? "" : `<div>오늘 <span class="or">${num(a.today.d === kst().key ? a.today.n : 0)}</span>명 · 지금까지 ${num(a.total)}명</div>`}<a class="btn-h" href="#/h/${a.id}">🏠 놀러가기</a></section>` + hotBox("이번 주 인기글", 3) : welcomeBox() + hotBox();
  return { body: "v4p y5p", title: p.title, html: portal(p.board, main, aside) };
};
function toggle(arr, v) { const i = arr.indexOf(v); i < 0 ? arr.push(v) : arr.splice(i, 1); return i < 0; }
const postOf = el => DB.posts.find(p => p.id === el.dataset.id);
ACT.like = el => { if (needLogin()) return; const p = postOf(el); if (p.author === me().id) return toast("내 글은 추천할 수 없어요."); if (toggle(p.likes, me().id)) { p.dislikes = p.dislikes.filter(x => x !== me().id); addFeed(p.author, me().id, "님이 내 글을 추천했어요.", `#/p/${p.id}`); } save(); refresh(); };
ACT.dislike = el => { if (needLogin()) return; const p = postOf(el); if (p.author === me().id) return toast("내 글은 비추천할 수 없어요."); if (toggle(p.dislikes, me().id)) p.likes = p.likes.filter(x => x !== me().id); save(); refresh(); };
ACT.scrap = el => { if (needLogin()) return; const on = toggle(postOf(el).scraps, me().id); save(); toast(on ? "스크랩했어요. 마이페이지에서 볼 수 있어요." : "스크랩을 뺐어요."); refresh(); };
ACT.tohompy = el => {
  if (needLogin()) return;
  const p = postOf(el);
  if (DB.diaries.some(d => d.owner === me().id && d.from === p.id)) return toast("이미 내 홈피 기록에 담았어요.");
  DB.diaries.unshift({ id: uid("d"), owner: me().id, title: `[담아온 글] ${p.title}`, body: `${nick(p.author)} 님의 글을 담았어요.`, from: p.id, mood: me().mood, weather: "맑음", scope: me().settings.scope, at: nowISO(), likes: [], comments: [] });
  save(); toast("내 홈피 기록에 담았어요 ♡");
};
ACT.delpost = el => modal({ title: "글 지우기", body: "<p>이 글을 지울까요? 지운 글은 되살릴 수 없어요.</p>", ok: "지우기", danger: true, onOk: () => { const p = postOf(el); if (!canManage(p)) return; p.deleted = nowISO(); save(); toast("글을 지웠어요."); go(`#/b/${p.board}`); } });
ACT.clike = el => { if (needLogin()) return; const c = postOf(el).comments.find(x => x.id === el.dataset.c); if (c.author === me().id) return toast("내 댓글은 추천할 수 없어요."); toggle(c.likes, me().id); save(); refresh(); };
ACT.cdel = el => modal({ title: "댓글 지우기", body: "<p>이 댓글을 지울까요?</p>", ok: "지우기", danger: true, onOk: () => { const p = postOf(el), c = p.comments.find(x => x.id === el.dataset.c), m = me(); if (!c || !m || (m.id !== c.author && !m.admin)) return; p.comments = p.comments.filter(c => c.id !== el.dataset.c); save(); refresh(); } });
FORM.comment = (f, d) => {
  if (needLogin()) return;
  const text = (d.get("text") || "").trim(); if (text.length < 1) return toast("댓글 내용을 써 주세요.");
  const p = DB.posts.find(x => x.id === f.dataset.id);
  if (!p || p.deleted || !canSee(p.scope || "all", p.author) || hiddenFromMe(p.author)) return toast("볼 수 없는 글이에요.");
  p.comments.push({ id: uid("c"), author: me().id, text: text.slice(0, 500), at: nowISO(), likes: [], likeBase: 0 });
  if (user(p.author)?.settings?.notify?.comment !== false) addFeed(p.author, me().id, "님이 내 글에 댓글을 남겼어요.", `#/p/${p.id}`);
  save(); refresh();
};
ACT.appeal = el => modal({ title: "이의 신청", body: `<p class="gray">왜 가리면 안 되는지 적어 주세요. 운영자가 확인하고 알려 드려요.</p><textarea class="inp5 grow tall" name="t" required minlength="5" maxlength="500"></textarea>`, ok: "신청하기",
  onOk: d => { const r = DB.reports.find(x => x.id === el.dataset.id); if (!r || !me() || reportOwner(r) !== me().id) return; r.status = "이의 신청"; r.log.push({ at: nowISO(), text: "이의 신청: " + d.get("t") }); save(); toast("이의 신청을 접수했어요. 데모라 실제 운영자에게는 전달되지 않아요."); refresh(); } });

// ---------- 글쓰기·수정 ----------
let W = null;  // 쓰는 중인 글 (사진 첨부 때문에 화면 밖에 둔다)
VIEWS.write = editId => {
  const m = me(); if (!m) return { redirect: `#/login?next=${encodeURIComponent(location.hash)}` };
  const edit = editId ? DB.posts.find(p => p.id === editId && !p.deleted) : null;
  if (editId && (!edit || !canManage(edit))) return null;
  // 다른 게시판의 '글쓰기'로 들어오면(쓰던 내용이 없을 때) 그 게시판으로 새로 시작
  const blank = W && W.key === "new" && !W.fromDraft && !W.title && !W.body && !W.photos.length;
  if (!W || W.key !== (editId || "new") || (blank && board(R.q.b) && R.q.b !== W.board)) {
    const dr = !edit && DB.drafts[m.id];
    W = edit ? { key: editId, board: edit.board, cat: edit.cat, title: edit.title, body: edit.body, link: edit.link, scope: edit.scope || "all", photos: [...edit.photos], hompy: false }
      : dr ? { ...dr, key: "new", fromDraft: true } : { key: "new", board: board(R.q.b) ? R.q.b : "then", cat: "", title: "", body: "", link: "", scope: m.settings.scope, photos: [], hompy: false };
  }
  const boards = Object.entries(BOARDS).filter(([, b]) => !b.adminOnly || m.admin);
  if (!boards.some(([k]) => k === W.board)) W.board = "then";
  const cats = BOARDS[W.board].cats;
  const main = `
    <section class="box">
      <div class="box-h"><span class="ic">✏</span><h2 class="jua">${edit ? "글 고치기" : "글쓰기"}</h2><span class="sub">${BOARDS[W.board].name}</span></div>
      ${W.fromDraft ? `<div class="warn5">임시저장한 글을 불러왔어요. <button class="lnkbtn" data-act="dropdraft">새로 쓰기</button></div>` : ""}
      <form class="frm" data-form="write" id="wform">
        <div class="frow"><label for="wb">게시판</label><select class="sel5" id="wb" name="board" data-change="wboard" ${edit ? "disabled" : ""}>${boards.map(([k, b]) => `<option value="${k}" ${k === W.board ? "selected" : ""}>${b.name}</option>`).join("")}</select>
          <label for="wc">말머리</label><select class="sel5" id="wc" name="cat">${cats.map(c => `<option ${c === W.cat ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <div class="frow"><label for="wt">제목</label><input class="inp5 grow" id="wt" name="title" value="${esc(W.title)}" maxlength="60" required placeholder="제목 (2~60자)"></div>
        <textarea class="edit5 hand" name="body" maxlength="5000" required placeholder="그 시절 이야기를 들려주세요 ♡ (5자 이상)" aria-label="내용">${esc(W.body)}</textarea>${SAFE_NOTE}
        <div class="att" id="watt">${W.photos.map((s, i) => `<span class="th"><img src="${safeSrc(s)}" alt="첨부 ${i + 1}"><button type="button" class="x" data-act="wrmphoto" data-i="${i}" aria-label="사진 빼기">×</button></span>`).join("")}
          ${W.photos.length < 4 ? `<label class="addph" title="사진 추가">+<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple data-change="wphoto" class="sr" aria-label="사진 추가 (최대 4장)"></label>` : ""}</div>
        <p class="ob-note">사진은 올리기 전에 작게 줄이고, 사진 속 촬영 위치 정보는 지워져요.</p>
        <div class="frow"><label for="wl">🔗 링크</label><input class="inp5 grow" id="wl" name="link" value="${esc(W.link)}" placeholder="https:// (선택 — 노래는 공식 영상 링크만)" maxlength="300"></div>
        <div class="warn5">📷 다른 사람이 나온 사진은 그 사람의 동의를 받고 올려 주세요. 신고가 들어오면 30일 동안 가려질 수 있어요.</div>
        <div class="frow"><label>공개</label>${SCOPES.map(([v, t]) => `<label class="rad"><input type="radio" name="scope" value="${v}" ${W.scope === v ? "checked" : ""}>${t}</label>`).join("")}
          ${edit ? "" : `<label class="chk"><input type="checkbox" name="hompy" aria-label="내 홈피에도 담기" ${W.hompy ? "checked" : ""}> 내 홈피에도 담기</label>`}</div>
        <div class="dact5">${edit ? `<a class="bv" href="#/p/${edit.id}">취소</a>` : `<button type="button" class="bv" data-act="draft">임시저장</button>`}<button class="bv pri">${edit ? "고치기 ♡" : "올리기 ♡"}</button></div>
      </form>
    </section>`;
  const aside = `<section class="box"><div class="box-h"><span class="ic">📋</span><h2 class="jua" style="font-size:18px">글쓰기 규칙</h2></div>
      <ul class="rule5"><li>남의 사진·실명은 올리지 않아요</li><li>광고·판매 글은 지워져요</li><li>욕설·비방은 신고 대상이에요</li><li>음원 파일 대신 공식 영상 링크만</li></ul></section>`;
  return { body: "v4p y5p", title: "글쓰기", html: portal(W.board, main, aside) };
};
function grabW() { const f = $("#wform"); if (!f || !W) return; const d = new FormData(f); Object.assign(W, { cat: d.get("cat"), title: d.get("title"), body: d.get("body"), link: d.get("link"), scope: d.get("scope"), hompy: !!d.get("hompy") }); }
CHG.wboard = el => { grabW(); W.board = el.value; W.cat = ""; refresh(); };
CHG.wphoto = async el => {
  grabW();
  for (const f of [...el.files].slice(0, 4 - W.photos.length)) { try { W.photos.push(await readImage(f)); } catch (e) { toast(e.message); } }
  refresh();
};
ACT.wrmphoto = el => { grabW(); W.photos.splice(+el.dataset.i, 1); refresh(); };
ACT.draft = () => { grabW(); const { key, fromDraft, ...d } = W; DB.drafts[me().id] = d; if (save()) toast("임시저장했어요. 다음에 글쓰기를 누르면 이어서 쓸 수 있어요."); };
ACT.dropdraft = () => { delete DB.drafts[me().id]; save(); W = null; refresh(); };
FORM.write = () => {
  grabW();
  const t = (W.title || "").trim(), b = (W.body || "").trim(), l = (W.link || "").trim();
  if (t.length < 2) return toast("제목을 2자 이상 써 주세요.");
  if (b.length < 5) return toast("내용을 5자 이상 써 주세요.");
  if (l && !safeUrl(l)) return toast("링크는 https:// 로 시작하는 주소만 넣을 수 있어요.");
  if (isAudio(l)) return toast("음원 파일 링크는 걸 수 없어요. 공식 영상 링크를 넣어 주세요.");
  const m = me();
  if (W.key !== "new") {
    const p = DB.posts.find(x => x.id === W.key);
    if (!p || !canManage(p)) return toast("내 글만 고칠 수 있어요.");
    Object.assign(p, { cat: W.cat, title: t, body: b, link: l, scope: W.scope, photos: W.photos, edited: nowISO() });
    if (!save()) return;
    W = null; toast("고쳤어요."); return go(`#/p/${p.id}`);
  }
  const id = String(Math.max(4300, ...DB.posts.map(p => +p.id || 0)) + 1);
  DB.posts.push({ id, board: W.board, cat: W.cat || BOARDS[W.board].cats[0], title: t, body: b, author: m.id, at: nowISO(), views: 0, likeBase: 0, likes: [], dislikes: [], scraps: [], photos: W.photos, link: l, scope: W.scope, comments: [], notice: W.board === "notice" });
  if (W.hompy) DB.diaries.unshift({ id: uid("d"), owner: m.id, title: t, body: b, from: id, mood: m.mood, weather: "맑음", scope: W.scope, at: nowISO(), likes: [], comments: [] });
  delete DB.drafts[m.id];
  if (!save()) return;  // save()가 저장 전 상태로 되돌린다
  W = null; toast("글을 올렸어요 ♡"); go(`#/p/${id}`);
};

// ---------- 신고 (게시글·댓글·앨범 사진·기록·방문록) ----------
// 대상 주소: #/report/<글id>, #/report/<글id>/<댓글id>, #/report/photo:<id> · diary:<id> · guest:<id>
function rTarget(r) {
  if (r.type === "user") { const u = user(r.tid); return u ? { obj: u, author: u.id, title: `${u.nick}님 (사람 신고)`, where: "사용자", at: u.joinedAt || nowISO(), link: `#/h/${u.id}`, gone: !alive(u) || !!u.admin } : null; }
  if (r.type === "post" || r.type === "comment") {
    const p = DB.posts.find(x => x.id === r.pid); if (!p) return null;
    if (r.type === "post") return { obj: p, author: p.author, title: p.title, img: p.photos[0], where: board(p.board)?.name || "게시판", at: p.at, link: `#/p/${p.id}`, gone: !!p.deleted };
    const c = p.comments.find(x => x.id === r.cid); if (!c) return null;
    return { obj: c, parent: p, author: c.author, title: c.text, where: `${board(p.board)?.name || "게시판"} 댓글`, at: c.at, link: `#/p/${p.id}`, gone: false };
  }
  const list = { photo: DB.photos, diary: DB.diaries, guest: DB.guests }[r.type]; if (!list) return null;
  const o = list.find(x => x.id === r.tid); if (!o) return null;
  const owner = o.owner, author = r.type === "guest" ? o.author : o.owner;
  return { obj: o, list: r.type, author, title: o.caption || o.title || o.text, img: r.type === "photo" ? o.src : null, where: `${nick(owner)}의 ${{ photo: "앨범", diary: "기록", guest: "방문록" }[r.type]}`, at: o.at,
    link: r.type === "photo" ? `#/h/${owner}/photo` : r.type === "diary" ? `#/h/${owner}/diary?d=${o.id}` : `#/h/${owner}/guest`, gone: false };
}
const reportOwner = r => rTarget(r)?.author;
// 가려진 것의 주인에게 보이는 이의 신청 버튼
const appealBtn = o => { const r = DB.reports.find(x => x.id === o.hidden?.rid); return !r ? "" : r.status === "이의 신청" ? `<span class="gray">이의 신청 접수됨</span>` : `<button class="lnkbtn" data-act="appeal" data-id="${r.id}">이의 신청</button>`; };
// 가려진 것: 쓴 사람·운영자만 보고, 나머지에겐 숨긴다(최대 30일)
const seeHidden = o => { const m = me(); return !isHidden(o) || (m && (m.admin || m.id === (o.author || o.owner))); };
function parseReportPath(a, b) {
  if (a && a.includes(":")) { const [type, tid] = a.split(":"); return ["photo", "diary", "guest", "user"].includes(type) ? { type, tid } : null; }
  return b ? { type: "comment", pid: a, cid: b } : { type: "post", pid: a };
}
VIEWS.report = (a, b) => {
  const m = me(); if (!m) return { redirect: `#/login?next=${encodeURIComponent(location.hash)}` };
  const spec = parseReportPath(a, b), t = spec && rTarget(spec);
  if (!t || t.gone) return null;
  const isUser = spec.type === "user", RS = isUser ? USER_REPORT_REASONS : REPORT_REASONS, canBlock = t.author !== m.id && !user(t.author)?.admin && !blocked(m.id, t.author);
  const main = `
    <section class="box">
      <div class="box-h"><span class="ic">🚨</span><h2 class="jua">${isUser ? "사람 신고하기" : "신고하기"}</h2><span class="sub">${esc(t.where)}</span></div>
      <form class="frm" data-form="report" data-spec="${esc(JSON.stringify(spec))}">
        <div class="rp-target"><img src="${t.img ? safeSrc(t.img) : charSrc(t.author)}" alt=""><div><b>${esc(t.title)}</b><em>${esc(t.where)} · ${esc(nick(t.author))} · ${md(t.at)}</em></div></div>
        <fieldset class="rp-list"><legend class="sr">신고 사유 (하나 고르기)</legend>${Object.entries(RS).map(([k, [tx]]) => `<label class="rad"><input type="radio" name="reason" value="${k}" required>${tx}</label>`).join("")}</fieldset>
        <textarea class="inp5 grow tall" name="detail" maxlength="500" placeholder="어떤 부분이 문제인지 알려 주세요 (권리 침해·기타는 꼭 써 주세요)" aria-label="자세한 내용"></textarea>
        ${isUser ? `<div class="warn5">사람 신고는 운영자가 그 사람이 쓴 글·댓글·방문록을 확인해요. 신고한 사람이 누군지는 상대에게 알리지 않아요.</div>` : `<div class="warn5">권리 침해(초상권·아이 사진·저작권·괴롭힘·저격·신상 노출) 신고는 바로 가려지고(최대 30일), 쓴 사람에게 알림이 가요. 쓴 사람은 이의를 신청할 수 있어요.</div>`}
        ${canBlock ? `<label class="chk"><input type="checkbox" name="autoblock" checked><span>🚫 신고하면서 <b>${esc(nick(t.author))}</b>님 차단하기<br><small class="gray">차단하면 서로의 홈피·글·댓글·방문록이 안 보이고, 단짝이면 단짝이 끊어져서 상대가 알 수도 있어요. 마이페이지 › 안심 설정에서 풀 수 있어요.</small></span></label>` : ""}
        <p class="warn5 strong">⚠ ${REPORT_WARN}</p>
        <div class="dact5"><a class="bv" href="${t.link}">취소</a><button class="bv pri">신고하기</button></div>
      </form>
    </section>`;
  return { body: "v4p y5p", title: "신고하기", html: portal("", main, `<section class="box"><div class="box-h"><span class="ic">🛡</span><h2 class="jua" style="font-size:18px">신고는 이렇게 처리돼요</h2></div><ul class="rule5"><li>권리 침해 → 바로 가림(최대 30일)</li><li>그 밖의 신고 → 운영자 검토</li><li>신고하면서 그 사람을 차단할 수 있어요(기본 켬)</li><li>쓴 사람은 이의 신청 가능</li><li>근거 없는 의도적 신고는 조치될 수 있어요</li><li>처리 기록은 모두 남겨요</li></ul></section>`) };
};
FORM.report = (f, d) => {
  const m = me(), spec = JSON.parse(f.dataset.spec), t = rTarget(spec);
  if (!t) return toast("이미 지워진 내용이에요.");
  if (t.author === m.id) return toast("내가 쓴 건 신고할 수 없어요. 고치거나 지울 수 있어요.");
  const already = eitherBlocked(m.id, t.author);  // 차단한 사이여도 신고는 받는다(먼저 차단하고 나중에 신고하는 피해자). 대신 바로 가림은 하지 않는다
  const RS = spec.type === "user" ? USER_REPORT_REASONS : REPORT_REASONS;
  const reason = d.get("reason"); if (!RS[reason]) return toast("신고 사유를 하나 골라 주세요.");
  const right = RS[reason][1], detail = (d.get("detail") || "").trim().slice(0, 500);
  if ((right || reason === "etc") && detail.length < 5) return toast("어떤 부분이 문제인지 5자 이상 써 주세요.");
  const same = r => r.type === spec.type && (r.pid || null) === (spec.pid || null) && (r.cid || null) === (spec.cid || null) && (r.tid || null) === (spec.tid || null);
  if (DB.reports.some(r => same(r) && r.reporter === m.id)) return toast("이미 신고했어요. 운영자가 확인 중이에요.");
  // 바로 가림은 운영자·공지 글은 빼고, 같은 사람의 글은 하루 한 번만(나머지는 운영자 검토)
  const today = DB.reports.some(x => x.reporter === m.id && x.status === "가림" && reportOwner(x) === t.author && Date.now() - Date.parse(x.at) < 864e5);
  const quick = right && !user(t.author)?.admin && !t.obj.notice && !today && !already;
  const r = { id: uid("r"), ...spec, reporter: m.id, reason, detail, at: nowISO(), status: quick ? "가림" : "검토 중", log: [] };
  DB.reports.unshift(r);
  if (quick && !isHidden(t.obj)) { t.obj.hidden = { until: new Date(Date.now() + 30 * 864e5).toISOString(), reason, rid: r.id }; r.log.push({ at: nowISO(), text: "권리 침해 신고 — 30일 가림" }); }
  // 신고 순간 상대에게 알림이 가면 신고한 사람을 짐작할 수 있다 — 권리 침해 가림만 알리고, 위치는 '내 신고된 글' 목록에서만 보여 준다
  if (quick && spec.type !== "user") addFeed(t.author, "admin", "님(운영자): 내가 쓴 내용 중 하나가 권리 침해 신고로 잠시 가려졌어요. 마이페이지에서 이의 신청할 수 있어요.", "#/my?sec=myreports");
  const blocked = !!d.get("autoblock") && blockUser(m, t.author);  // 신고하면서 차단(기본 켬, 끌 수 있음 — 사장님 결정 2026-10-27)
  if (blocked) r.log.push({ at: nowISO(), text: "신고한 사람이 자동 차단" });
  save(); toast(`신고했어요.${quick ? " 바로 가렸어요." : ""} 데모라 실제 운영자에게는 전달되지 않아요.${blocked ? ` ${nick(t.author)}님은 차단했어요.` : ""}`);
  go(t.link.startsWith(`#/h/${m.id}`) ? t.link : spec.type === "post" ? `#/b/${t.obj.board}` : spec.type === "comment" && !blocked ? t.link : "#/");  // 내 홈피에서 신고했으면 그대로 내 홈피로
};

// ---------- 운영자(데모) ----------
VIEWS.admin = () => {
  const rows = DB.reports.map(r => {
    const t = rTarget(r);
    return `<tr><td>${md(r.at)}</td><td>${t ? `${esc(t.where)} · <a href="${t.link}">${esc(String(t.title).slice(0, 22))}</a>` : "(지워짐)"}</td><td>${esc(((r.type === "user" ? USER_REPORT_REASONS : REPORT_REASONS)[r.reason] || ["기타"])[0].replace(/ \(.+\)/, ""))}${r.detail ? `<em class="gray"> — ${esc(r.detail.slice(0, 40))}</em>` : ""}</td>
      <td><span class="tag ${{ "가림": "t-pink", "삭제": "t-not", "검토 중": "t-yel", "이의 신청": "t-blue", "되돌림": "t-teal", "기각": "t-pur", "경고": "t-not", "허위 신고": "t-blue" }[r.status] || "t-pur"}">${r.status}</span>${r.log.length ? `<em class="gray"> ${esc(r.log[r.log.length - 1].text.slice(0, 40))}</em>` : ""}</td>
      <td class="acts5">${t && !t.gone ? (r.type === "user" ? ["warn:경고", "reject:기각", "false:허위 신고"] : ["hide:가림", "restore:되돌림", "delete:삭제", "reject:기각", "false:허위 신고"]).map(x => { const [k, n] = x.split(":"); return `<button class="bv sm" data-act="adm" data-r="${r.id}" data-do="${k}">${n}</button>`; }).join("") : ""}</td></tr>`;
  }).join("");
  const main = `<section class="box"><div class="box-h"><span class="ic">🛡</span><h2 class="jua">운영자 · 신고 처리</h2><span class="sub">데모라 누구나 볼 수 있어요. 실서비스는 운영자만.</span></div>
    <table class="board op5"><thead><tr><th>접수</th><th>대상</th><th>사유</th><th>상태</th><th>처리</th></tr></thead><tbody>${rows || `<tr><td colspan="5">${empty("들어온 신고가 없어요.")}</td></tr>`}</tbody></table>
    <p class="op-note">가림·삭제·알림·이의 신청 기록은 모두 남겨요(정보통신망법 임시조치).</p></section>
    <section class="box"><div class="box-h"><span class="ic">✉</span><h2 class="jua" style="font-size:18px">운영자 문의 ${(DB.contacts || []).length}</h2></div><ul class="feed">${(DB.contacts || []).map(c => `<li><span><b>${esc(nick(c.from))}</b> ${esc(c.where)} — ${esc(c.text.slice(0, 80))}</span><span class="ago">${ago(c.at)}</span></li>`).join("") || `<li class="gray">들어온 문의가 없어요.</li>`}</ul></section>`;
  return { body: "v4p y5p", title: "운영자", html: portal("", main, hotBox()) };
};
ACT.adm = el => {
  const r = DB.reports.find(x => x.id === el.dataset.r), t = r && rTarget(r), act = el.dataset.do;
  if (!t) return toast("대상이 이미 지워졌어요.");
  const author = t.author, link = t.link, mine = t.obj.hidden && t.obj.hidden.rid === r.id;  // 이 신고로 가린 것만 푼다
  if (act === "false") {  // 근거 없는 의도적 신고: 신고한 사람에게 경고, 가린 것은 되돌림
    if (mine) delete t.obj.hidden; r.status = "허위 신고";
    const rp = user(r.reporter); if (rp) rp.falseReports = (rp.falseReports || 0) + 1;
    r.log.push({ at: nowISO(), text: `운영자 허위 신고 처리 — 신고한 사람 경고 ${rp?.falseReports || 1}회` });
    addFeed(r.reporter, "admin", `님(운영자): 확인 결과 근거 없는 신고로 판단돼 경고드려요(${rp?.falseReports || 1}회). 반복되면 이용이 제한될 수 있어요.`, "#/help");
    if (r.type !== "user") addFeed(author, "admin", "님(운영자): 내 글에 들어온 신고는 근거가 없어 처리하지 않았어요.", "#/my?sec=myreports");
    save(); toast("허위 신고로 처리했어요."); return refresh();
  }
  if (act === "warn") { r.status = "경고"; r.log.push({ at: nowISO(), text: "운영자 경고" }); addFeed(author, "admin", "님(운영자): 신고가 확인돼 경고드려요. 반복되면 이용이 제한될 수 있어요.", "#/help"); save(); toast("경고했어요."); return refresh(); }
  if (act === "hide") { t.obj.hidden = { until: new Date(Date.now() + 30 * 864e5).toISOString(), reason: r.reason, rid: r.id }; r.status = "가림"; }
  if (act === "restore" || act === "reject") { if (mine) delete t.obj.hidden; r.status = act === "restore" ? "되돌림" : "기각"; }
  if (act === "delete") {
    if (r.type === "post") t.obj.deleted = nowISO();
    else if (r.type === "comment") t.parent.comments = t.parent.comments.filter(c => c !== t.obj);
    else DB[{ photo: "photos", diary: "diaries", guest: "guests" }[r.type]] = DB[{ photo: "photos", diary: "diaries", guest: "guests" }[r.type]].filter(x => x !== t.obj);
    r.status = "삭제";
  }
  r.log.push({ at: nowISO(), text: `운영자 ${r.status}${(act === "restore" || act === "reject") && !mine && isHidden(t.obj) ? " (다른 신고로 가림 유지)" : ""}` });
  addFeed(author, "admin", `님(운영자): 내 글에 들어온 신고 처리 결과 — ${r.status}`, "#/my?sec=myreports");
  save(); toast(`처리했어요: ${r.status}`); refresh();
};

// ---------- 검색·도움말·없는 화면 ----------
VIEWS.search = () => {
  const q = (R.q.q || "").trim().toLowerCase();
  const posts = q ? livePosts().filter(p => !isHidden(p) && (p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q))).sort((a, b) => b.at.localeCompare(a.at)) : [];
  const homes = q ? Object.values(DB.users).filter(u => alive(u) && findable(u) && (u.nick.toLowerCase().includes(q) || u.title.toLowerCase().includes(q))) : [];
  const main = `<section class="box"><div class="box-h"><span class="ic">🔎</span><h2 class="jua">“${esc(R.q.q || "")}” 검색 결과</h2></div>
    ${homes.length ? `<h3 class="th-h jua">🏠 홈피 ${homes.length}</h3><div class="cards">${homes.slice(0, 8).map(u => `<a class="card" href="#/h/${u.id}"><img class="av" src="${avSrc(u.id)}" alt=""><b class="jua">${esc(u.nick)}</b><p>${esc(u.title)}</p></a>`).join("")}</div>` : ""}
    <h3 class="th-h jua">📋 글 ${posts.length}</h3>${boardTable(posts.slice(0, 30))}</section>`;
  return { body: "v4p y5p", title: "검색", html: portal("", main, welcomeBox()) };
};
VIEWS.help = () => ({ body: "v4p y5p", title: "도움말", html: portal("", `<section class="box"><div class="box-h"><span class="ic">❓</span><h2 class="jua">이용 규칙·도움말</h2></div>
  <ul class="rule5"><li>추억홈피는 다른 서비스와 관계없는 독립 서비스이며, 예전 데이터는 가져오지 않습니다.</li><li>남의 사진·실명은 올리지 않아요. 권리 침해 신고가 들어오면 최대 30일 가려져요.</li><li>광고·판매 글은 지워져요. 욕설·비방은 신고 대상이에요.</li><li>노래는 음원 파일 대신 공식 영상 링크만 걸 수 있어요.</li><li>추억홈피는 <b>만 19세 이상</b>만 가입할 수 있어요.</li><li>신고할 때 그 사람을 함께 차단할 수 있어요(기본 켬). 단짝이면 단짝이 끊어져서 상대가 알 수도 있으니 필요하면 끄고 신고하세요. ${REPORT_WARN}</li><li>이 화면은 데모예요. 데이터는 이 브라우저에만 저장되고, 카카오 로그인은 흉내만 내요.</li></ul></section>
  <section class="box" id="contact"><div class="box-h"><span class="ic">✉</span><h2 class="jua" style="font-size:18px">운영자에게 알리기</h2><span class="sub">볼 수 없게 된 곳(차단 등)의 내 사진·괴롭힘도 여기로 알려 주세요</span></div>
    <form class="frm" data-form="contact"><input class="inp5 grow" name="where" maxlength="120" placeholder="어디서 일어났나요? (예: 홈피 주소, 글 제목)"><textarea class="inp5 grow tall" name="text" maxlength="1000" required placeholder="무슨 일인지 알려 주세요. 신고한 사람이 누군지는 상대에게 알리지 않아요."></textarea>
    <div class="dact5"><button class="bv pri">운영자에게 보내기</button></div></form></section>`, welcomeBox()) });
VIEWS.notFound = () => ({ body: "v4p y5p", title: "없는 화면", html: portal("", `<section class="box">${empty(/^#\/(j|c)(\/|$)/.test(location.hash) ? "이 초대장은 더 이상 쓰지 않아요.<br>친구 홈피 주소로 놀러 가 보세요." : "찾는 화면이 없어요.", `<a class="pbtn" href="#/">처음으로</a>`)}</section>`, welcomeBox()) });
VIEWS.goRandom = () => {
  const list = Object.values(DB.users).filter(u => alive(u) && u.id !== DB.me && findable(u));
  return { redirect: list.length ? `#/h/${list[Math.floor(Math.random() * list.length)].id}` : "#/" };
};
FORM.contact = (f, d) => {
  if (needLogin()) return;
  const text = (d.get("text") || "").trim(); if (text.length < 5) return toast("무슨 일인지 5자 이상 써 주세요.");
  DB.contacts = DB.contacts || []; DB.contacts.unshift({ id: uid("q"), from: me().id, where: (d.get("where") || "").trim().slice(0, 120), text: text.slice(0, 1000), at: nowISO(), status: "접수" });
  save(); toast("접수했어요. 데모라 실제 운영자에게는 전달되지 않아요."); f.reset();
};
ACT.logout = () => { DB.me = null; save(); toast("로그아웃했어요. 또 놀러 와요 ♡"); go("#/"); };

// ---------- 마이페이지 ----------
VIEWS.my = () => {
  const m = me(); if (!m) return { redirect: "#/login?next=%23%2Fmy" };
  const reqs = DB.requests.filter((r, i, all) => r.to === m.id && user(r.from) && !user(r.from).withdrawnAt && !eitherBlocked(m.id, r.from) && all.findIndex(x => x.to === m.id && x.from === r.from) === i);
  const feed = DB.feed.filter(f => f.to === m.id && !hiddenFromMe(f.from)).slice(0, 20);
  const scraps = DB.posts.filter(p => !p.deleted && p.scraps.includes(m.id));
  const mine = DB.posts.filter(p => !p.deleted && p.author === m.id).sort((a, b) => b.at.localeCompare(a.at));
  const s = m.settings, [bm, bd] = (m.birthday.match(/\d+/g) || []).map(Number);
  const main = `
    <section class="box"><div class="box-h"><span class="ic">🏠</span><h2 class="jua">마이페이지</h2></div>
      <div class="my5"><div class="purikura small"><img src="${avSrc(m.id)}" alt=""><span class="px">${esc(m.id)}</span></div>
        <div><b class="jua big">${esc(m.nick)}</b><p>추억홈피.kr/@${esc(m.handle || m.id)} (예시&nbsp;주소) · 카카오 로그인(데모)${m.region ? ` · ${esc(m.region)}` : ""}</p>
          <p><a class="bv" href="#/h/${m.id}/deco?s=pic">📷 프로필 사진 바꾸기</a> <a class="bv sm" href="#/my?sec=safe">🛡 안심 설정 바로 가기</a></p>
          <div class="lcd"><div><span class="px dig">${pad4(m.friends.length)}</span><em>단짝</em></div><div><span class="px dig">${pad4(DB.guests.filter(g => g.owner === m.id).length)}</span><em>방문록</em></div><div><span class="px dig">${pad4(m.beads)}</span><em>내 구슬</em></div></div></div></div>
    </section>
    <section class="box"><div class="box-h"><span class="ic">⚙</span><h2 class="jua" style="font-size:18px">설정</h2></div>
      <form data-form="settings"><table class="ptbl set">
        <tr><th>새 글 공개 기본값</th><td>${SCOPES.map(([v, t]) => `<label class="rad"><input type="radio" name="scope" value="${v}" ${s.scope === v ? "checked" : ""}>${t}</label>`).join("")}</td></tr>
        <tr><th>글씨 크기</th><td>${[["", "보통"], ["1", "크게"]].map(([v, t]) => `<label class="rad"><input type="radio" name="big" value="${v}" ${(s.big ? "1" : "") === v ? "checked" : ""}>${t}</label>`).join("")}</td></tr>
        <tr><th>알림</th><td><label class="chk"><input type="checkbox" name="n_guest" ${s.notify.guest ? "checked" : ""}> 방문록</label> · <label class="chk"><input type="checkbox" name="n_friend" ${s.notify.friend ? "checked" : ""}> 단짝 신청</label> · <label class="chk"><input type="checkbox" name="n_comment" ${s.notify.comment ? "checked" : ""}> 게시판 댓글</label> · <label class="chk"><input type="checkbox" name="n_visit" ${s.notify.visit !== false ? "checked" : ""}> 단짝 방문(놀러왔어요)</label></td></tr>
        <tr><th>방문 기록</th><td><label class="chk"><input type="checkbox" name="hide_visits" ${s.hideVisits ? "checked" : ""}> 오늘·전체 방문자 수를 다른 사람에게 숨기기</label> <em>(나는 계속 볼 수 있어요)</em></td></tr>
        <tr><th>노래 자동 재생</th><td><label class="chk"><input type="checkbox" name="bgm_auto" ${s.bgmAuto !== false ? "checked" : ""}> 다른 홈피에 놀러 가면 그 홈피 노래를 자동으로 틀기</label> <em>(꺼도 ▶️를 누르면 들을 수 있어요)</em></td></tr>
        <tr><th>접속 표시</th><td><label class="chk"><input type="checkbox" name="hide_online" ${s.hideOnline ? "checked" : ""}> 단짝에게도 내 접속 중 숨기기</label> <em>(단짝이 아니면 원래 안 보여요)</em></td></tr>
        <tr><th>홈피 주소</th><td><span class="inp addr sm5"><span class="pre">추억홈피.kr/@</span><input name="handle" value="${esc(m.handle || m.id)}" maxlength="15" data-input="idcheck" aria-label="홈피 주소" aria-describedby="idmsg" autocapitalize="off" spellcheck="false"><span class="ok" id="idmsg" aria-live="polite"></span></span> <em>(예시 주소 · 가입할 때 자동으로 만들었어요. 영문 소문자·숫자·_ 3~15자)</em></td></tr>
        <tr><th>생일 날짜</th><td><select class="sel5" name="bm" aria-label="월"><option value="">월</option>${Array.from({ length: 12 }, (_, i) => `<option ${bm === i + 1 ? "selected" : ""}>${i + 1}</option>`).join("")}</select> <select class="sel5" name="bd" aria-label="일"><option value="">일</option>${Array.from({ length: 31 }, (_, i) => `<option ${bd === i + 1 ? "selected" : ""}>${i + 1}</option>`).join("")}</select> <em>(선택 · 누구에게 보일지는 아래 안심 설정에서)</em></td></tr>
        <tr><th>내 동네</th><td><select class="sel5" name="region" aria-label="내 동네"><option value="">선택 안 함</option>${Object.keys(REGIONS).map(r => `<option ${r === m.region ? "selected" : ""}>${r}</option>`).join("")}</select> <em>(선택 · 창밖 날씨에만 쓰고 다른 사람에겐 안 보여요)</em></td></tr>
        <tr><td colspan="2"><button class="bv pri">설정 저장</button></td></tr>
      </table></form>
      <table class="ptbl set">
        <tr><th>구슬 내역</th><td>${m.beadLog.slice(-4).reverse().map(l => `${esc(l.t)} ${l.n > 0 ? "+" : ""}${l.n}`).join(" · ") || "아직 없어요"} <button class="lnkbtn lnk" data-act="charge">구슬 충전(데모)</button> <em>(유료 ${m.beadLog.filter(l => l.paid).reduce((s, l) => s + l.n, 0)} · 무료 ${m.beadLog.filter(l => !l.paid && l.n > 0).reduce((s, l) => s + l.n, 0)})</em> <button class="lnkbtn lnk" data-act="refund">환불 신청</button></td></tr>
        <tr><th>내 데이터</th><td><button class="bv" data-act="export">글·사진 전체 내려받기 (json)</button></td></tr>
        <tr><th>탈퇴</th><td><button class="lnkbtn lnk gray" data-act="withdraw">회원 탈퇴</button> <em>탈퇴하면 30일 뒤 모든 글·사진이 지워져요. 30일 안에 다시 로그인하면 되살아나요.</em></td></tr>
      </table></section>
    ${safeBox(m)}
    ${(() => { const mine = DB.reports.filter(r => r.type !== "user" && reportOwner(r) === m.id && r.status !== "검토 중"); return mine.length ? `<section class="box" id="myreports"><div class="box-h"><span class="ic">🛡</span><h2 class="jua" style="font-size:18px">내 글에 들어온 신고 ${mine.length}</h2><span class="sub">신고한 사람은 알려 드리지 않아요</span></div><ul class="feed">${mine.map(r => { const t = rTarget(r); return `<li><span><b>${esc(String(t?.title || "(지워짐)").slice(0, 24))}</b> <em class="gray">${esc(t?.where || "")} · ${r.status}</em></span><span class="ago">${t?.obj && isHidden(t.obj) && r.status === "가림" ? appealBtn(t.obj) : ""}</span></li>`; }).join("")}</ul></section>` : ""; })()}
    <section class="box"><div class="box-h"><span class="ic">📝</span><h2 class="jua" style="font-size:18px">내가 쓴 글 ${mine.length} · 스크랩 ${scraps.length}</h2></div>
      ${boardTable([...mine.slice(0, 5), ...scraps.slice(0, 5)])}</section>`;
  const aside = `
    ${reqs.length ? `<section class="box" id="reqs"><div class="box-h"><span class="ic">💞</span><h2 class="jua" style="font-size:18px">받은 단짝 신청 ${reqs.length}</h2>${reqs.length > 1 ? `<button class="bv sm pri" data-act="freqall" style="margin-left:auto">모두 수락</button>` : ""}</div><ul class="feed">${reqs.map(r => `<li><img class="av" src="${avSrc(r.from)}" alt=""><span><a href="#/h/${r.from}"><b>${esc(nick(r.from))}</b></a> ${esc(r.rel || "")}</span><span class="ago"><button class="bv sm pri" data-act="freq" data-id="${r.id}" data-ok="1">수락</button><button class="bv sm" data-act="freq" data-id="${r.id}">거절</button></span></li>`).join("")}</ul></section>` : ""}
    <section class="box"><div class="box-h"><span class="ic">💌</span><h2 class="jua" style="font-size:18px">새 소식</h2><button class="lnkbtn more" data-act="readall" style="margin-left:auto">모두 읽음</button></div>
      <ul class="feed">${feed.map(f => `<li class="${f.read ? "" : "unread"}"><img class="av" src="${avSrc(f.from)}" alt=""><a href="${esc(f.link)}" data-act="openfeed" data-id="${f.id}"><b>${esc(nick(f.from))}</b> ${esc(f.text)}</a><span class="ago">${ago(f.at)}</span></li>`).join("") || `<li>아직 새소식이 없어요.</li>`}</ul></section>`;
  return { body: "v4p y5p", title: "마이페이지", html: portal("", main, aside), after: () => { if (R.q.sec) $("#" + R.q.sec)?.scrollIntoView(); } };
};
FORM.settings = (f, d) => {
  const m = me();
  const h = (d.get("handle") || "").trim().toLowerCase();
  if (h && h !== m.handle) { const [ok, msg] = idState(h, m.id); if (!ok) return toast(`홈피 주소: ${msg}`); if (badWord(h.replace(/_/g, " ")) || badWord(h)) return toast("홈피 주소에 쓸 수 없는 말이 있어요."); }
  const bm = +d.get("bm"), bd = +d.get("bd");
  if ((bm || bd) && !(bm && bd)) return toast("생일은 월과 일을 같이 골라 주세요.");
  if (bm && bd > new Date(2000, bm, 0).getDate()) return toast(`${bm}월에는 ${bd}일이 없어요.`);
  // 검사를 다 통과한 뒤에만 쓴다(오류로 멈춘 값이 나중에 몰래 저장되지 않게)
  m.settings.scope = d.get("scope"); m.settings.big = d.get("big") === "1"; m.settings.notify = { guest: !!d.get("n_guest"), friend: !!d.get("n_friend"), comment: !!d.get("n_comment"), visit: !!d.get("n_visit") }; m.settings.hideVisits = !!d.get("hide_visits"); m.settings.hideOnline = !!d.get("hide_online"); m.settings.bgmAuto = !!d.get("bgm_auto");
  const rg = d.get("region"); if (rg === "" || REGIONS[rg]) m.region = rg;
  if (h) m.handle = h;
  m.birthday = bm ? `${bm}월 ${bd}일` : "";
  const sf = $('form[data-form="safe"]'); if (sf) applySafe(m, new FormData(sf));
  save(); toast("설정과 안심 설정을 저장했어요."); refresh();
};
ACT.charge = () => modal({ title: "구슬 충전 (데모)", body: `<p>데모라 실제 결제 없이 구슬을 넣어 드려요.</p><p class="gray">가격: 실서비스 가격 미정 · 산 지 7일 안 미사용분은 전액 환불, 유효기간 5년, 무료로 받은 구슬은 환불 대상이 아니에요.</p><div class="frow">${[30, 50, 100].map((n, i) => `<label class="rad"><input type="radio" name="n" value="${n}" ${i === 1 ? "checked" : ""}>구슬 ${n}</label>`).join("")}</div>`, ok: "충전하기",
  onOk: d => { const m = me(), n = +d.get("n"); m.beads += n; m.beadLog.push({ t: "충전(데모)", n, paid: true, at: nowISO() }); save(); toast(`구슬 ${n}개를 넣었어요.`); refresh(); } });
ACT.refund = () => { const m = me(); if (!m.beads) return toast("환불할 구슬이 없어요."); modal({ title: "환불 신청", body: `<p>쓰지 않은 구슬 <b>${m.beads}</b>개를 환불 신청할까요?</p><p class="gray">실서비스: 산 지 7일 안 미사용분은 전액, 그 뒤엔 수수료를 빼고 돌려드려요. 유료 구슬 유효기간은 5년이고, 서비스가 끝나면 남은 유료 구슬은 전액 돌려드려요. 무료로 받은 구슬은 환불 대상이 아니에요. 데모라 실제 환불은 없어요.</p>`, ok: "신청하기",
  onOk: () => { if (!m.beads) return toast("환불할 구슬이 없어요."), false; m.beadLog.push({ t: "환불 신청", n: -m.beads, at: nowISO() }); m.beads = 0; save(); toast("환불 신청을 접수했어요."); refresh(); } }); };
ACT.export = () => {
  const m = me();
  const myC = (list, where) => list.flatMap(x => x.comments.filter(c => c.author === m.id).map(c => ({ 어디: where(x), 내용: c.text, 시각: c.at })));
  const data = { 내정보: m, 글: DB.posts.filter(p => p.author === m.id), 기록: DB.diaries.filter(d => d.owner === m.id), 앨범: DB.photos.filter(p => p.owner === m.id), 방문록: DB.guests.filter(g => g.owner === m.id || g.author === m.id),
    내가_단_게시판_댓글: myC(DB.posts, p => p.title), 내가_단_기록_댓글: myC(DB.diaries, d => `${nick(d.owner)}의 기록 · ${d.title}`) };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = `추억홈피_${m.id}_내데이터.json`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast("내려받기를 시작했어요.");
};
ACT.withdraw = () => modal({ title: "회원 탈퇴", body: `<p>정말 떠나시나요? 홈피와 글이 바로 숨겨지고 30일 뒤 지워져요.</p><label class="chk"><input type="checkbox" name="ok" required> 네, 탈퇴할게요</label>`, ok: "탈퇴하기", danger: true,
  onOk: () => { const m = me(); m.withdrawnAt = nowISO(); DB.me = null; save(); toast("탈퇴했어요. 30일 안에 다시 로그인하면 되살릴 수 있어요."); go("#/"); } });
ACT.freqall = () => {
  const m = me(); if (!m) return;
  const rs = DB.requests.filter((r, i, all) => r.to === m.id && user(r.from) && !user(r.from).withdrawnAt && !eitherBlocked(m.id, r.from) && all.findIndex(x => x.to === m.id && x.from === r.from) === i);
  if (!rs.length) return;
  modal({ title: "단짝 신청 모두 수락", body: `<ul class="feed">${rs.map(r => `<li><img class="av" src="${avSrc(r.from)}" alt=""><span><b>${esc(nick(r.from))}</b>님 ${esc(r.rel || "")}</span></li>`).join("")}</ul><p>모두 <b>${rs.length}</b>명의 신청을 받을까요?</p>`, ok: "모두 수락",
    onOk: () => { rs.forEach(r => { dropReq(m.id, r.from); const f = user(r.from); if (!m.friends.includes(f.id)) m.friends.push(f.id); if (!f.friends.includes(m.id)) f.friends.push(m.id); addFeed(f.id, m.id, "님이 단짝 신청을 받아 줬어요 ♡", `#/h/${m.id}`); });
      save(); toast(`${rs.length}명과 단짝이 됐어요 ♡`); refresh(); } });
};
// 두 사람 사이의 신청은 방향과 상관없이 모두 지운다(중복·엇갈린 신청 정리)
const dropReq = (a, b) => { DB.requests = DB.requests.filter(x => !((x.from === a && x.to === b) || (x.from === b && x.to === a))); };
ACT.freq = el => {
  const r = DB.requests.find(x => x.id === el.dataset.id); if (!r || r.to !== me()?.id) return;  // 나에게 온 신청만
  if (eitherBlocked(r.to, r.from)) { dropReq(r.to, r.from); save(); toast("차단 관계라 받을 수 없는 신청이에요."); return refresh(); }
  dropReq(r.to, r.from);  // 수락·거절 모두 두 사람 사이 신청을 한꺼번에 정리(중복 신청도)
  if (el.dataset.ok && user(r.from)) { const m = me(); if (!m.friends.includes(r.from)) m.friends.push(r.from); if (!user(r.from).friends.includes(m.id)) user(r.from).friends.push(m.id); addFeed(r.from, m.id, "님이 단짝 신청을 받아 줬어요 ♡", `#/h/${m.id}`); toast("이제 단짝이에요 ♡"); }
  save(); refresh();
};
ACT.readall = () => { DB.feed.forEach(f => f.to === DB.me && (f.read = true)); save(); refresh(); };
ACT.openfeed = el => {
  const f = DB.feed.find(x => x.id === el.dataset.id); if (f) { f.read = true; save(); }
  const h = el.getAttribute("href");
  if (h === "#/my" || h === location.hash) { refresh(); setTimeout(() => $("#reqs")?.scrollIntoView({ behavior: "smooth" }), 50); } else go(h);
};

// ---------- 안심 설정 화면·차단 ----------
function safeBox(m) {
  const p = prv(m), sc = k => pval(m, k);
  const row = (k, n, L = SCOPES) => `<tr><th>${n}</th><td>${L.map(([v, t]) => `<label class="rad"><input type="radio" name="p_${k}" value="${v}" ${sc(k) === v ? "checked" : ""}>${t}</label>`).join("")}</td></tr>`;
  const bl = (m.blocked || []).filter(user);
  return `<section class="box" id="safe"><div class="box-h"><span class="ic">🛡</span><h2 class="jua" style="font-size:18px">안심 설정</h2><span class="sub">누가 무엇을 볼 수 있는지 정해요</span></div>
    <form data-form="safe"><table class="ptbl set">
      ${row("birthday", "생일 보여 주기")}${row("likes", "좋아하는 것")}${row("then", "그 시절 나")}${row("now", "요즘 나")}
      <tr><th>방문록 쓰기</th><td>${[["all", "누구나"], ["friends", "단짝만"], ["off", "닫기"]].map(([v, t]) => `<label class="rad"><input type="radio" name="p_guest" value="${v}" ${sc("guest") === v ? "checked" : ""}>${t}</label>`).join("")}</td></tr>
      <tr><th>모르는 사람에게 내 홈피 보이기</th><td><label class="chk"><input type="checkbox" name="p_search" ${p.search !== false ? "checked" : ""}> 검색·오늘 인기 홈피·놀러가기·추천에 보이기</label> <em>(끄면 링크·단짝으로만 찾아와요)</em></td></tr>
      <tr><td colspan="2"><em>로그인하지 않은 사람에게는 ‘전체공개’로 둔 것만 보여요. 차단은 로그인한 상태에서 서로 안 보이게 해요. 단짝 홈피에 들르면 단짝에게 ‘놀러왔어요’ 알림이 가요(받는 사람이 위 설정의 알림에서 끌 수 있어요).</em></td></tr>
      <tr><td colspan="2"><button class="bv pri">안심 설정 저장</button></td></tr>
    </table></form>
    <h3 class="th-h jua">🚫 차단한 사람 ${bl.length}</h3>
    <ul class="feed">${bl.map(id => `<li><img class="av" src="${avSrc(id)}" alt=""><span><b>${esc(nick(id))}</b> <em class="gray">서로의 홈피·글·댓글·방문록이 안 보이고, 단짝 신청도 막혀요</em></span><span class="ago"><button class="bv sm" data-act="unblock" data-id="${id}">차단 풀기</button></span></li>`).join("") || `<li class="gray">차단한 사람이 없어요. 방문록·댓글·프로필의 ‘차단’으로 막을 수 있어요.</li>`}</ul></section>`;
}
FORM.safe = (f, d) => {
  applySafe(me(), d); save(); toast("안심 설정을 저장했어요. 위 ‘설정’을 바꿨다면 ‘설정 저장’도 눌러 주세요.");  // 다시 그리지 않아서 위 '설정' 칸에 바꾸던 값이 남는다
};
function applySafe(m, d) { const v = k => d.get("p_" + k); m.privacy = { birthday: v("birthday"), likes: v("likes"), then: v("then"), now: v("now"), guest: v("guest"), search: !!d.get("p_search") }; }
ACT.block = el => {
  if (needLogin()) return;
  const id = el.dataset.id, m = me(); if (!user(id) || id === m.id || user(id).admin) return;
  modal({ title: `${nick(id)}님 차단`, body: `<p>차단하면 서로의 홈피·글·댓글·방문록이 보이지 않고, 단짝이면 끊어지며 단짝 신청도 막혀요. 상대에게 알림은 가지 않아요.</p>`, ok: "차단하기", danger: true,
    onOk: () => { blockUser(m, id); save(); toast("차단했어요. 마이페이지 › 안심 설정에서 풀 수 있어요."); refresh(); } });
};
// 차단: 단짝을 끊고 서로의 신청을 지운다(신고하면 자동으로도 불림)
function blockUser(m, id) {
  if (!user(id) || id === m.id || user(id).admin) return false;
  m.blocked = [...new Set([...(m.blocked || []), id])];
  m.friends = m.friends.filter(x => x !== id); user(id).friends = user(id).friends.filter(x => x !== m.id);
  DB.requests = DB.requests.filter(r => !((r.from === id && r.to === m.id) || (r.from === m.id && r.to === id)));
  return true;
}
ACT.unblock = el => { const m = me(); if (!m) return; modal({ title: `${nick(el.dataset.id)}님 차단 풀기`, body: "<p>차단을 풀면 서로의 홈피·글·댓글이 다시 보여요.</p>", ok: "차단 풀기", onOk: () => { m.blocked = (m.blocked || []).filter(x => x !== el.dataset.id); save(); toast("차단을 풀었어요."); refresh(); } }); };

// ---------- 이용약관·개인정보 처리방침 (데모 초안 — 사업자 정보·위탁 업체는 정해지면 채운다, 변호사 확인 전) ----------
// B단계(실서비스) 전에 POLICY_TODO 자리를 채운다: 시행일, 환불 수수료, 위탁처(서버·결제), 보호책임자 이름·연락처, 접속기록 보관 기간
const POLICY_TODO = `<span class="gray">실서비스 오픈 때 정해서 알려드려요</span>`;
const SAFE_NOTE = `<p class="dnote5">실명·직장·연락처는 쓰지 마세요 · 특정인 저격은 신고 대상이에요.</p>`;  // 입력창 옆 저격·개인정보 주의(글쓰기·다이어리·방문록·프로필)
const POLICY = {
  terms: { title: "이용약관", html: `
<p class="gray">시행일 ${POLICY_TODO} · 데모용 초안이에요.</p>
<h3>제1조 (목적)</h3><p>이 약관은 추억홈피(이하 ‘서비스’)를 쓰는 회원과 운영자 사이의 권리·의무와 책임을 정합니다.</p>
<h3>제2조 (가입)</h3><ul><li>만 19세 이상만 가입할 수 있어요. 카카오 계정으로 가입하고, 출생연도로 나이를 확인해요. <span class="gray">(실서비스에서 적용 예정 · 데모는 본인 체크만 하고 이 브라우저에만 저장해요)</span></li><li>남의 정보로 가입하면 이용이 제한될 수 있어요.</li></ul>
<h3>제3조 (게시물)</h3><ul><li>홈피·게시판에 올린 글·사진의 저작권은 쓴 사람에게 있어요.</li><li>운영자는 서비스 안에서 보여 주는 데 필요한 범위(크기 조절·미리보기 등)에서만 게시물을 써요.</li><li>다른 사람이 나온 사진은 그 사람의 동의를 받고 올려야 해요.</li></ul>
<h3>제4조 (하면 안 되는 일)</h3><ul><li>남의 사진·실명·연락처를 동의 없이 올리기, 욕설·비방·괴롭힘</li><li>음란·불법 정보, 광고·판매 글, 음원 파일 올리기</li><li>서비스를 망가뜨리거나 다른 사람 계정을 쓰는 일</li></ul>
<h3>제5조 (신고와 임시조치)</h3><p>권리 침해 신고가 들어오면 게시물을 최대 30일 가리고 쓴 사람에게 알려요. 쓴 사람은 이의를 신청할 수 있어요(정보통신망법 제44조의2).</p>
<h3>제6조 (이용 제한)</h3><p>제4조를 어기면 경고, 글 가림, 이용 정지 순으로 제한할 수 있고, 이유를 알려 드려요.</p>
<h3>제7조 (구슬)</h3><ul><li>구슬은 꾸미기 아이템을 사는 데 쓰는 서비스 안 재화예요. 현금으로 바꾸거나 남에게 줄 수 없어요.</li><li>산 지 7일 안의 쓰지 않은 구슬은 전액 환불해요. 그 뒤 남은 구슬도 환불을 신청할 수 있어요(수수료 ${POLICY_TODO}).</li><li>구슬 유효기간은 산 날부터 5년이에요. 무료로 받은 구슬은 환불 대상이 아니에요.</li><li>서비스를 끝내면 쓰지 않은 유료 구슬은 전액 돌려드려요.</li><li class="gray">데모에서는 실제 결제가 없어요.</li></ul>
<h3>제8조 (탈퇴)</h3><p>내 정보에서 언제든 탈퇴할 수 있어요. 30일 뒤 글·사진이 모두 지워지고, 그 전에 다시 로그인하면 되살아나요.</p>
<h3>제9조 (서비스 변경·종료)</h3><p>서비스를 바꾸거나 끝낼 때는 30일 전에 공지해요.</p>
<h3>제10조 (책임)</h3><p>회원이 올린 게시물의 책임은 쓴 사람에게 있어요. 운영자는 고의나 중대한 잘못이 없으면 회원끼리의 다툼에 책임지지 않아요.</p>
<h3>제11조 (분쟁)</h3><p>분쟁은 대한민국 법을 따르고, 관할 법원은 민사소송법에 따라요.</p>` },
  privacy: { title: "개인정보 처리방침", html: `
<p class="gray">시행일 ${POLICY_TODO} · 데모용 초안이에요.</p>
<h3>1. 모으는 정보</h3><table class="pt5"><tr><th>언제</th><th>항목</th></tr>
<tr><td>가입(필수)</td><td>카카오 회원번호, 닉네임, 출생연도</td></tr>
<tr><td>가입(선택)</td><td>이벤트·혜택 알림 받기 여부</td></tr>
<tr><td>이용 중</td><td>올린 글·사진·방문록·댓글, 신고·문의 내용, 접속 기록</td></tr>
<tr><td>구슬 결제 시</td><td>결제·환불 기록(카드번호는 결제대행사만 가져요)</td></tr></table>
<p>프로필 사진, 전화번호, 실명은 모으지 않아요. 사진 속 촬영 위치 정보는 올릴 때 지워요.</p>
<h3>2. 쓰는 목적</h3><p>회원 확인과 만 19세 확인, 홈피·게시판 운영, 신고 처리와 부정 이용 막기, 구슬 결제·환불, (동의한 분만) 이벤트 알림.</p>
<h3>3. 보관 기간</h3><ul><li>탈퇴하면 30일 뒤 지워요(그 전에 다시 로그인하면 되살아남).</li><li>법이 정한 기록은 그 기간만 따로 보관해요: 결제·환불 기록 5년, 소비자 불만 처리 기록 3년(전자상거래법), 접속 기록(통신비밀보호법, 기간은 ${POLICY_TODO}).</li><li class="gray">위 보관·삭제는 실서비스에서 적용 예정이에요. 데모는 서버 없이 이 브라우저에만 저장해요.</li></ul>
<h3>4. 다른 곳에 주기</h3><p>본인 동의나 법에 따른 요청이 없으면 다른 곳에 주지 않아요.</p>
<h3>5. 맡기는 일(처리 위탁)</h3><table class="pt5"><tr><th>받는 곳</th><th>하는 일</th></tr><tr><td>카카오</td><td>로그인</td></tr><tr><td>${POLICY_TODO}</td><td>서버·데이터 보관</td></tr><tr><td>${POLICY_TODO}</td><td>구슬 결제</td></tr></table>
<p>서버가 해외에 있으면 나라·업체·옮기는 항목을 여기에 적어요. 홈피의 유튜브 노래를 틀면 유튜브(구글)에 접속 정보가 전달돼요.</p>
<h3>6. 내 권리</h3><p>내 정보 화면에서 보고 고칠 수 있고, 탈퇴할 수 있어요. 열람·정정·삭제·처리 정지는 <a href="#/help">운영자에게 알리기</a>로 요청하면 10일 안에 답해요.</p>
<h3>7. 지우는 방법</h3><p>파일은 복구할 수 없게 지우고, 종이 기록은 파쇄해요.</p>
<h3>8. 안전 조치</h3><p>접근 권한 제한, 접속 기록 보관, 전송 구간 암호화, 비공개 글의 권한 검사를 서버에서 해요. <span class="gray">(실서비스에서 적용 예정 · 데모는 서버 없이 이 브라우저에만 저장해요)</span></p>
<h3>9. 자동으로 모으는 것</h3><p>로그인 유지와 설정 저장에 브라우저 저장소를 써요. 광고 추적 쿠키는 쓰지 않아요.</p>
<h3>10. 만 19세 미만</h3><p>만 19세 미만은 가입할 수 없고, 확인되면 바로 지워요.</p>
<h3>11. 개인정보 보호책임자</h3><p>이름·연락처는 ${POLICY_TODO}.</p>
<h3>12. 바뀔 때</h3><p>내용이 바뀌면 시행 7일 전에 공지해요.</p>` },
};
VIEWS.policy = k => ({ body: "v4p y5p", title: POLICY[k].title, html: portal("", `<section class="box pol5"><div class="box-h"><span class="ic">📄</span><h2 class="jua">${POLICY[k].title}</h2></div>${POLICY[k].html}</section>`, welcomeBox()) });
ACT.policy = el => { const p = POLICY[el.dataset.k]; modal({ title: p.title, body: `<div class="pol5 pol5-m">${p.html}</div>`, cancel: "", ok: "닫기" }); };
