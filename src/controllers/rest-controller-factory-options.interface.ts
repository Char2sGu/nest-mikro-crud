import { ClassConstructor } from "class-transformer";
import { RestService } from "../services";
import { RouteNames } from "./route-names.types";

export interface RestControllerFactoryOptions<
  Service extends RestService = RestService,
  ContextArgs extends any[] = any[]
> {
  /**
   * The service will be auto-injected for db CRUD actions.
   */
  restServiceClass: ClassConstructor<Service>;
  /**
   * Specify which routes should be enabled.
   */
  routes: RouteNames[];
  /**
   * Custom the rest arguments which will be passed in every method
   * of both the controller and the service, allowing you to get more
   * context data.
   */
  customArgs?: {
    description: [ClassConstructor<any>, ParameterDecorator[]][];
    typeHelper: (...args: ContextArgs) => any;
  };
  /**
   * Specify the parameter name for entity lookup in the URL
   */
  lookupParam?: string;
  /**
   * Specify whether to apply the filter to catch TypeORM's NotFoundException
   * and throw NestJS's EntityNotFoundException instead
   */
  catchEntityNotFound?: boolean;
}
