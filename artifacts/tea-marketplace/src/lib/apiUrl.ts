const API_BASE = "/api/v1/tea";

export function apiUrl(path: string): string {
  return path.replace(/^\/api(?=\/|\?|#|$)/, API_BASE);
}