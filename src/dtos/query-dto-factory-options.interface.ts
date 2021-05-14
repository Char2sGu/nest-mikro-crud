import { RelationPaths } from "../types";

export interface QueryDtoFactoryOptions<Entity> {
  limit?: { max?: number; default?: number };
  offset?: { max?: number; default?: number };
  expand?: { in: RelationPaths<Entity>[] };
}
