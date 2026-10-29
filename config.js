// 실제 카카오·네이버 로그인 설정. 비어 있으면 데모 모드(로그인 흉내, 외부 요청 없음).
// 사장님이 Supabase 프로젝트를 만든 뒤 Project URL과 anon(public) key만 넣는다 — anon key는 브라우저 공개용이다.
// service_role(secret) 키는 절대 넣지 말 것. 공개 주소에서 켜기 전 조건: docs/backend/로그인_연동_인터페이스_2026-10-29.md 맨 위 경고.
window.CHUEOK_CONFIG = { supabaseUrl: "", supabaseAnonKey: "" };
