/**
 * Mark a class/function/module as mocked.
 * @param v
 */
export function m<T extends (...args: any) => any>(
  v: T
): jest.MockedFunction<T>;
export function m<T extends new (...args: any) => any>(
  v: T
): jest.MockedClass<T>;
export function m<T>(v: T): jest.Mocked<T>;
export function m(v: unknown) {
  return v;
}

/**
 * Ensure the string contains a key
 *
 * @example
 * // d -> description
 * const d = buildKeyChecker<Interface>();
 *
 * describe(d(".method()"), () => {
 *    // ...
 * })
 *
 * describe(d(".property"), () => {
 *    // ...
 * })
 */
export const buildKeyChecker =
  <T>() =>
  (name: `${string}${string & keyof T}${string}`) =>
    name;
