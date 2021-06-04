import { Type, ValidationPipeOptions } from "@nestjs/common";
import { QueryDto } from "../dtos";
import { RestService } from "../services";
import { ActionName, LookupableField } from "../types";

export interface RestControllerFactoryOptions<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupableField<Entity> = LookupableField<Entity>,
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
  restServiceClass: Type<Service>;
  /**
   * Specify which actions should be enabled.
   */
  actions: ActionName[];
  /**
   * Use specific dto for more advanced settings of the query params.
   */
  queryDtoClass?: Type<QueryDto<Entity>>;
  /**
   * Specify the parameter name for entity lookup in the URL
   */
  lookupParam?: string;
  requestUser?: { type?: Type; decorators: ParameterDecorator[] };
  /**
   * - `transform` will be forced to be `true`
   * - `transformOptions.exposeDefaultValues` will be forced to be `true`
   */
  validationPipeOptions?: ValidationPipeOptions;
}
