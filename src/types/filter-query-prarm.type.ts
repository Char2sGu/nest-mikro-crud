import { EntityField } from "./entity-field.type";
import { FilterOperator } from "./filter-operator.type";

export type FilterQueryParam<Entity> =
  `${EntityField<Entity>}|${FilterOperator}:${string}`;
