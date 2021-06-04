import { QueryDto } from "../dtos";
import { RestService } from "../services";
import { LookupableField } from "../types";

export interface RestController<
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
  readonly service: Service;

  list(queries: QueryDto<Entity>, user: any, ...args: any[]): Promise<unknown>;

  create(
    queries: QueryDto<Entity>,
    data: CreateDto,
    user: any,
    ...args: any[]
  ): Promise<unknown>;

  retrieve(
    lookup: Entity[LookupField],
    queries: QueryDto<Entity>,
    user: any,
    ...args: any[]
  ): Promise<unknown>;

  replace(
    lookup: Entity[LookupField],
    queries: QueryDto<Entity>,
    data: CreateDto,
    user: any,
    ...args: any[]
  ): Promise<unknown>;

  update(
    lookup: Entity[LookupField],
    queries: QueryDto<Entity>,
    data: UpdateDto,
    user: any,
    ...args: any[]
  ): Promise<unknown>;

  destroy(
    lookup: Entity[LookupField],
    queries: QueryDto<Entity>,
    user: any,
    ...args: any[]
  ): Promise<unknown>;
}
