import { FindConditions, Repository } from "typeorm";
import { LookupFields } from "./lookup-fields.type";

export interface RestService<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>,
  CustomArgs extends any[] = any[]
> {
  readonly repository: Repository<Entity>;

  list(
    options?: { limit?: number; offset?: number },
    ...args: CustomArgs
  ): Promise<Entity[]>;

  create(dto: CreateDto, ...args: CustomArgs): Promise<Entity>;

  retrieve(lookup: Entity[LookupField], ...args: CustomArgs): Promise<Entity>;

  replace(
    lookup: Entity[LookupField],
    dto: CreateDto,
    ...args: CustomArgs
  ): Promise<Entity>;

  update(
    lookup: Entity[LookupField],
    dto: CreateDto | UpdateDto,
    ...args: CustomArgs
  ): Promise<Entity>;

  destroy(lookup: Entity[LookupField], ...args: CustomArgs): Promise<Entity>;

  count(...args: CustomArgs): Promise<number>;

  /**
   * Exclude fields.
   *
   * Interceptors are not used because overloading may change the data structure.
   */
  transform(entities: Entity[], ...args: CustomArgs): Promise<Entity[]>;
  transform(entity: Entity, ...args: CustomArgs): Promise<Entity>;

  /**
   * Could be overrided to enforce some conditions.
   * @param lookup
   */
  getQueryConditions(
    lookup?: Entity[LookupField],
    ...args: CustomArgs
  ): Promise<FindConditions<Entity>>;
}
