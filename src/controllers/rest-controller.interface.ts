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

  list(query: QueryDto, ...args: CustomArgs): Promise<Entity[]>;

  create(dto: CreateDto, ...args: CustomArgs): Promise<Entity>;

  retrieve(lookup: Entity[LookupField], ...args: CustomArgs): Promise<Entity>;

  replace(
    lookup: Entity[LookupField],
    dto: CreateDto,
    ...args: CustomArgs
  ): Promise<Entity>;

  update(
    lookup: Entity[LookupField],
    dto: UpdateDto,
    ...args: CustomArgs
  ): Promise<Entity>;

  destroy(lookup: Entity[LookupField], ...args: CustomArgs): Promise<void>;
}
