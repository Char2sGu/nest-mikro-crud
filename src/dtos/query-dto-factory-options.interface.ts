import { EntityField, FilterQueryParam, OrderQueryParam } from "../types";

export interface QueryDtoFactoryOptions<Entity> {
  limit?: {
    max?: number;
    default?: number;
  };
  offset?: {
    max?: number;
    default?: number;
  };
  order?: {
    in: (OrderQueryParam<Entity> | EntityField<Entity>)[];
    default?: OrderQueryParam<Entity>[];
  };
  filter?: {
    in: EntityField<Entity>[];
    default?: FilterQueryParam<Entity>[];
  };
}
