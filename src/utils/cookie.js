// utils/cookie.js

/**
 * @param {Request} request
 * @returns {string}
 */
export function getJWTFromRequest(request) {
  const cookies = request.headers.get("cookie") || '';
  /** @param {string} cookie */
  const jwtCookie = cookies.split(';').find(cookie => cookie.trim().startsWith('UserSession='));

  if (jwtCookie) {
    return jwtCookie.split('=')[1] || '';
  }

  return '';
}
