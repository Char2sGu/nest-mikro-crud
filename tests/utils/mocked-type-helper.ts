export function _<T extends (...args: any) => any>(
  v: T
): jest.MockedFunction<T>;
export function _<T extends new (...args: any) => any>(
  v: T
): jest.MockedClass<T>;
export function _<T>(v: T): jest.Mocked<T>;
export function _(v: unknown) {
  return v;
}
