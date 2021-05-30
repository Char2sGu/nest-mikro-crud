import {
  FindConditions,
  FindManyOptions,
  FindOneOptions,
  FindOperator,
  Repository,
} from "typeorm";
import {
  ActionName,
  FilterOperator,
  FilterQueryParam,
  LookupableField,
  OrderQueryParam,
  RelationPath,
} from "../types";

export interface RestService<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupableField<Entity> = LookupableField<Entity>
> {
  readonly repository: Repository<Entity>;

  // ------------------------------------------------------------------------------------------
  // Entry Methods

  list(args: {
    limit?: number;
    offset?: number;
    expand?: RelationPath<Entity>[];
    order?: OrderQueryParam<Entity>[];
    filter?: FilterQueryParam<Entity>[];
  }): Promise<{ total: number; results: Entity[] }>;

  create(args: { data: CreateDto }): Promise<Entity>;

  retrieve(args: {
    lookup: Entity[LookupField];
    expand?: RelationPath<Entity>[];
  }): Promise<Entity>;

  replace(args: { entity: Entity; data: CreateDto }): Promise<Entity>;

  update(args: { entity: Entity; data: UpdateDto }): Promise<Entity>;

  destroy(args: { entity: Entity }): Promise<Entity>;

  /**
   * When the action is _list_ or _create_, it will be called once with
   * `{ action: "<the-action-name>" }` before performing the action.
   *
   * In other cases it will be called twice, once is with `{ action: "<the-action-name>" }`
   * before loading the target entity and once is with
   * `{ action: "<the-action-name>", entity: <the-target-entity> }` before performing the
   * action.
   * @param args
   */
  checkPermission(args: { action: ActionName; entity?: Entity }): Promise<void>;

  /**
   * Will be called in the controller to transform the entity
   * before sending the response.
   */
  transform(args: { entity: Entity }): Promise<Entity>;

  // ------------------------------------------------------------------------------------------

  finalizeQueryConditions(args: {
    conditions: FindConditions<Entity>;
  }): Promise<FindConditions<Entity>[]>;

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
   * Parse the "filter" query param into actual conditions.
   * @param args
   */
  parseFilters(args: {
    filter: FilterQueryParam<Entity>[];
  }): Promise<FindConditions<Entity>>;

  /**
   * Parse a string operator and the value into the actual TypeORM
   * operator.
   * @param args
   */
  parseFilterOperator(args: {
    operator: FilterOperator;
    value: string;
  }): Promise<FindOperator<unknown>>;
}
