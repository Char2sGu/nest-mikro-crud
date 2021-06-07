import { ExtractKey } from "../utils";

export type LookupableField<Entity> = Extract<
  ExtractKey<Entity, string | number>,
  string
>;
