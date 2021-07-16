import { EntityRepository, FindOptions } from "@mikro-orm/core";
import {
  AnyEntity,
  EntityData,
  EntityMetadata,
  FilterQuery,
  NonFunctionPropertyNames,
} from "@mikro-orm/core/typings";
import { FilterQueryParam, OrderQueryParam, RelationPath } from "../types";

/**
 * This Service is designed to be used for various purposes, not just for processing CRUD requests,
 * I made its API as universal and composable as possible so that users can easily override and extend
 * this Service to achieve the functions he wants.
 */
export interface MikroCrudService<
  Entity extends AnyEntity<Entity> = any,
  CreateDto = Entity,
  UpdateDto = CreateDto
> {
  readonly repository: EntityRepository<Entity>;
  readonly entityMeta: EntityMetadata;
  readonly collectionFields: NonFunctionPropertyNames<Entity>[];

  // ------------------------------------------------------------------------------------------
  // Entry Methods

  list(args: {
    conditions?: FilterQuery<Entity>;
    limit?: number;
    offset?: number;
    order?: OrderQueryParam<Entity>[];
    filter?: FilterQueryParam<Entity>[];
    expand?: RelationPath<Entity>[];
    refresh?: boolean;
    user?: any;
  }): Promise<{ total: number; results: Entity[] }>;

  create(args: {
    data: CreateDto | EntityData<Entity>;
    user?: any;
  }): Promise<Entity>;

  retrieve(args: {
    conditions: FilterQuery<Entity>;
    expand?: RelationPath<Entity>[];
    refresh?: boolean;
    user?: any;
  }): Promise<Entity>;

  replace(args: {
    entity: Entity;
    data: CreateDto | EntityData<Entity>;
    user?: any;
  }): Promise<Entity>;

  update(args: {
    entity: Entity;
    data: UpdateDto | EntityData<Entity>;
    user?: any;
  }): Promise<Entity>;

  destroy(args: { entity: Entity; user?: any }): Promise<Entity>;

  exists(args: {
    conditions: FilterQuery<Entity>;
    user?: any;
  }): Promise<boolean>;

  save(): Promise<void>;

  /**
   * Mark only the specified relations as populated to shape the JSON response.
   * @param args
   */
  adjustPopulationStatus(args: {
    entity: Entity;
    expand?: RelationPath<Entity>[];
  }): Promise<Entity>;

  // ------------------------------------------------------------------------------------------

  /**
   * Decide which MikroORM filters to enable and what arguments to pass to the filters.
   * @param args
   */
  decideEntityFilters(args: {
    user?: any;
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
