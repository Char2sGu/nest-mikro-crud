export function walkPath(
  obj: Record<string, unknown>,
  path: string,
  callback: (obj: Record<string, any>, key: string) => unknown
) {
  /**The keys to approach the target object */
  const keys = path.split(".");
  /**The key to the value of the target object */
  const key = keys.pop()!;
  // approach the target object
  keys.forEach((key) => (obj = (obj[key] as typeof obj) ?? (obj[key] = {})));

  callback(obj, key);
  return obj[key];
}
