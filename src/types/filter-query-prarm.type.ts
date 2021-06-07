import { NonFunctionPropertyNames } from "@mikro-orm/core/typings";
import { FilterOperator } from "./filter-operator.type";

export type FilterQueryParam<Entity> = `${string &
  NonFunctionPropertyNames<Entity>}|${FilterOperator}:${string}`;
