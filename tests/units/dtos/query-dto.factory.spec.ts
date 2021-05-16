import { plainToClass } from "class-transformer";
import { validateOrReject } from "class-validator";
import { QueryDtoFactory } from "src";
import { ParentEntity } from "tests/entities";
import { buildKeyChecker } from "tests/utils";

const d = buildKeyChecker<typeof factory>();

let factory: QueryDtoFactory<ParentEntity>;
let instance: typeof factory.product.prototype;

describe(QueryDtoFactory.name, () => {
  beforeEach(() => {
    factory = new QueryDtoFactory<ParentEntity>({
      limit: { max: 2, default: 1 },
      offset: { max: 4, default: 3 },
      expand: { in: ["child1"], default: ["child2"] },
      order: { in: ["child1", "child1:asc"], default: ["id:desc"] },
    });
  });

  it("should standardize the order options", () => {
    expect(factory.options.order.in).toEqual(["child1:asc", "child1:desc"]);
  });

  describe(d(".product"), () => {
    const d = buildKeyChecker<typeof factory.product.prototype>();

    it("should assign default values when optional properties are not provided", () => {
      instance = plainToClass(factory.product, {});
      expect(instance.limit).toBe(1);
      expect(instance.offset).toBe(3);
      expect(instance.expand).toEqual(["child2"]);
      expect(instance.order).toEqual(["id:desc"]);
    });

    it.each`
      name        | value
      ${"limit"}  | ${0}
      ${"limit"}  | ${3}
      ${"limit"}  | ${"nan"}
      ${"offset"} | ${0}
      ${"offset"} | ${5}
      ${"offset"} | ${"nan"}
      ${"expand"} | ${["unknown"]}
      ${"expand"} | ${"notanarray"}
      ${"order"}  | ${["unknown"]}
      ${"order"}  | ${"notanarray"}
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
      ${"offset"} | ${2}
      ${"expand"} | ${["child1"]}
      ${"order"}  | ${["child1:desc"]}
    `(
      "should pass the validation when $name is $value",
      async ({ name, value }) => {
        await expect(
          validateOrReject(plainToClass(factory.product, { [name]: value }))
        ).rejects.toBeDefined();
      }
    );
  });
});

describe(QueryDtoFactory.name, () => {
  beforeEach(() => {
    factory = new QueryDtoFactory<any>({
      expand: { default: ["bbb"] },
      order: { default: ["aaaa:asc"] },
    });
  });

  describe(d(".product"), () => {
    it("should exclude the disabled params", () => {
      instance = plainToClass(factory.product, {
        expand: ["123"],
        order: ["abc"],
      });
      expect(instance).toEqual({ expand: ["bbb"], order: ["aaaa:asc"] });
    });
  });
});
