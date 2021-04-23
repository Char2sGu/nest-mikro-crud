import { ExtractKeys } from "src/utils/extract-keys.type";
import { RestController } from "./rest-controller.interface";

export type RouteNames = ExtractKeys<RestController, (...args: any[]) => any>;
