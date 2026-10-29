"use strict";
// 카카오·네이버 실제 로그인 어댑터(1단계: 인증만). 인터페이스: docs/backend/로그인_연동_인터페이스_2026-10-29.md
// config.js가 비어 있으면 AUTH.enabled=false — supabase-js를 불러오지 않고 아무 요청도 하지 않는다(데모 그대로).
// shortcut: 로그인만 서버, 홈피·글 등 앱 데이터는 아직 이 브라우저(localStorage)에 저장 — 실데이터 저장은 다음 단계.
const AUTH = (() => {
  const cfg = window.CHUEOK_CONFIG || {};
  const A = { enabled: !!(cfg.supabaseUrl && cfg.supabaseAnonKey), afterLogin: null };
  if (!A.enabled) return A;
  const BASE = new URL("./", location.href).href;
  const K = ["chueok.auth.pending", "chueok.auth.state", "chueok.auth.return"];
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  let sb = null;
  const ready = new Promise(ok => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js";
    s.integrity = "sha384-BWcjm9OdFth9TbhCxZPdm+gAOUMAzQy9nmTs12ioXdCcbVnJaPMn+fMUoQCLt60R";
    s.crossOrigin = "anonymous";
    s.onload = () => { try { sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { flowType: "pkce", detectSessionInUrl: false, persistSession: true, autoRefreshToken: true } }); } catch (e) { console.error(e); } ok(); };
    s.onerror = () => ok();
    document.head.appendChild(s);
  });
  const fail = msg => { throw Object.assign(new Error(msg), { ui: msg }); };

  A.signIn = async provider => {
    await ready;
    if (!sb) return toast("잠시 후 다시 시도해 주세요.");
    ss.set(K[0], provider); ss.set(K[2], location.hash);
    if (provider === "kakao") {
      const { error } = await sb.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: BASE } });
      if (error) toast("잠시 후 다시 시도해 주세요.");
    } else if (provider === "naver") {
      const state = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
      ss.set(K[1], state);
      location.href = `${cfg.supabaseUrl}/functions/v1/naver-auth?state=${state}`;
    }
  };
  A.signOut = async () => { await ready; try { await sb?.auth.signOut(); } catch (e) {} };
  A.getUser = async () => {
    await ready; if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const u = session.user;
    const { data: p } = await sb.from("profiles").select("nickname,birth_year,provider").eq("id", u.id).maybeSingle();
    return { id: u.id, provider: p?.provider ?? u.app_metadata?.chueok_provider ?? u.app_metadata?.provider,
      nickname: p?.nickname ?? "추억친구", birthYear: p?.birth_year ?? null };
  };
  A.onChange = cb => ready.then(() => sb?.auth.onAuthStateChange(() => setTimeout(async () => cb(await A.getUser()))));

  // 카카오·네이버에서 돌아왔을 때(?code=… 또는 ?error=…) — 페이지 로드 때 한 번만
  (async () => {
    const q = new URLSearchParams(location.search);
    const code = q.get("code"), err = q.get("error") || q.get("error_description");
    if (!code && !err && !q.has("state")) return;
    const pending = ss.get(K[0]);
    let ok = false;
    await ready;
    if (document.readyState === "loading") await new Promise(r => addEventListener("DOMContentLoaded", r));  // start.js·첫 route()가 끝난 뒤 처리한다(supabase-js가 캐시로 먼저 올 수 있음)
    try {
      if (!pending) return;  // 남이 보낸 링크: 처리하지 않고 주소만 지운다
      if (err) fail("로그인을 취소했어요.");
      if (!sb) fail("잠시 후 다시 시도해 주세요.");
      if (pending === "kakao") {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) fail(/database/i.test(error.message || "") ? "가입할 수 없는 계정이에요." : "잠시 후 다시 시도해 주세요.");
      } else if (pending === "naver") {
        if (!q.get("state") || q.get("state") !== ss.get(K[1])) fail("다시 로그인해 주세요.");
        const r = await fetch(`${cfg.supabaseUrl}/functions/v1/naver-auth`, { method: "POST",
          headers: { "Content-Type": "application/json", apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` },
          body: JSON.stringify({ code, state: q.get("state") }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) fail(j.error === "age" ? "만 14세 이상만 가입할 수 있어요." : j.error === "banned" ? `이용이 제한된 계정이에요${j.until ? `(${String(j.until).slice(0, 10)}까지)` : ""}.` : "잠시 후 다시 시도해 주세요.");
        const { error } = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: "email" });
        if (error) fail("잠시 후 다시 시도해 주세요.");
      } else return;
      ok = true;
    } catch (e) { toast(e.ui || "잠시 후 다시 시도해 주세요."); if (!e.ui) console.error(e); }
    finally {
      const back = ss.get(K[2]) || "";
      K.forEach(k => { try { sessionStorage.removeItem(k); } catch (e) {} });
      history.replaceState(null, "", BASE + (/^#\/[\w\/%?=&.+-]*$/.test(back) ? back : ""));  // code·state를 주소에서 지운다
      const u = ok && await A.getUser().catch(() => null);
      if (u && A.afterLogin) A.afterLogin(u); else route();
      if (ok && !u) toast("잠시 후 다시 시도해 주세요.");
    }
  })();
  return A;
})();
