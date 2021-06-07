import { NonFunctionPropertyNames } from "@mikro-orm/core/typings";
import { FilterQueryParam, OrderQueryParam, ScalarPath } from "../types";

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
    in: ScalarPath<Entity>[];
    default?: FilterQueryParam<Entity>[];
  };
}
