export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function pathsEqual(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b);
}
