import { FindOptions } from "@mikro-orm/core";

export interface EntityFilters {
  (user?: any): FindOptions<never>["filters"];
}
