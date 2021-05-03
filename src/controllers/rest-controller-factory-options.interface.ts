import { ClassConstructor } from "class-transformer";
import { ListQueryDto } from "../dtos";
import { LookupFields, RestService } from "../services";
import { RouteNames } from "./route-names.types";

export interface RestControllerFactoryOptions<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>,
  CustomArgs extends any[] = any[]
> {
  /**
   * The service will be auto-injected for db CRUD actions.
   */
  restServiceClass: ClassConstructor<
    RestService<Entity, CreateDto, UpdateDto, LookupField, CustomArgs>
  >;
  /**
   * Specify which routes should be enabled.
   */
  routes: RouteNames[];
  /**
   * Use specific dto for more advanced settings, such as default values or
   * max values.
   */
  listQueryDto?: ClassConstructor<ListQueryDto>;
  /**
   * Custom the rest arguments which will be passed in every method
   * of both the controller and the service, allowing you to get more
   * context data.
   */
  customArgs?: [ClassConstructor<any>, ParameterDecorator[]][];
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
