import { ExtractNestedKeys } from "../utils";

export type RelationPath<Entity> = ExtractNestedKeys<
  Entity,
  null | Record<string, any> | Record<string, any>[],
  Function
>;
