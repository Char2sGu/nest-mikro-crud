import {
  AnyEntity,
  ReferenceType,
  FilterQuery,
  wrap,
  NotFoundError,
  Collection,
  Reference,
  IdentifiedReference,
  FindOptions,
  QueryOrderMap,
  EntityRepository,
} from "@mikro-orm/core";
import {
  EntityData,
  EntityMetadata,
  NonFunctionPropertyNames,
  OperatorMap,
} from "@mikro-orm/core/typings";
import {
  RelationPath,
  ScalarPath,
  walkPath,
  FilterOperator,
  OrderQueryParam,
  FilterQueryParam,
} from "..";

export class MikroCrudService<
  Entity extends AnyEntity = AnyEntity,
  CreateDto extends EntityData<Entity> = EntityData<Entity>,
  UpdateDto extends EntityData<Entity> = EntityData<Entity>
> {
  readonly repository!: EntityRepository<Entity>;
  readonly entityMeta!: EntityMetadata;
  readonly collectionFields!: NonFunctionPropertyNames<Entity>[];

  async list({
    conditions = {},
    limit,
    offset,
    order = [],
    filter = [],
    expand = [],
    refresh,
    user,
  }: {
    conditions?: FilterQuery<Entity>;
    limit?: number;
    offset?: number;
    order?: OrderQueryParam<Entity>[];
    filter?: FilterQueryParam<Entity>[];
    expand?: RelationPath<Entity>[];
    refresh?: boolean;
    user?: any;
  }) {
    const filterConditions = await this.parseFilterQueryParams({ filter });
    const [results, total] = await this.repository.findAndCount(
      { $and: [conditions, filterConditions] } as FilterQuery<Entity>,
      {
        limit,
        offset,
        orderBy: await this.parseOrderQueryParams({ order }),
        filters: await this.decideEntityFilters({ user }),
        populate: [...this.collectionFields, ...expand] as string[],
        refresh,
      }
    );
    return { total, results };
  }

  async create({ data }: { data: CreateDto; user?: any }): Promise<Entity> {
    const entity = this.repository.create(data);
    this.repository.persist(entity);
    return entity;
  }

  async retrieve({
    conditions = {},
    expand = [],
    refresh,
    user,
  }: {
    conditions: FilterQuery<Entity>;
    expand?: RelationPath<Entity>[];
    refresh?: boolean;
    user?: any;
  }): Promise<Entity> {
    return await this.repository.findOneOrFail(conditions, {
      filters: await this.decideEntityFilters({ user }),
      populate: [...this.collectionFields, ...expand] as string[],
      refresh,
    });
  }

  async replace({
    entity,
    data,
  }: {
    entity: Entity;
    data: CreateDto;
    user?: any;
  }): Promise<Entity> {
    return wrap(entity).assign(data, { merge: true });
  }

  async update({
    entity,
    data,
  }: {
    entity: Entity;
    data: UpdateDto;
    user?: any;
  }): Promise<Entity> {
    return wrap(entity).assign(data, { merge: true });
  }

  async destroy({ entity }: { entity: Entity; user?: any }): Promise<Entity> {
    this.repository.remove(entity);
    return entity;
  }

  async exists({
    conditions,
    user,
  }: {
    conditions: FilterQuery<Entity>;
    user?: any;
  }): Promise<boolean> {
    try {
      await this.retrieve({ conditions, user });
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) return false;
      else throw error;
    }
  }

  async save(): Promise<void> {
    await this.repository.flush();
  }

  /**
   * Mark only the specified relations as populated to shape the JSON response.
   * @param args
   */
  async adjustPopulationStatus({
    entity: rootEntity,
    expand = [],
  }: {
    entity: Entity;
    expand?: RelationPath<Entity>[];
  }): Promise<Entity> {
    function digIn(entity: AnyEntity, relationNode?: RelationPath<Entity>) {
      const entityMeta = entity.__helper!.__meta;
      entityMeta.relations.forEach(({ name }) => {
        const value = entity[name];
        const relationPath = (
          relationNode ? `${relationNode}.${name}` : name
        ) as RelationPath<Entity>;
        const shouldPopulate = expand.some((path) =>
          path.startsWith(relationPath)
        );

        // It is possible for a collection/reference/entity which need to be marked as populated to appear
        // multiple times in different places in part of which they need to be marked as unpopulated, so it
        // is neccesary to call `.populated(true)` to ensure they are not be marked as unpopulated in deeper
        // places unexpectedly.
        if (value instanceof Collection) {
          const collection: Collection<AnyEntity> = value;
          if (!shouldPopulate) {
            collection.populated(false);
          } else {
            for (const entity of collection) digIn(entity, relationPath);
            collection.populated(true);
          }
        } else if (value instanceof Reference) {
          const reference: IdentifiedReference<AnyEntity> = value;
          if (!shouldPopulate) {
            reference.populated(false);
          } else {
            digIn(reference.getEntity(), relationPath);
            reference.populated(true);
          }
        } else {
          const entity: AnyEntity<unknown> = value;
          const wrappedEntity = wrap(entity);
          if (!shouldPopulate) {
            wrappedEntity.populated(false);
          } else {
            digIn(entity, relationPath);
            wrappedEntity.populated(true);
          }
        }
      });
      return entity;
    }

    return digIn(rootEntity) as typeof rootEntity;
  }

  /**
   * Decide which MikroORM filters to enable and what arguments to pass to the filters.
   * @param args
   */
  async decideEntityFilters({
    user,
  }: {
    user?: any;
  }): Promise<FindOptions<Entity>["filters"]> {
    return { crud: { user } };
  }

  /**
   * Parse the "order" query param into actual options.
   * @param args
   */
  async parseOrderQueryParams({
    order,
  }: {
    order: OrderQueryParam<Entity>[];
  }): Promise<FindOptions<Entity>["orderBy"]> {
    const orderOptions: FindOptions<Entity>["orderBy"] = {};
    order.forEach((raw) => {
      const [path, order] = raw.split(":") as [
        ScalarPath<Entity>,
        "asc" | "desc"
      ];
      walkPath(
        orderOptions,
        path,
        (obj: QueryOrderMap, key: string) => (obj[key] = order)
      );
    });
    return orderOptions;
  }

  /**
   * Parse the "filter" query param into actual conditions.
   * @param args
   */
  async parseFilterQueryParams({
    filter: rawFilters,
  }: {
    filter: FilterQueryParam<Entity>[];
  }): Promise<FilterQuery<Entity>> {
    const conditions: Partial<
      Record<NonFunctionPropertyNames<Entity>, OperatorMap<unknown>>
    > = {};

    rawFilters.forEach(async (raw) => {
      const [, path, rawOp, value] = /^(.*)\|(.+):(.*)$/.exec(raw)! as [
        string,
        ScalarPath<Entity>,
        FilterOperator,
        string
      ] &
        RegExpExecArray;

      const parseMultiValues = () =>
        value.split(/(?<!\\),/).map((v) => v.replace("\\,", ","));

      const fieldConditions = walkPath(
        conditions,
        path,
        (obj, key) => (obj[key] = obj[key] ?? {})
      ) as OperatorMap<unknown>;

      if (rawOp == "isnull") fieldConditions.$eq = null;
      else if (rawOp == "notnull") fieldConditions.$ne = null;
      else {
        if (rawOp == "in" || rawOp == "nin")
          fieldConditions[`$${rawOp}` as const] = parseMultiValues();
        else fieldConditions[`$${rawOp}` as const] = value;
      }
    });

    return conditions;
  }
}
