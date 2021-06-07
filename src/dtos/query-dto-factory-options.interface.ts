import {
  EntityField,
  FilterQueryParam,
  OrderQueryParam,
  ScalarPath,
} from "../types";

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
    in: (OrderQueryParam<Entity> | ScalarPath<Entity>)[];
    default?: OrderQueryParam<Entity>[];
  };
  filter?: {
    in: EntityField<Entity>[];
    default?: FilterQueryParam<Entity>[];
  };
}
