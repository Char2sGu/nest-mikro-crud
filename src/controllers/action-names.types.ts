import { ExtractKeys } from "../utils";
import { RestController } from "./rest-controller.interface";

export type ActionNames =
  | "list"
  | "create"
  | "retrieve"
  | "replace"
  | "update"
  | "destroy";
