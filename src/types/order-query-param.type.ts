import { EntityField } from "./entity-field.type";

export type OrderQueryParam<Entity> = `${EntityField<Entity>}:${
  | "asc"
  | "desc"}`;
