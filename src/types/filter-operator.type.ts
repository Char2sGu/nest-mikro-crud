import { FILTER_OPERATORS } from "../constants";

export type FilterOperator = typeof FILTER_OPERATORS[Extract<
  keyof typeof FILTER_OPERATORS,
  number
>];
