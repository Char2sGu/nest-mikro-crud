import { ExtractKeys } from "../utils";

export type LookupableField<Entity> = Extract<
  ExtractKeys<Entity, string | number>,
  string
>;
