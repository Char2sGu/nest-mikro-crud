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
  OrderQueryParam,
  RelationPath,
} from "../types";

export interface RestService<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto
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
    user: any;
  }): Promise<{ total: number; results: Entity[] }>;

  create(args: { data: CreateDto; user: any }): Promise<Entity>;

  retrieve(args: {
    conditions: FindConditions<Entity>;
    expand?: RelationPath<Entity>[];
    user: any;
  }): Promise<Entity>;

  replace(args: {
    entity: Entity;
    data: CreateDto;
    user: any;
  }): Promise<Entity>;

  update(args: { entity: Entity; data: UpdateDto; user: any }): Promise<Entity>;

  destroy(args: { entity: Entity; user: any }): Promise<Entity>;

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
  checkPermission(args: {
    action: ActionName;
    entity?: Entity;
    user: any;
  }): Promise<void>;

  /**
   * Will be called in the controller to transform the entity
   * before sending the response.
   */
  transform(args: { entity: Entity }): Promise<Entity>;

  // ------------------------------------------------------------------------------------------

  finalizeQueryConditions(args: {
    conditions: FindConditions<Entity>;
    user: any;
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
