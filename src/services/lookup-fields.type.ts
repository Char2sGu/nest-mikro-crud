import { ExtractKeys } from "src/utils";

export type LookupFields<Entity> = Extract<
  ExtractKeys<Entity, string | number>,
  string
>;
