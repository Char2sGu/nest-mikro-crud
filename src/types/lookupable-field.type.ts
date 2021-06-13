import { ExtractKey } from "../utils";

export type LookupableField<Entity> = string &
  ExtractKey<Entity, string | number>;
