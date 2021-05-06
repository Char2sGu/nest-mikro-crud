import { QueryDto } from "../dtos";
import { LookupFields, RestService } from "../services";

export interface RestController<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>,
  CustomArgs extends any[] = any[]
> {
  readonly service: RestService<
    Entity,
    CreateDto,
    UpdateDto,
    LookupField,
    CustomArgs
  >;

  list(queries: QueryDto<Entity>, ...args: CustomArgs): Promise<unknown>;

  create(
    queries: QueryDto<Entity>,
    dto: CreateDto,
    ...args: CustomArgs
  ): Promise<unknown>;

  retrieve(
    lookup: Entity[LookupField],
    queries: QueryDto<Entity>,
    ...args: CustomArgs
  ): Promise<unknown>;

  replace(
    lookup: Entity[LookupField],
    queries: QueryDto<Entity>,
    dto: CreateDto,
    ...args: CustomArgs
  ): Promise<unknown>;

  update(
    lookup: Entity[LookupField],
    queries: QueryDto<Entity>,
    dto: UpdateDto,
    ...args: CustomArgs
  ): Promise<unknown>;

  destroy(
    lookup: Entity[LookupField],
    queries: QueryDto<Entity>,
    ...args: CustomArgs
  ): Promise<unknown>;
}
