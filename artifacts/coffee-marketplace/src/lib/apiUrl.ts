const API_BASE = "/api/v1/coffee";

export function apiUrl(path: string): string {
  return path.replace(/^\/api(?=\/|\?|#|$)/, API_BASE);
}