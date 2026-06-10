/** 세션 유지 시간(초). 로그인 시점부터 고정 — 활동으로 연장되지 않음 */
export const SESSION_MAX_AGE_SECONDS =
  process.env.NEXTAUTH_SESSION_MAX_AGE &&
  !Number.isNaN(Number(process.env.NEXTAUTH_SESSION_MAX_AGE))
    ? Number(process.env.NEXTAUTH_SESSION_MAX_AGE)
    : 10 * 60
