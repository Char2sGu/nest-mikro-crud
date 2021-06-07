import { Values } from "./values.type";

/**
 * Extract all the keys that meet the condition in the target and its sub-objects and
 * connect the keys using the separator.
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
 * type T = ExtractNestedKeys<O, string | number, string, "/">;
 * // "b" | "a/length" | "c/e" | "c/d/length" | "c/f/h" | "c/f/g/length"
 */
export type ExtractNestedKeys<
  Target,
  Condition,
  Exclusion = never,
  Separator extends string = ".",
  Root = Target
> = Values<
  {
    [K in string & keyof Target]:
      | (Target[K] extends Exclusion
          ? never
          : Target[K] extends Condition
          ? K
          : never)
      | (Target[K] extends Root
          ? never
          : // @ts-expect-error - this IS NOT an infinite loop!!!!
            `${K}${Separator}${ExtractNestedKeys<
              Target[K],
              Condition,
              Exclusion,
              Separator,
              Root
            >}`);
  }
>;
