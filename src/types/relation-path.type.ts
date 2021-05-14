import { ExtractNestedKeys } from "../utils";

export type RelationPath<Entity> = ExtractNestedKeys<
  Entity,
  Record<string, any>
>;
