import { ExtractKeys } from "src/utils";
import { RestController } from "./rest-controller.interface";

export type RouteNames = ExtractKeys<RestController, (...args: any[]) => any>;
