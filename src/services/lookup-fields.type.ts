import { ExtractKeys } from "src/utils/extract-keys.type";

export type LookupFields<Entity> = Extract<
  ExtractKeys<Entity, string | number>,
  string
>;
