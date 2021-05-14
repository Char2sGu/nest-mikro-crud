import { RelationPath } from "../types";

export interface QueryDtoFactoryOptions<Entity> {
  limit?: Partial<Record<"max" | "default", number>>;
  offset?: Partial<Record<"max" | "default", number>>;
  expand?: Partial<Record<"in" | "default", RelationPath<Entity>[]>>;
}
