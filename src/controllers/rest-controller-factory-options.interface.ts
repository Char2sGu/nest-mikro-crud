import { ValidationPipeOptions } from "@nestjs/common";
import { ClassConstructor } from "class-transformer";
import { QueryDto } from "../dtos";
import { RestService } from "../services";
import { LookupFields } from "../types";
import { ActionNames } from "../types/action-names.types";

export interface RestControllerFactoryOptions<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>,
  Service extends RestService<
    Entity,
    CreateDto,
    UpdateDto,
    LookupField
  > = RestService<Entity, CreateDto, UpdateDto, LookupField>
> {
  /**
   * The service will be auto-injected for db CRUD actions.
   */
  restServiceClass: ClassConstructor<Service>;
  /**
   * Specify which actions should be enabled.
   */
  actions: ActionNames[];
  /**
   * Use specific dto for more advanced settings of the query params.
   */
  queryDto?: ClassConstructor<QueryDto<Entity>>;
  /**
   * Specify the parameter name for entity lookup in the URL
   */
  lookupParam?: string;
  /**
   * Specify whether to apply the filter to catch TypeORM's NotFoundException
   * and throw NestJS's EntityNotFoundException instead
   */
  catchEntityNotFound?: boolean;
  /**
   * - `transform` will be forced to be `true`
   * - `transformOptions.exposeDefaultValues` will be forced to be `true`
   */
  validationPipeOptions?: ValidationPipeOptions;
  /**
   * Custom additional context data.
   *
   * @example
   * { user: { type: User, decorators: [ReqUser()] } }
   * class YourService extends ... {
   *   getQueryConditions({ user }) {
   *   }
   * }
   */
  contextOptions?: Record<
    string,
    { type?: ClassConstructor<unknown>; decorators: ParameterDecorator[] }
  >;
}
