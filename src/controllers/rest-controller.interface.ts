import { QueryDto } from "../dtos";
import { LookupFields, RestService } from "../services";

export interface RestController<
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
  readonly service: Service;

  list(queries: QueryDto<Entity>, ...args: any[]): Promise<unknown>;

  create(
    queries: QueryDto<Entity>,
    data: CreateDto,
    ...args: any[]
  ): Promise<unknown>;

  retrieve(
    lookup: Entity[LookupField],
    queries: QueryDto<Entity>,
    ...args: any[]
  ): Promise<unknown>;

  replace(
    lookup: Entity[LookupField],
    queries: QueryDto<Entity>,
    data: CreateDto,
    ...args: any[]
  ): Promise<unknown>;

  update(
    lookup: Entity[LookupField],
    queries: QueryDto<Entity>,
    data: UpdateDto,
    ...args: any[]
  ): Promise<unknown>;

  destroy(lookup: Entity[LookupField], ...args: any[]): Promise<unknown>;

  /**
   * Pack the args into an object which will pass to each method of the service
   * accroding to context options.
   */
  prepareContext(args: unknown[]): Promise<Record<string, unknown>>;
}
