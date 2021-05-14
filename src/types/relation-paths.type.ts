import { ExtractNestedKeys } from "../utils";

export type RelationPaths<Entity> = ExtractNestedKeys<
  Entity,
  Record<string, any>
>;
