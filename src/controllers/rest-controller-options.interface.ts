import { ClassTransformOptions } from "@nestjs/common/interfaces/external/class-transform-options.interface";
import { ClassConstructor } from "class-transformer";
import { RestService } from "src/services/rest-service.interface";
import { RouteNames } from "./route-names.types";

export interface RestControllerOptions<
  Service extends RestService = RestService
> {
  restServiceClass: ClassConstructor<Service>;
  routes: RouteNames[];
  lookupParam?: string;
  serializationOptions?: ClassTransformOptions;
}
