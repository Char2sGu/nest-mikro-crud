import { Scalar } from "@mikro-orm/core/typings";
import { ExtractPath } from "src/utils";

/**
 * _`String.length` is not excluded because excluding it will cause performance problems_
 */
export type ScalarPath<Entity> = ExtractPath<Entity, Scalar>;
