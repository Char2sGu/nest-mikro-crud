import { Values } from "./values.type";

/**
 * Extract from `T` those keys whose values are assignable to `U`.
 */
export type ExtractKeys<T, U> = Values<
  {
    [K in keyof T]: T[K] extends U ? K : never;
  }
>;
