"use strict";
// 콘텐츠 블로킹: 욕설·비속어·음란·혐오·성매매 표현이 들어간 글은 올리기 전에 막는다(사장님 지시 2026-10-27).
// 글자 사이 띄어쓰기·숫자·기호로 피해 가는 것(시1발, ㅅ ㅂ)도 잡는다. 이미 올라간 글은 보일 때 가린다.
// shortcut: 단어 목록 기반이라 신조어·이미지는 못 잡는다 — 실서비스는 서버 필터(모더레이션 API)와 신고·운영자 처리를 함께 쓴다.
const BAD_WORDS = [
  // 욕설·비속어
  "씨발", "시발", "씨팔", "시팔", "ㅅㅂ", "ㅆㅂ", "ㅆㅃ", "씌발", "쓰발", "씨바", "시바", "씹팔", "십팔놈", "십팔년", "18놈", "ㅗㅗ", "병신", "븅신", "빙신", "병쉰", "빙시", "ㅂㅅ", "ㅄ", "좆", "존나", "존내", "졸라게", "ㅈㄴ",
  "개새끼", "개새기", "개쌔끼", "개세끼", "개색기", "개색끼", "개쉐", "씹새", "씹년", "씹창", "썅", "지랄", "ㅈㄹ", "염병", "엠창", "니미", "느금마", "니애미", "니애비", "느그애미",
  "미친년", "미친놈", "미친새끼", "또라이", "닥쳐라", "등신", "호로새끼",
  // 혐오·비하
  "한남충", "김치녀", "된장녀", "맘충", "틀딱", "급식충", "애자", "장애새끼", "짱깨", "쪽바리", "흑형", "똥꼬충",
  // 음란·성매매
  "섹스", "쎅스", "섹쓰", "섻스", "s3x", "야동", "포르노", "자위", "보빨", "봊", "앙기모띠", "조건만남", "출장안마", "성매매", "원나잇", "오피방", "fuck", "fck", "fvck", "fuk", "shit", "bitch", "porn", "sex",
  // 그림 문자
  "🖕",
];
// 정상 단어 안에 들어 있는 경우는 빼고 본다(시발점, 수박씨발라 등)
const OK_WORDS = ["시발점", "시발역", "씨발라", "씨발라먹", "사섹스", "에섹스", "미들섹스", "섹스피어", "등신대", "애자일", "니미츠", "자위대", "자위권", "시바견", "시바이누", "십팔번", "sexy", "essex", "unisex", "sussex"];
// 짧아서 다른 낱말 속에 잘 섞이는 말은 낱말 맨 앞에 올 때만 본다(의자위→X, 자위→O)
const HEAD_ONLY = new Set(["자위", "애자", "니미", "등신", "염병", "또라이", "맘충", "야동", "시팔", "시발", "시바", "씨바", "sex", "fuk", "fck", "18놈"]);
// 눈속임 글자(키릴·그리스 닮은꼴)를 영문으로
const LOOK = { "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "ѕ": "s", "і": "i", "ј": "j", "к": "k", "м": "m", "т": "t", "ν": "v", "ο": "o" };
// 보이지 않는 글자·결합 기호를 지우고, 전각은 반각으로(NFKC), 닮은꼴은 영문으로
const clean = s => String(s || "").normalize("NFKC").replace(/[\u200B-\u200F\u2060\uFEFF\u00AD\u0300-\u036F]/g, "").toLowerCase().replace(/[аеорсхуѕіјкмтνο]/g, c => LOOK[c] || c).normalize("NFC");
const normText = s => clean(s).replace(/[0-9._\-*~!@#$%^&()+=|\\/,?'"`:;<>[\]{}·ㆍ]/g, "");
const normKeepNum = s => clean(s).replace(/[._\-*~!@#$%^&()+=|\\/,?'"`:;<>[\]{}·ㆍ]/g, "");
// 검사 단위: 띄어쓰기로 나눈 낱말 + 한 글자짜리가 이어진 덩어리(ㅅ ㅂ, 씨 발)
function chunks(text) {
  const raw = clean(text).split(/\s+/).filter(Boolean), toks = raw.map(normText).filter(Boolean), out = [...toks, ...raw.map(normKeepNum)];
  for (let i = 0; i < toks.length; i++) { if (toks[i].length !== 1) continue; let j = i, s = ""; while (j < toks.length && toks[j].length === 1) s += toks[j++]; if (s.length > 1) out.push(s); i = j - 1; }
  return out;
}
// 단어 목록도 같은 방식으로 정규화해 둔다(NFKC는 ㅅ·ㅗ 같은 호환 자모를 다른 코드로 바꾼다)
let BAD_C = null, OK_C = null;
const hitIn = c => {
  if (!BAD_C) { BAD_C = BAD_WORDS.map(w => [w, clean(w), HEAD_ONLY.has(w)]); OK_C = OK_WORDS.map(clean); }
  let x = c; OK_C.forEach(w => { x = x.split(w).join(" "); }); const parts = x.split(" ");
  const hit = BAD_C.find(([, w, head]) => head ? parts.some(p => p.startsWith(w)) : parts.some(p => p.includes(w)));
  return hit ? hit[0] : null;
};
function badWord(text) { for (const c of chunks(text)) { const w = hitIn(c); if (w) return w; } return null; }
// 걸린 부분이 들어 있는 원래 낱말(안내에 그대로 보여 준다)
function badPart(text) {
  const raw = String(text || "").split(/\s+/).filter(Boolean);
  for (const r of raw) if (hitIn(normText(r)) || hitIn(normKeepNum(r))) return r;
  for (let i = 0; i < raw.length; i++) {  // 한 글자씩 띄운 덩어리(ㅅ ㅂ)
    if (normText(raw[i]).length !== 1) continue; let j = i; while (j < raw.length && normText(raw[j]).length === 1) j++;
    if (j - i > 1 && hitIn(raw.slice(i, j).map(normText).join(""))) return raw.slice(i, j).join(" "); i = j - 1;
  }
  return null;
}
// 화면에 보일 때: 이미 올라간 글의 나쁜 낱말은 ♡로 가린다
function maskBad(text) {
  const s = String(text || ""); if (!badWord(s)) return s;
  const parts = s.split(/(\s+)/);
  const word = p => !/^\s*$/.test(p), norm = p => normText(p);
  for (let i = 0; i < parts.length; i++) {
    if (!word(parts[i])) continue;
    if (hitIn(norm(parts[i])) || hitIn(normKeepNum(parts[i]))) { parts[i] = "♡♡"; continue; }
    if (norm(parts[i]).length === 1) {  // 한 글자씩 띄운 덩어리
      let j = i, s2 = "", idx = [];
      while (j < parts.length && (!word(parts[j]) || norm(parts[j]).length === 1)) { if (word(parts[j])) { s2 += norm(parts[j]); idx.push(j); } j++; }
      if (s2.length > 1 && hitIn(s2)) { idx.forEach(k => parts[k] = "♡"); i = j - 1; }
    }
  }
  return parts.join("");
}
// 운영자로 오해할 닉네임은 못 쓴다(사칭 방지)
const RESERVED_NICK = ["운영자", "관리자", "어드민", "admin", "운영팀", "추억홈피", "공식", "staff", "매니저", "gm"];
const nickReserved = n => { const x = normText(n).replace(/\s+/g, ""); return RESERVED_NICK.some(w => x.includes(clean(w))); };
const BLOCK_MSG = (w, part) => `다른 분께 불쾌감을 줄 수 있는 표현${part ? `(‘${part.slice(0, 20)}’ 부분)` : ""}이 있어서 올릴 수 없어요. 고쳐서 다시 올려 주세요.`;
// 글을 올리는 모든 칸을 한곳에서 검사한다(검색·로그인·신고 사유 같은 칸은 빼고)
const FILTER_SKIP = new Set(["login", "search", "bsearch", "report", "settings", "safe", "contact"]);  // 신고·문의는 피해 내용을 그대로 옮겨 적을 수 있어야 한다
function formHasBad(fd) {
  for (const [k, v] of fd.entries()) { if (typeof v !== "string" || k === "q" || k === "handle") continue; const w = badWord(v); if (w) return { w, part: badPart(v) }; }
  return null;
}
