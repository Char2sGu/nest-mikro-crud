import { AnyEntity } from "@mikro-orm/core";
import { FilterQueryParam, OrderQueryParam, RelationPath } from "../types";

export interface QueryParams<Entity extends AnyEntity<Entity> = any> {
  limit?: number;
  offset?: number;
  order?: OrderQueryParam<Entity>[];
  filter?: FilterQueryParam<Entity>[];
  expand?: RelationPath<Entity>[];
}
