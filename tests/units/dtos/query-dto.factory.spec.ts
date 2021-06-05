import { BaseEntity } from "@mikro-orm/core";
import { plainToClass } from "class-transformer";
import { validateOrReject } from "class-validator";
import { QueryDtoFactory } from "src";
import { buildKeyChecker } from "tests/utils";

const d = buildKeyChecker<typeof factory>();

interface Entity extends BaseEntity<Entity, "id"> {
  id: number;
}

let factory: QueryDtoFactory<Entity>;
let instance: typeof factory.product.prototype;

describe(QueryDtoFactory.name, () => {
  describe("Default", () => {
    beforeEach(() => {
      factory = new QueryDtoFactory<Entity>({
        limit: { default: 1 },
        offset: { default: 2 },
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
          order: ["id:asc"],
          filter: ["id|eq:1"],
        });
      });
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      factory = new QueryDtoFactory<Entity>({
        limit: { max: 1 },
        offset: { max: 1 },
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

  describe("Exclusion", () => {
    beforeEach(() => {
      factory = new QueryDtoFactory<any>({});
    });

    describe(d(".product"), () => {
      it("should exclude the disabled params", () => {
        instance = plainToClass(factory.product, {
          order: ["b"],
          filter: ["c"],
        });
        expect(instance).toEqual({});
      });
    });
  });
});
