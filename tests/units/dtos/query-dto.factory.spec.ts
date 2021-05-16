import { QueryDtoFactory } from "src";
import { ParentEntity } from "tests/entities";

describe(QueryDtoFactory.name, () => {
  let factory: QueryDtoFactory<ParentEntity>;

  describe("()", () => {
    beforeEach(() => {
      factory = new QueryDtoFactory({
        order: { in: ["child1", "child1:asc"] },
      });
    });

    it("should standardize the order options", () => {
      expect(factory.options.order.in).toEqual(["child1:asc", "child1:desc"]);
    });
  });
});
