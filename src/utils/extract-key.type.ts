import { ValueOf } from "./value-of.type";

/**
 * Extract from `T` those keys whose values are assignable to `U`.
 */
export type ExtractKey<T, U> = ValueOf<
  {
    [K in keyof T]: T[K] extends U ? K : never;
  }
>;
