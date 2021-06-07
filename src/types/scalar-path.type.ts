import { Scalar } from "@mikro-orm/core/typings";
import { ExtractPath } from "src/utils";

export type ScalarPath<Entity> = ExtractPath<Entity, Scalar>;
