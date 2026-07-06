const KEY = "peregrine:anthropic-api-key";

export function getUserApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY) ?? "";
}

export function setUserApiKey(key: string) {
  if (typeof window === "undefined") return;
  if (key.trim()) {
    localStorage.setItem(KEY, key.trim());
  } else {
    localStorage.removeItem(KEY);
  }
}

export function getAiHeaders(): Record<string, string> {
  const key = getUserApiKey();
  return key ? { "X-User-Anthropic-Key": key } : {};
}
