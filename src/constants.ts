export const TS_PARAM_TYPES_METADATA_KEY = "design:paramtypes";
export const TS_TYPE_METADATA_KEY = "design:type";

/**Store the factory creating the class. */
export const REST_FACTORY_METADATA_KEY = Symbol("rest:factory");

export const FILTER_OPERATORS = [
  "eq",
  "gt",
  "gte",
  "in",
  "lt",
  "lte",
  "ne",
  "nin",
  "like",
  "ilike",
  "isnull",
  "notnull",
] as const;
