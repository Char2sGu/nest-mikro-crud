import { RelationPaths } from "../types";

export interface QueryDto<Entity = any> {
  limit?: number;
  offset?: number;
  expand: RelationPaths<Entity>[];
}
