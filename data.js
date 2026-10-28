"use strict";
// 고정 목록과 처음 데이터(시드). 화면 시안 v0.5 의 예시 글·이름을 그대로 옮겼다.

const BOARDS = {
  then: { name: "그때 그 시절", desc: "그리운 그 시절의 이야기를 함께 나눠요.", cats: ["추억", "음악", "학교", "게임", "일상"] },
  talk: { name: "요즘 수다", desc: "나이 상관없이, 요즘 사는 이야기를 편하게 나눠요.", cats: ["수다", "고민", "정보"] },
  life: { name: "육아·살림", desc: "아이 키우고 살림하는 이야기.", cats: ["육아", "살림", "요리"] },
  work: { name: "직장", desc: "회사 이야기, 퇴근 후 이야기.", cats: ["회사", "이직", "퇴근"] },
  show: { name: "홈피 자랑", desc: "꾸민 내 홈피를 자랑해 주세요.", cats: ["내 방", "레이아웃", "배경"] },
  notice: { name: "공지", desc: "운영 소식과 이용 규칙.", cats: ["공지"], adminOnly: true },
};
const TAGC = ["t-pink", "t-blue", "t-teal", "t-rose", "t-yel", "t-pur"];

const CHARS = {  // 그림 p_<key>.png, 이름, 구슬 가격
  beanie: ["폼폼 비니", 20], emo: ["이모 보이", 20], pigtail: ["양갈래 핑크", 20],
  cap: ["트러커 캡", 20], ribbon: ["리본 교복", 25], gyaru: ["반짝 갸루", 30],
  school: ["블레이저 교복", 20], track: ["트레이닝복", 20],
  suit: ["신입사원 정장", 25], dad: ["아빠 캐주얼", 25], mom: ["니트 단발", 25], office: ["트렌치 오피스룩", 25],
};
// 캐릭터 묶음: '그 시절 나'와 '요즘 나'(어른 체형) — 패널 100명: 남자·어른 캐릭터가 없다
const CHAR_GROUPS = [["그 시절 나", ["beanie", "pigtail", "ribbon", "gyaru", "emo", "cap", "school", "track"]], ["어른이 된 나", ["suit", "dad", "mom", "office"]]];
const THEMES = [
  ["핑크 깅엄", "파스텔 체크 + 반짝이 별"], ["딸기우유 도트", "분홍 물방울 + 하트"], ["라벤더 별밤", "보랏빛 밤하늘"],
  ["민트 하트", "민트 체크 + 하트"], ["피치 리본", "복숭아 사선 줄무늬"], ["블랙 체커", "검정 체커 + 빨강 포인트"],
  ["데님 스트리트", "청바지 원단 + 스티치"], ["카모 그린", "픽셀 밀리터리"], ["메탈 크롬", "은색 크롬 + 반짝"], ["사이버 그리드", "네이비 격자 + 네온"],
];
const LAYOUTS = [
  ["기본", "커버 + 큰 방 + 카드 3칸"], ["오른쪽 프로필", "프로필을 오른쪽에 길게"], ["내 방 크게", "방을 화면 가득"],
  ["잡지", "큰 제목 + 2단 기사"], ["스티커북", "삐뚤빼뚤 마스킹테이프"], ["폴더폰", "핑크 폰 화면 속 홈피"],
  ["음악방송", "어두운 무대 + 가운데 표지"], ["바탕화면", "아이콘 + 작업표시줄"], ["줄노트 한 장", "공책 한 장에 쓱쓱"], ["미니멀 피드", "깔끔한 한 줄 피드"],
];
const ROOMS = {
  e: ["빈 방", "가구를 하나씩 골라 배치", "img/room_e01.png"],
  l: ["러블리 방", "하트 침대 · 라바 램프 · 바람 의자", "img/room5.png"],
  m: ["스트릿 방", "게임 PC · 기타 · 빈백 · 야경", "img/room5m.png"],
};
const ROOM_PRICE = 150;  // 다 꾸며진 방(러블리·스트릿)은 구슬 상품. 빈 방은 무료
const EROOMS = ["라벤더", "딸기우유", "민트", "하늘", "레몬", "피치", "크림", "네이비 밤", "체리", "콘크리트"];  // 빈 방 벽·바닥 10종 img/room_eNN.png
const FURN = {  // 이름, 방(1024px 기준) 안에서 보일 너비, 구슬 가격
  bed_pink: ["하트 침대", 270, 20], bed_navy: ["네이비 체크 침대", 275, 20], desk_pc: ["브라운관 PC 책상", 250, 15],
  desk_game: ["게임 책상", 260, 25], shelf: ["CD 책장", 120, 15], lava: ["라바 램프", 85, 10],
  airchair: ["바람 의자", 170, 20], beanbag: ["빈백", 170, 15], guitar: ["기타 + 앰프", 170, 30],
  rug: ["복슬 러그", 300, 10], plant: ["큰 화분", 110, 10], disco: ["미러볼 조명", 60, 10],
};
const FURN_START = ["rug", "plant", "desk_pc"];  // 가입하면 그냥 주는 가구
const PRESET = {
  l: { rug: [512, 640], bed_pink: [170, 600], lava: [330, 520], desk_pc: [800, 520], airchair: [690, 650], plant: [960, 610], disco: [60, 600] },
  m: { rug: [520, 650], bed_navy: [175, 600], shelf: [360, 520], desk_game: [800, 520], beanbag: [640, 660], guitar: [960, 640] },
};
const WIN = { l: { x: 425, y: 48, w: 182, h: 222 }, m: { x: 402, y: 98, w: 248, h: 174 }, e: { x: 299, y: 85, w: 427, h: 262 } };  // 방 그림 속 창 위치
const MOODS = { 설렘: "☺", 행복: "😊", 센치: "☁", 피곤: "😴", 그리움: "💭" };
const WEATHERS = { 맑음: "☀", 흐림: "☁", 비: "☂", 눈: "❄" };
const FONTS = { jua: ["감자꽃체(기본)", "Gamja Flower"], round: ["말랑 둥근체", "Jua"], hand: ["손글씨체", "Gaegu"], px: ["도트 영문체", "Silkscreen"] };
const REGIONS = {  // 시·도 대표 좌표 (창밖 날씨용)
  서울: [37.5665, 126.978], 부산: [35.1796, 129.0756], 대구: [35.8714, 128.6014], 인천: [37.4563, 126.7052], 광주: [35.1595, 126.8526],
  대전: [36.3504, 127.3845], 울산: [35.5384, 129.3114], 세종: [36.48, 127.289], 경기: [37.2752, 127.0095], 강원: [37.8813, 127.7298],
  충북: [36.6357, 127.4917], 충남: [36.6588, 126.6728], 전북: [35.8242, 127.148], 전남: [34.8161, 126.4629], 경북: [36.576, 128.5056],
  경남: [35.2383, 128.6924], 제주: [33.4996, 126.5312],
};
const REPORT_REASONS = {
  face: ["내 얼굴이 동의 없이 올라왔어요 (초상권)", true], abuse: ["욕설·비방·명예훼손", false], ad: ["광고·도배", false],
  child: ["아이(미성년자)가 나온 사진이에요", true], illegal: ["음란·불법 정보", false], copy: ["저작권 침해", true],
  harass: ["괴롭힘·저격", true], doxx: ["신상 노출(실명·연락처·주소)", true], etc: ["기타", false],
};  // true = 권리 침해 신고라 바로 가림(최대 30일)
// 사람(계정) 신고 사유 — 글이 아니라 사람의 행동을 신고한다
const USER_REPORT_REASONS = {
  harass: ["괴롭힘·스토킹·따라다님", false], abuse: ["욕설·비방·명예훼손", false], fake: ["다른 사람인 척해요 (사칭)", false],
  spam: ["광고·도배 계정", false], illegal: ["음란·불법 정보", false], minor: ["만 19세 미만으로 보여요", false],
  sexual: ["성적 접근·만남 요구", false], money: ["돈 요구·사기", false], contact: ["연락처·주소 요구", false], etc: ["기타", false],
};
// 신고하는 화면 모두에 넣는 안내(사장님 지시)
const REPORT_WARN = "사실대로 한 신고는 걱정하지 않으셔도 돼요. 다만 근거 없이 의도적으로 한 신고(허위·보복·괴롭힘 목적)는 확인 후 경고·이용 제한 등 조치될 수 있어요.";
const PHOTO_POOL = ["img/y_window.png", "img/y_poster.png", "img/y_photos.png", "img/ym_window.png", "img/ym_poster.png", "img/wxs_l_sunset.png", "img/wxs_m_night.png", "img/wxs_l_snow.png", "img/i_polaroid.png"];

