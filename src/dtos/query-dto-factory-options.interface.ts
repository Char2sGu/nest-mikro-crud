import { EntityField, OrderQueryParam, RelationPath } from "../types";

export interface QueryDtoFactoryOptions<Entity> {
  limit?: Partial<Record<"max" | "default", number>>;
  offset?: Partial<Record<"max" | "default", number>>;
  expand?: Partial<Record<"in" | "default", RelationPath<Entity>[]>>;
  order?: {
    in?: (OrderQueryParam<Entity> | EntityField<Entity>)[];
    default?: OrderQueryParam<Entity>[];
  };
}
