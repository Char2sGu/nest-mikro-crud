import { ExtractKeys } from "../utils";
import { RestController } from "./rest-controller.interface";

export type RouteNames = ExtractKeys<RestController, (...args: any[]) => any>;
