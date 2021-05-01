import { ExtractKeys } from "../utils";

export type LookupFields<Entity> = Extract<
  ExtractKeys<Entity, string | number>,
  string
>;
