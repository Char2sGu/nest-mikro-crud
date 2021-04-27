import { ClassConstructor } from "class-transformer";
import { RestService } from "src/services";
import { RouteNames } from "./route-names.types";

export interface RestControllerFactoryOptions<
  Service extends RestService = RestService
> {
  restServiceClass: ClassConstructor<Service>;
  routes: RouteNames[];
  lookupParam?: string;
}
