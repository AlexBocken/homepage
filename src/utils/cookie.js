// utils/cookie.js
export function getJWTFromRequest(request) {
  const cookies = request.headers.get("cookie") || '';
  const jwtCookie = cookies.split(';').find(cookie => cookie.trim().startsWith('UserSession='));

  if (jwtCookie) {
    return jwtCookie.split('=')[1] || '';
  }

  return '';
}
