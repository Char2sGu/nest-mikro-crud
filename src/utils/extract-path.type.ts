import { ValueOf } from "./value-of.type";
import { ItemTypeIfIterable } from "./item-type-if-iterable.type";

/**
 * Extract all the keys that meet the condition in the target and its sub-objects and
 * connect the keys using the separator.
 *
 * @param Root - **DO NOT** specify this type!!! Used to prevent circular references.
 *
 * @example
 * type ObjType = {
 *   str: string;
 *   num: number;
 *   obj: { str: string; num: number; circular: ObjType };
 *   arr: { str: string; num: number; circular: ObjType }[];
 * };
 *
 * type T = ExtractPath<ObjType, string | number, number, "/">;
 * // type T = "str" | "obj/str" | "arr/str"
 */
export type ExtractPath<
  Target,
  Condition,
  Exclusion = never,
  Separator extends string = ".",
  Root = Target
> = ValueOf<
  {
    [K in string & keyof Target]:
      | (ItemTypeIfIterable<Target[K]> extends Exclusion
          ? never
          : ItemTypeIfIterable<Target[K]> extends Condition
          ? K
          : never)
      | (ItemTypeIfIterable<Target[K]> extends Root
          ? never
          : // @ts-expect-error - this IS NOT an infinite loop!!!!
            `${K}${Separator}${ExtractPath<
              ItemTypeIfIterable<Target[K]>,
              Condition,
              Exclusion,
              Separator,
              Root
            >}`);
  }
>;
