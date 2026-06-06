/**
 * Escapes HTML characters in a string to prevent HTML/XSS injection.
 * 
 * @param {any} val - The value to escape
 * @returns {string} The escaped string
 */
export function escapeHtml(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