function seed() {
  const day = 864e5, now = Date.now(), ago = (d, h = 12) => new Date(now - d * day - h * 36e5).toISOString();
  const U = {};
  const mk = (id, nick, char, room, theme, layout, region, extra = {}) => U[id] = {
    id, handle: id, nick, char, chars: [char], room, theme, layout, font: "jua", region, beads: 0, beadLog: [],
    title: `${nick}의 홈피`, intro: "그때도, 지금도 좋은 사람들과 ♪", mood: "행복", moodLog: [], birthday: "", likes: "음악 · 사진",
    then: "", now: "", memo: "오늘은 비 오는 날 노래 ♪", song: { title: "그 시절 내 노래", artist: "동네 밴드", url: "" },
    furn: { ...PRESET.l }, furnOwned: [...FURN_START], friends: [], today: { d: "", n: 0 }, total: 0,
    settings: { scope: "friends", notify: { guest: true, friend: true, comment: false } }, joinedAt: ago(200), ...extra,
  };
  mk("haneul", "하늘소녀", "beanie", "l", 1, 1, "서울", { title: "하늘소녀의 홈피", intro: "그때도, 지금도 좋은 사람들과 ♪", total: 58317, demoOnline: true });
  mk("roki", "로키", "emo", "m", 6, 4, "부산", { intro: "음악이 있는 행복한 일상", total: 41022, demoOnline: true, song: { title: "비 오는 날 듣기 좋은 노래", artist: "창가 가수", url: "" } });
  mk("lulu", "달콤한루루", "pigtail", "l", 2, 5, "서울", { intro: "지금도 예쁜 추억을 만들고 있어요", total: 36110 });
  mk("windmill", "바람개비", "cap", "m", 7, 7, "경기", { intro: "좋은 추억은 언제나, 여기에 …", total: 29870 });
  mk("gyaru", "반짝갸루", "gyaru", "l", 4, 6, "서울", { intro: "반짝반짝 오늘도 갸루 ☆", total: 18044, demoOnline: true });
  mk("byeolbit", "별빛", "beanie", "l", 1, 1, "서울", { title: "별빛이 내리는 홈피", intro: "평범한 하루 속에서도 행복을 찾으려고 노력하는 중 ☆", mood: "설렘", birthday: "3월 14일", likes: "음악 · 사진 · 예쁜 카페 · 비 오는 날", then: "MP3에 노래 꽉 채우던 고등학생, 야자 끝나고 PC방", now: "회사원 · 퇴근하고 홈피 꾸미는 게 낙", total: 583 });
  mk("jimin", "지민", "ribbon", "l", 3, 2, "서울", { total: 4210 });
  mk("minsu", "민수", "cap", "m", 8, 10, "인천", { total: 3120 });
  for (const [id, nick, ch, r] of [["choco", "초코우유", "pigtail", "l"], ["music", "음악시간", "emo", "m"], ["travel", "여행소년", "cap", "m"], ["levelup", "레벨업중", "emo", "m"],
    ["jinan", "지난날에", "ribbon", "l"], ["film", "필름한장", "beanie", "l"], ["tambo", "탬버린장인", "gyaru", "l"], ["maejeom", "매점러버", "pigtail", "l"], ["emoking", "이모티콘왕", "cap", "m"]])
    mk(id, nick, ch, r, r === "l" ? 1 + (nick.length % 5) : 6 + (nick.length % 5), 1 + (nick.charCodeAt(0) % 10), "서울", { total: 500 + nick.charCodeAt(1) % 900 });
  U.admin = { ...U.choco, id: "admin", nick: "운영자", admin: true, title: "운영자", total: 0 };
  U.haneul.friends = ["lulu", "roki", "jimin"]; U.lulu.friends = ["haneul"]; U.roki.friends = ["haneul"]; U.jimin.friends = ["haneul", "byeolbit", "minsu"];
  U.byeolbit.friends = ["jimin", "minsu"]; U.minsu.friends = ["jimin", "byeolbit"];

  let n = 4300;
  const P = (board, cat, title, author, d, views, likeBase, body, extra = {}) => ({
    id: String(++n), board, cat, title, author, at: ago(d, (n % 9) + 1), views, likeBase, likes: [], dislikes: [], scraps: [],
    body, photos: [], link: "", scope: "all", comments: [], ...extra,
  });
  const posts = [
    P("then", "공지", "그때 그 시절 게시판 이용 규칙 — 남의 사진은 올리지 않아요", "admin", 6, 0, 0, "다른 사람이 나온 사진은 그 사람의 동의를 받고 올려 주세요.\n신고가 들어오면 최대 30일 동안 가려지고, 글쓴이는 이의를 신청할 수 있어요.", { notice: true }),
    P("then", "일상", "그때 유행하던 이모티콘 ^^; ㅡㅡ; 써 봅시다", "emoking", 5, 2380, 33, "다들 그때 쓰던 이모티콘 하나씩 남겨 주세요 ^^;"),
    P("then", "일상", "폴더폰 아직 갖고 계신 분? 인증해요", "byeolbit", 5, 2045, 26, "서랍 정리하다가 폴더폰 나왔어요. 충전기 찾는 중 ㅋㅋ"),
    P("then", "학교", "매점 피자빵 가격 기억하는 사람?", "maejeom", 4, 1210, 12, "제 기억엔 500원이었는데… 맞나요?"),
    P("then", "음악", "노래방 애창곡 2006년 버전 공유해요", "tambo", 4, 1540, 14, "그때 노래방 가면 무조건 부르던 노래 있잖아요. 다들 뭐였어요?"),
    P("then", "추억", "지금 다시 들어도 좋은 그 영화들…", "film", 3, 2112, 15, "비디오 가게에서 빌려 보던 그 영화들 다시 보고 있어요."),
    P("then", "일상", "2003년도의 저는 이런 사람이었네요 (일기 일부)", "jinan", 3, 1984, 19, "옛날 일기장 펼쳐 봤는데 너무 오글거려서 웃음만 나요 ㅋㅋ"),
    P("then", "게임", "피시방에서 밤새던 그때가 그립네요 ㅠㅠ", "levelup", 2, 2733, 22, "밤새고 아침에 국밥 먹던 그때… 체력이 그립다."),
    P("then", "학교", "수학여행 때 찍은 사진 찾았다! (강촌 ㅋㅋ)", "travel", 1, 4102, 27, "디카로 찍은 사진 백업해 둔 게 있더라고요. 다들 수학여행 어디 갔어요?", { photos: ["img/ym_window.png"] }),
    P("then", "음악", "그 시절 우리가 좋아했던 가요들… ♬", "music", 1, 2981, 31, "MP3에 꽉 채워 다니던 노래들 생각나요."),
    P("then", "추억", "학교 앞 문방구에서 사 먹던 불량식품들… 아직도 기억나요?", "choco", 0, 3452, 48, "쫀드기, 아폴로, 맥주사탕… 다들 최애 뭐였어요?"),
    P("then", "게임", "지금도 생각나는 그 게임… 다들 기억하죠?", "levelup", 2, 1890, 52, "학교 끝나고 친구들이랑 하던 그 게임, 아직도 브금이 기억나요."),
    P("then", "추억", "중학교 때 쓰던 다이어리 발견했어요… ㅠㅠ", "jinan", 1, 2650, 88, "스티커 붙이고 형광펜으로 꾸미던 다이어리… 펼치자마자 그때로 돌아간 기분."),
    P("then", "학교", "그 시절 교복 사진 올려보는 사람??", "travel", 3, 2210, 76, "교복 사진은 얼굴 가리고 올려 주세요 ㅎㅎ"),
    P("then", "추억", "추억의 간식 TOP 10 (사진 있음!)", "choco", 2, 2410, 64, "제 맘대로 뽑은 순위예요. 반박 환영 ㅋㅋ"),
    P("then", "게임", "2000년대 초반 PC방 썰 하나 풀어봅니다 ㅋㅋ", "levelup", 1, 3010, 93, "그때 PC방 한 시간에 천 원이었던 거 기억나세요?"),
    P("then", "음악", "그 시절 홈피 배경음악 뭐 쓰셨어요?", "haneul", 0, 3210, 96, "오늘 홈피 다시 꾸미면서 인생곡 칸을 채우는데, 그때 배경음악 고르던 기억이 확 나더라고요.\n저는 고1 때 한창 유행하던 발라드였고, 고3 때는 좀 센치하게 바꿨던 기억이 나요. 다들 그때 홈피 배경음악 뭐였어요? 연도랑 같이 댓글로 남겨 주세요 ♪", { photos: ["img/room5.png"] }),
    P("talk", "수다", "퇴근하고 다들 뭐 하세요?", "windmill", 1, 820, 9, "요즘 퇴근하면 홈피 꾸미는 게 낙이에요 ㅋㅋ"),
    P("talk", "고민", "동창 단톡방 다시 살리는 법 있을까요", "jimin", 2, 610, 13, "졸업하고 다들 바빠서 단톡이 조용해요. 다들 홈피 하나씩 만들어서 링크 뿌려 볼까 해요."),
    P("talk", "정보", "폰 사진 정리 다들 어떻게 하세요?", "film", 3, 540, 6, "앨범에 사진이 만 장이 넘었어요… 연도별로 폴더 나누는 중."),
    P("talk", "수다", "주말에 옛날 동네 다녀왔어요", "tambo", 4, 470, 8, "문방구 자리에 카페가 생겼더라고요. 그래도 골목은 그대로라 반가웠어요."),
    P("life", "육아", "아이랑 같이 볼 옛날 만화 추천해요", "lulu", 2, 640, 7, "어릴 때 보던 만화 아이랑 같이 보니까 새롭더라고요."),
    P("life", "살림", "자취 첫 해에 산 물건 아직 쓰는 거 있나요?", "choco", 3, 520, 10, "저는 그때 산 전기주전자를 아직도 써요. 10년 넘었네요."),
    P("life", "요리", "그 시절 학교 앞 떡볶이 맛 재현해 봤어요", "maejeom", 1, 700, 15, "밀떡에 물엿 듬뿍, 마지막에 어묵 국물 한 국자가 핵심이었어요."),
    P("work", "회사", "회사 메신저 상태메시지 그 시절 감성으로 바꿨어요 ㅋㅋ", "minsu", 1, 930, 11, "다들 눈치 보면서도 웃더라고요 ㅋㅋ"),
    P("work", "퇴근", "첫 월급으로 산 거 기억나세요?", "roki", 2, 880, 17, "저는 MP3 플레이어였어요. 지금 생각하면 용량이 너무 작았는데 그땐 세상을 다 가진 기분."),
    P("work", "이직", "입사 동기들이랑 홈피 만들었어요 ㅋㅋ", "windmill", 3, 590, 9, "입사 동기 단톡이 조용해서 다들 홈피 하나씩 만들자고 했어요. 서로 놀러 다니니까 재밌더라고요."),
    P("show", "내 방", "스트릿 방으로 꾸며 봤어요", "roki", 0, 1120, 24, "게임 책상이랑 기타 놓으니까 딱 그때 제 방 같아요.", { photos: ["img/room5m.png"] }),
    P("notice", "공지", "추억홈피 데모 오픈 안내", "admin", 2, 300, 0, "이 화면은 데모예요. 데이터는 이 브라우저에만 저장돼요.\n추억홈피는 다른 서비스와 관계없는 독립 서비스이며, 예전 데이터는 가져오지 않습니다.", { notice: true }),
  ];
  const bgm = posts.find(p => p.title.startsWith("그 시절 홈피 배경음악"));
  bgm.comments = [
    { id: "c1", author: "lulu", text: "2006년엔 다들 그 노래 한 번씩 걸지 않았나요? ㅋㅋ 국룰", at: ago(0, 9), likes: [], likeBase: 14 },
    { id: "c2", author: "haneul", text: "ㅋㅋㅋ 맞아요 국룰이었죠", at: ago(0, 8.9), likes: [], likeBase: 3 },
    { id: "c3", author: "jimin", text: "저는 그때 노래방 가면 맨날 그 노래만 불렀어요 ㅋㅋ", at: ago(0, 8.7), likes: [], likeBase: 22 },
  ];
  posts.find(p => p.title.startsWith("학교 앞 문방구")).comments = [{ id: "c4", author: "maejeom", text: "아폴로가 최고였죠", at: ago(0, 3), likes: [], likeBase: 2 }];

  const diaries = [], photos = [], guests = [];
  let k = 0;
  // 사람마다 다른 예시 내용(패널: "남의 홈피가 다 똑같아 볼 게 없다")
  const DY = [["오늘도 괜찮은 하루였다", "퇴근길에 하늘이 너무 예뻐서 한참 서 있었다. 그때도 지금도 하늘 보는 건 좋아.", "설렘", "맑음", "all"],
    ["괜히 기분이 좋은 날", "별일 없는데 괜히 웃음이 나는 날.", "행복", "맑음", "all"],
    ["보고 싶은 너", "비 오는 날엔 그때 그 노래. 이어폰 한쪽씩 나눠 끼던 날이 생각난다.", "센치", "비", "friends"],
    ["새로운 다짐 !", "이번 달엔 일기 꼬박꼬박 쓰기.", "행복", "흐림", "all"],
    ["첫 월급 날", "그때 산 MP3를 아직 서랍에 두고 있다. 배터리는 안 들어오지만.", "그리움", "맑음", "all"],
    ["야근 끝", "오늘은 정말 길었다. 내일은 일찍 자야지.", "피곤", "흐림", "all"],
    ["동창한테 연락 왔다", "10년 만에 연락 온 친구. 목소리가 그대로라 웃음이 났다.", "행복", "맑음", "friends"],
    ["비 오는 퇴근길", "우산 없이 뛰다가 편의점 처마 밑에서 그때 노래를 흥얼거렸다.", "센치", "비", "all"],
    ["운동 3일째", "작심삼일은 넘겼다! 내일도 가 보자.", "설렘", "맑음", "all"],
    ["주말 대청소", "옛날 다이어리랑 스티커 사진이 쏟아져 나왔다 ㅋㅋ", "그리움", "흐림", "all"],
    ["오랜만에 PC방", "손이 기억하는 그 게임. 실력은 기억 못 하더라.", "행복", "흐림", "all"],
    ["첫눈 기다리는 중", "올해는 언제 오려나. 창밖만 보게 된다.", "설렘", "눈", "all"]];
  const CAPS = [["img/y_window.png", "밤 하늘"], ["img/y_poster.png", "내 별"], ["img/y_photos.png", "스티커 사진"], ["img/ym_window.png", "도시 야경"],
    ["img/ym_poster.png", "그때 공연 포스터"], ["img/wxs_l_sunset.png", "노을 지는 창"], ["img/wxs_m_night.png", "밤 산책"], ["img/wxs_l_snow.png", "눈 오던 날"], ["img/i_polaroid.png", "폴라로이드 한 장"]];
  const MEMOS = ["오늘은 비 오는 날 노래 ♪", "주말엔 늦잠 자기 ☆", "이번 달 목표: 일기 10개", "놀러 오면 방문록 남겨 줘요 ♡", "요즘 빠진 노래 들어 보세요", "커피 한 잔 하고 갈래요?", "", "다이어트는 내일부터 ㅋㅋ"];
  const SONGS = [["그 시절 내 노래", "동네 밴드"], ["비 오는 날 듣기 좋은 노래", "창가 가수"], ["MP3 1번 트랙", "그때 그 가수"], ["졸업식 날 노래", "교복 밴드"], ["노래방 18번", "그 밴드"], ["야자 끝나고 듣던 노래", "새벽 라디오"], ["첫 월급으로 산 앨범", "퇴근길 가수"]];
  const GB = [["언제 봐도 너는 참 좋은 사람이야 :)"], ["우리 꼭 오래오래 친구하자 ! ♡"], ["다음엔 또 같이 놀자 ~"], ["방 너무 예쁘다 나도 따라 꾸민다 ㅋㅋ"], ["인생곡 나도 좋아하는 노래!"], ["놀러가기 하다가 왔어요 ~ 들렀다 갑니다"], ["다음 주 모임 올 거지?"]];
  const ids = Object.keys(U).filter(x => x !== "admin");
  ids.forEach((id, ui) => {
    const u = U[id];
    if (u.memo === "오늘은 비 오는 날 노래 ♪" && id !== "byeolbit") u.memo = MEMOS[ui % MEMOS.length];
    if (u.song.title === "그 시절 내 노래" && id !== "byeolbit") { const [t, a] = SONGS[ui % SONGS.length]; u.song = { title: t, artist: a, url: "" }; }
    for (let i = 0; i < 4; i++) { const [title, body, mood, weather, scope] = DY[(ui * 5 + i) % DY.length]; diaries.push({ id: "d" + ++k, owner: id, title, body, mood, weather, scope, at: ago([0, 2, 3, 5][i] + (ui % 3), 2 + ui % 5), likes: [], comments: [] }); }
    for (let i = 0; i < 4; i++) { const [src, caption] = CAPS[(ui * 4 + i) % CAPS.length]; photos.push({ id: "f" + ++k, owner: id, src, caption, folder: i < 2 ? "그때 그 시절" : "요즘", at: ago(i + 1 + ui % 4) }); }
    for (let i = 0; i < 3; i++) { const a = ids[(ui + i + 1) % ids.length]; if (a !== id) guests.push({ id: "g" + ++k, owner: id, author: a, text: GB[(ui + i) % GB.length][0], secret: false, at: ago(i, 5 + ui % 7), reply: "" }); }
    // 오늘 방문자(인기 홈피가 전부 "오늘 0명"이던 것)
    u.today = { d: kst().key, n: Math.max(0, Math.round(u.total / 400) + (ui * 7) % 23) };
  });
  guests.push({ id: "g" + ++k, owner: "byeolbit", author: "lulu", text: "비밀 얘기야 ㅎㅎ", secret: true, at: ago(1, 1), reply: "" });
  return {
    v: 1, me: null, myId: null, pending: null, users: U, posts, diaries, photos, guests, reports: [
      { id: "r1", type: "post", pid: posts.find(p => p.title.startsWith("수학여행")).id, reporter: "jimin", reason: "abuse", detail: "제목에 친구 별명이 있어요.", at: ago(1, 2), status: "검토 중", log: [] },
    ], requests: [], feed: [], drafts: {}, seen: {}, wx: {},
  };
}
