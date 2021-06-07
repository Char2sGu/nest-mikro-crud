import { Scalar } from "@mikro-orm/core/typings";
import { ExtractPath } from "src/utils";

/**
 * _`String.length` is not excluded because excluding it will cause performance problems_
 *
 * To exclude length
 * @example
 * Exclude<ExtractPath<Entity, Scalar>, `${string}.length`>;
 */
export type ScalarPath<Entity> = ExtractPath<Entity, Scalar>;
