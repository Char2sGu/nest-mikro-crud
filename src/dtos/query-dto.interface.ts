import { RelationPath } from "../types";

export interface QueryDto<Entity = any> {
  limit?: number;
  offset?: number;
  expand?: RelationPath<Entity>[];
}
