import { ExtractKeys } from "./extract-keys.type";
import { Values } from "./values.type";

type NestedObj = Record<PropertyKey, any>;
type ExtractLegalKeys<T, C> = Extract<ExtractKeys<T, C | NestedObj>, string>;

/**
 * Extract all the keys that meet the condition in the target and its sub-objects and
 * connect the keys using the separator.
 *
 * **NOTE**: This type may cause performance problems.
 *
 * @param Root - Be used to prevent circular reference, set to `never` to disable.
 * @example
 * type O = {
 *   a: string;
 *   b: number;
 *   c: {
 *     d: string;
 *     e: number;
 *     f: {
 *       g: string;
 *       h: number;
 *       i: O;
 *     };
 *   };
 * };
 * type T = ExtractNestedKeys<O, number, "/">; // "b" | "c/e" | "c/f/h"
 */
export type ExtractNestedKeys<
  Target,
  Condition,
  Separator extends string = ".",
  Root = Target
> = Values<
  {
    [K in ExtractLegalKeys<Target, Condition>]: Target[K] extends Condition
      ? Target[K] extends Root // prevent circular reference
        ? K
        : ExtractLegalKeys<Target[K], Condition> extends never
        ? K
        :
            | K
            | `${K}${Separator}${ExtractNestedKeys<
                Target[K],
                Condition,
                Separator,
                Root
              >}`
      : ExtractLegalKeys<Target[K], Condition> extends never
      ? never
      : Target[K] extends Root
      ? never
      : `${K}${Separator}${ExtractNestedKeys<
          Target[K],
          Condition,
          Separator,
          Root
        >}`;
  }
>;
