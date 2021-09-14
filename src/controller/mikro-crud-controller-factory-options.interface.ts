import { AnyEntity, EntityData } from "@mikro-orm/core";
import { Type, ValidationPipeOptions } from "@nestjs/common";
import { QueryParams } from "../dto";
import { MikroCrudService } from "../service";
import { ActionName, LookupableField, PkType } from "../types";

export interface MikroCrudControllerFactoryOptions<
  Entity extends AnyEntity<Entity> = any,
  CreateDto extends EntityData<Entity> = EntityData<Entity>,
  UpdateDto extends EntityData<Entity> = EntityData<Entity>,
  LookupField extends LookupableField<Entity> = LookupableField<Entity>,
  Service extends MikroCrudService<
    Entity,
    CreateDto,
    UpdateDto
  > = MikroCrudService<Entity, CreateDto, UpdateDto>
> {
  /**
   * The service will be auto-injected for db CRUD actions.
   */
  serviceClass: Type<Service>;
  /**
   * Specify which actions should be enabled.
   */
  actions: ActionName[];
  /**
   * Use specific DTO for more advanced settings of the query params.
   */
  queryParamsClass?: Type<QueryParams<Entity>>;
  lookup: {
    /**
     * Choose the field used for entity lookup.
     */
    field: LookupField;
    /**
     * Specify the data type of field to lookup. Will be inferred from the metadata
     * type if not specified: Number -> "number", String -> "uuid"
     */
    type?: PkType;
    /**
     * Specify the parameter name for entity lookup in the URL
     */
    name?: string;
  };
  requestUser?: { type?: Type; decorators: ParameterDecorator[] };
  /**
   * - `transform` will be forced to be `true`
   * - `transformOptions.exposeDefaultValues` will be forced to be `true`
   */
  validationPipeOptions?: ValidationPipeOptions;
}
