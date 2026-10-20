const prefix = "vibetube:" + import.meta.env.BASE_URL;
export function read<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(prefix + key) || "null");
    if (
      v === null ||
      typeof v !== typeof fallback ||
      (Array.isArray(fallback) && !Array.isArray(v))
    )
      return fallback;
    return v;
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(prefix + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
