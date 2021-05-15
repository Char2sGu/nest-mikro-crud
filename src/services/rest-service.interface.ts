import {
  FindConditions,
  FindManyOptions,
  FindOneOptions,
  Repository,
} from "typeorm";
import { LookupableField, OrderQueryParam, RelationPath } from "../types";

export interface RestService<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupableField<Entity> = LookupableField<Entity>
> {
  readonly repository: Repository<Entity>;

  list(args: {
    limit?: number;
    offset?: number;
    expand?: RelationPath<Entity>[];
    order?: OrderQueryParam<Entity>[];
  }): Promise<Entity[]>;

  create(args: { data: CreateDto }): Promise<Entity>;

  retrieve(args: {
    lookup: Entity[LookupField];
    expand?: RelationPath<Entity>[];
  }): Promise<Entity>;

  replace(args: { entity: Entity; data: CreateDto }): Promise<Entity>;

  update(args: { entity: Entity; data: UpdateDto }): Promise<Entity>;

  destroy(args: { entity: Entity }): Promise<Entity>;

  count(args: {}): Promise<number>;

  /**
   * Transform the entity before sending the response.
   *
   * Interceptors are not used because overloading may change the data structure.
   */
  transform(args: { entity: Entity }): Promise<Entity>;

  /**
   * Could be overrided to enforce some conditions.
   * @param lookup
   */
  getQueryConditions(args: {
    lookup?: Entity[LookupField];
  }): Promise<FindConditions<Entity>>;

  parseFieldExpansions(args: {
    expand: RelationPath<Entity>[];
  }): Promise<FindOneOptions<Entity> | FindManyOptions<Entity>>;

  parseOrders(args: {
    order: OrderQueryParam<Entity>[];
  }): Promise<FindManyOptions<Entity>["order"]>;

  /**
   * Will be called before responding the `list` result. By default it returns the
   * entities directly, override it to change its behavior.
   * @param entities
   * @param queries
   * @param args
   */
  finalizeList(args: { entities: Entity[] }): Promise<unknown>;
}
