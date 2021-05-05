import { RelationPaths } from "./relation-paths.type";

export interface QueryDto<Entity = any> {
  limit?: number;
  offset?: number;
  expand: RelationPaths<Entity>[];
}
