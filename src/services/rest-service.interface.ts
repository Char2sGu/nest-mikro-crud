import { FindConditions, Repository } from "typeorm";
import { LookupFields } from "./lookup-fields.type";

export interface RestService<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>
> {
  readonly repository: Repository<Entity>;

  list(
    options?: { limit?: number; offset?: number },
    ...args: any[]
  ): Promise<Entity[]>;

  create(dto: CreateDto, ...args: any[]): Promise<Entity>;

  retrieve(lookup: Entity[LookupField], ...args: any[]): Promise<Entity>;

  replace(
    lookup: Entity[LookupField],
    dto: CreateDto,
    ...args: any[]
  ): Promise<Entity>;

  update(
    lookup: Entity[LookupField],
    dto: CreateDto | UpdateDto,
    ...args: any[]
  ): Promise<Entity>;

  destroy(lookup: Entity[LookupField], ...args: any[]): Promise<Entity>;

  count(...args: any[]): Promise<number>;

  /**
   * Exclude fields.
   *
   * Interceptors are not used because overloading may change the data structure.
   */
  transform(entities: Entity[], ...args: any[]): Promise<Entity[]>;
  transform(entity: Entity, ...args: any[]): Promise<Entity>;

  /**
   * Could be overrided to enforce some conditions.
   * @param lookup
   */
  getQueryConditions(
    lookup?: Entity[LookupField],
    ...args: any[]
  ): Promise<FindConditions<Entity>>;
}
