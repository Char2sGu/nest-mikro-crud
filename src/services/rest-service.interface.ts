import { FindConditions, Repository } from "typeorm";
import { LookupFields } from "./lookup-fields.type";

export interface RestService<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>
> {
  readonly repository: Repository<Entity>;

  list(options?: { limit?: number; offset?: number }): Promise<Entity[]>;

  create(dto: CreateDto): Promise<Entity>;

  retrieve(lookup: Entity[LookupField]): Promise<Entity>;

  replace(lookup: Entity[LookupField], dto: CreateDto): Promise<Entity>;

  update(
    lookup: Entity[LookupField],
    dto: CreateDto | UpdateDto
  ): Promise<Entity>;

  destroy(lookup: Entity[LookupField]): Promise<Entity>;

  count(): Promise<number>;

  /**
   * Exclude fields.
   *
   * Interceptors are not used because overloading may change the data structure.
   */
  transform(entities: Entity[]): Promise<Entity[]>;
  transform(entity: Entity): Promise<Entity>;

  /**
   * Could be overrided to enforce some conditions.
   * @param lookup
   */
  getQueryConditions(
    lookup?: Entity[LookupField]
  ): Promise<FindConditions<Entity>>;
}
