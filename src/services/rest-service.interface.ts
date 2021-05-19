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

  /**
   * Top entry method of "list" action.
   * @param args
   */
  list(args: {
    limit?: number;
    offset?: number;
    expand?: RelationPath<Entity>[];
    order?: OrderQueryParam<Entity>[];
  }): Promise<Entity[]>;

  /**
   * Top entry method of "create" action.
   * @param args
   */
  create(args: { data: CreateDto }): Promise<Entity>;

  /**
   * Top entry method of "retrieve" action.
   * @param args
   */
  retrieve(args: {
    lookup: Entity[LookupField];
    expand?: RelationPath<Entity>[];
  }): Promise<Entity>;

  /**
   * Top entry method of "replace" action.
   * @param args
   */
  replace(args: { entity: Entity; data: CreateDto }): Promise<Entity>;

  /**
   * Top entry method of "update" action.
   * @param args
   */
  update(args: { entity: Entity; data: UpdateDto }): Promise<Entity>;

  /**
   * Top entry method of "destroy" action.
   * @param args
   */
  destroy(args: { entity: Entity }): Promise<Entity>;

  count(args: {}): Promise<number>;

  /**
   * Will be called in the controller to transform the entity
   * before sending the response.
   */
  transform(args: { entity: Entity }): Promise<Entity>;

  /**
   * Entry method of getting query conditions.
   * @param lookup
   */
  getQueryConditions(args: {
    lookup?: Entity[LookupField];
  }): Promise<FindConditions<Entity>>;

  /**
   * Parse the "expand" query param into actual options.
   * @param args
   */
  parseFieldExpansions(args: {
    expand: RelationPath<Entity>[];
  }): Promise<
    Pick<
      FindOneOptions<Entity>,
      "relations" | "loadRelationIds" | "loadEagerRelations"
    >
  >;

  /**
   * Parse the "order" query param into actual options.
   * @param args
   */
  parseOrders(args: {
    order: OrderQueryParam<Entity>[];
  }): Promise<FindManyOptions<Entity>["order"]>;

  /**
   * Will be called before sending the response of "list" action to get the
   * final response data.
   * @param entities
   * @param queries
   * @param args
   */
  finalizeList(args: { entities: Entity[] }): Promise<unknown>;
}
