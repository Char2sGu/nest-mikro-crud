import { ExtractPath } from "../utils";

export type RelationPath<Entity> = ExtractPath<
  Entity,
  null | Record<string, any> | Record<string, any>[],
  Function
>;
