import { BaseEntity } from "@mikro-orm/core";
import { FilterQueryParam, OrderQueryParam, RelationPath } from "../types";

export interface QueryDto<Entity extends BaseEntity<any, any> = any> {
  limit?: number;
  offset?: number;
  order?: OrderQueryParam<Entity>[];
  filter?: FilterQueryParam<Entity>[];
}
