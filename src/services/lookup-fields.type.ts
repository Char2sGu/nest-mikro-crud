import { ExtractKeys } from "src/utils/extract-keys.type";

export type LookupFields<Entity> = ExtractKeys<Entity, string | number>;
