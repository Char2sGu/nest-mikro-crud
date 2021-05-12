import { ExtractKeys } from "../utils";
import { RestController } from "./rest-controller.interface";

export type ActionNames = ExtractKeys<RestController, (...args: any[]) => any>;
