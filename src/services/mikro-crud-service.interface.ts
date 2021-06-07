import { BaseEntity, EntityRepository, FindOptions } from "@mikro-orm/core";
import { EntityMetadata, FilterQuery } from "@mikro-orm/core/typings";
import {
  ActionName,
  EntityField,
  FilterQueryParam,
  OrderQueryParam,
} from "../types";

export interface MikroCrudService<
  Entity extends BaseEntity<any, any> = any,
  CreateDto = Entity,
  UpdateDto = CreateDto
> {
  readonly repository: EntityRepository<Entity>;
  readonly entityMeta: EntityMetadata;
  readonly collectionFields: EntityField<Entity>[];

  // ------------------------------------------------------------------------------------------
  // Entry Methods

  list(args: {
    conditions?: FilterQuery<Entity>;
    limit?: number;
    offset?: number;
    order?: OrderQueryParam<Entity>[];
    filter?: FilterQueryParam<Entity>[];
    user: any;
  }): Promise<{ total: number; results: Entity[] }>;

  create(args: { data: CreateDto; user: any }): Promise<Entity>;

  retrieve(args: {
    conditions: FilterQuery<Entity>;
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
   * Mark the relation fields of the entity unpopulated so that they will be serialized to
   * a primary key or an array of primary keys instead the actual data.
   */
  markRelationsUnpopulated(args: { entity: Entity }): Promise<Entity>;

  // ------------------------------------------------------------------------------------------

  /**
   * Decide which MikroORM filters to enable and what arguments to pass to the filters.
   * @param args
   */
  decideEntityFilters(args: {
    user: any;
  }): Promise<FindOptions<Entity>["filters"]>;

  /**
   * Parse the "order" query param into actual options.
   * @param args
   */
  parseOrderQueryParams(args: {
    order: OrderQueryParam<Entity>[];
  }): Promise<FindOptions<Entity>["orderBy"]>;

  /**
   * Parse the "filter" query param into actual conditions.
   * @param args
   */
  parseFilterQueryParams(args: {
    filter: FilterQueryParam<Entity>[];
  }): Promise<FilterQuery<Entity>>;
}
