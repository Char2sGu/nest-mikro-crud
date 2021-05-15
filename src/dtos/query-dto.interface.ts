import { OrderQueryParam, RelationPath } from "../types";

export interface QueryDto<Entity = any> {
  limit?: number;
  offset?: number;
  expand?: RelationPath<Entity>[];
  order?: OrderQueryParam<Entity>[];
}
