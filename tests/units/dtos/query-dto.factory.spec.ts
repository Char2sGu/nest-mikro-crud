import { plainToClass } from "class-transformer";
import { validateOrReject } from "class-validator";
import { QueryDtoFactory } from "src";
import { ParentEntity } from "tests/entities";
import { buildKeyChecker } from "tests/utils";

const d = buildKeyChecker<typeof factory>();

let factory: QueryDtoFactory<ParentEntity>;
let instance: typeof factory.product.prototype;

describe(QueryDtoFactory.name, () => {
  describe("Default", () => {
    beforeEach(() => {
      factory = new QueryDtoFactory<ParentEntity>({
        limit: { default: 1 },
        offset: { default: 2 },
        expand: { in: [], default: ["children"] },
        order: { in: [], default: ["id:asc"] },
        filter: { in: [], default: ["id|eq:1"] },
      });
    });

    describe(d(".product"), () => {
      it("should use the default values when value not provided", () => {
        const ret = plainToClass(factory.product, {});
        expect(ret).toEqual({
          limit: 1,
          offset: 2,
          expand: ["children"],
          order: ["id:asc"],
          filter: ["id|eq:1"],
        });
      });
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      factory = new QueryDtoFactory<ParentEntity>({
        limit: { max: 1 },
        offset: { max: 1 },
        expand: { in: ["children"] },
        order: { in: ["id", "id:asc"] },
        filter: { in: ["id"] },
      });
    });

    it.each`
      name        | value
      ${"limit"}  | ${0}
      ${"limit"}  | ${2}
      ${"limit"}  | ${"NaN"}
      ${"offset"} | ${0}
      ${"offset"} | ${2}
      ${"offset"} | ${"NaN"}
      ${"expand"} | ${["unknown"]}
      ${"expand"} | ${"notanarray"}
      ${"order"}  | ${["unknown"]}
      ${"order"}  | ${"notanarray"}
      ${"filter"} | ${["illegal"]}
      ${"filter"} | ${["   id|eq:1"]}
      ${"filter"} | ${["iiii|eq:1"]}
      ${"filter"} | ${["id|eqqq:1"]}
      ${"filter"} | ${"notanarray"}
    `(
      "should throw an error when `$name` is $value",
      async ({ name, value }) => {
        await expect(
          validateOrReject(plainToClass(factory.product, { [name]: value }))
        ).rejects.toBeDefined();
      }
    );

    it.each`
      name        | value
      ${"limit"}  | ${1}
      ${"offset"} | ${1}
      ${"expand"} | ${["children"]}
      ${"order"}  | ${["id:asc"]}
      ${"filter"} | ${["id|eq:"]}
    `(
      "should pass the validation when $name is $value",
      async ({ name, value }) => {
        await expect(
          validateOrReject(plainToClass(factory.product, { [name]: value }))
        ).resolves.toBeUndefined();
      }
    );
  });

  describe("Mandatory", () => {
    beforeEach(() => {
      factory = new QueryDtoFactory<any>({
        expand: { in: [], mandatory: ["a", "v1"] },
        order: { in: [], mandatory: ["b:asc", "v2:asc"] },
        filter: { in: [], mandatory: ["c|eq:", "v3|eq:"] },
      });
    });

    it("should append the mandatory values and deduplicate", () => {
      const ret = plainToClass(factory.product, {
        expand: ["a"],
        order: ["b:asc"],
        filter: ["c|eq:"],
      });
      expect(ret).toEqual({
        expand: ["a", "v1"],
        order: ["b:asc", "v2:asc"],
        filter: ["c|eq:", "v3|eq:"],
      });
    });

    it("should not append the mandatory values when value not provided", () => {
      const ret = plainToClass(factory.product, {});
      expect(ret).toEqual({});
    });
  });

  describe("Exclusion", () => {
    beforeEach(() => {
      factory = new QueryDtoFactory<any>({});
    });

    describe(d(".product"), () => {
      it("should exclude the disabled params", () => {
        instance = plainToClass(factory.product, {
          expand: ["a"],
          order: ["b"],
          filter: ["c"],
        });
        expect(instance).toEqual({});
      });
    });
  });
});
