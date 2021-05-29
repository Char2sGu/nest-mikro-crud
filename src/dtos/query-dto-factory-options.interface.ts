import {
  EntityField,
  FilterQueryParam,
  OrderQueryParam,
  RelationPath,
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
  expand?: {
    in: RelationPath<Entity>[];
    default?: RelationPath<Entity>[];
    mandatory?: RelationPath<Entity>[];
  };
  order?: {
    in: (OrderQueryParam<Entity> | EntityField<Entity>)[];
    default?: OrderQueryParam<Entity>[];
    mandatory?: OrderQueryParam<Entity>[];
  };
  filter?: {
    in: EntityField<Entity>[];
    default?: FilterQueryParam<Entity>[];
    mandatory?: FilterQueryParam<Entity>[];
  };
}
