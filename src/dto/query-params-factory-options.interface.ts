import {
  FilterQueryParam,
  OrderQueryParam,
  RelationPath,
  ScalarPath,
} from "../types";

export interface QueryParamsFactoryOptions<Entity> {
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
  expand?: {
    in: RelationPath<Entity>[];
    default?: RelationPath<Entity>[];
  };
}
