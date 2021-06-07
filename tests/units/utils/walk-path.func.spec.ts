import { walkPath } from "src";

describe(walkPath.name, () => {
  describe.each`
    obj                       | path       | args               | after
    ${{}}                     | ${"a.b.c"} | ${[{}, "c"]}       | ${{ a: { b: {} } }}
    ${{ a: { b: { c: 1 } } }} | ${"a.b.c"} | ${[{ c: 1 }, "c"]} | ${{ a: { b: { c: 1 } } }}
    ${{}}                     | ${"a"}     | ${[{}, "a"]}       | ${{}}
    ${{}}                     | ${""}      | ${[{}, ""]}        | ${{}}
  `("obj: $obj path: $path", ({ obj, path, args, after }) => {
    const callback = jest.fn();

    beforeEach(() => {
      walkPath(obj, path, callback);
    });

    it(`should call the callback with ${args}`, () => {
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(...args);
    });

    it(`should make the object ${after}`, () => {
      expect(obj).toEqual(after);
    });
  });
});
