import {
  BaseEntity,
  Collection,
  FilterQuery,
  FindOptions,
} from "@mikro-orm/core";
import { EntityMetadata, OperatorMap } from "@mikro-orm/core/typings";
import { InjectRepository } from "@mikro-orm/nestjs";
import { NotFoundException } from "@nestjs/common";
import { AbstractFactory } from "../abstract.factory";
import { FACTORY_METADATA_KEY } from "../constants";
import { EntityField, FilterOperator } from "../types";
import { MikroCrudServiceFactoryOptions } from "./mikro-crud-service-factory-options.interface";
import { MikroCrudService } from "./mikro-crud-service.interface";

export class MikroCrudServiceFactory<
  Entity extends BaseEntity<any, any> = any,
  CreateDto = Entity,
  UpdateDto = CreateDto
> extends AbstractFactory<MikroCrudService<Entity, CreateDto, UpdateDto>> {
  readonly options;
  readonly product;

  constructor(
    options: MikroCrudServiceFactoryOptions<Entity, CreateDto, UpdateDto>
  ) {
    super();

    this.options = this.standardizeOptions(options);

    this.product = this.createRawClass();
    this.defineInjections();

    Reflect.defineMetadata(FACTORY_METADATA_KEY, this, this.product);
  }

  protected standardizeOptions(
    options: MikroCrudServiceFactoryOptions<Entity, CreateDto, UpdateDto>
  ) {
    return options;
  }

  protected createRawClass() {
    type Interface = MikroCrudService<Entity, CreateDto, UpdateDto>;
    return class MikroCrudService implements Interface {
      readonly repository!: Interface["repository"];

      async list({
        conditions = {},
        limit,
        offset,
        order = [],
        filter = [],
        user,
      }: Parameters<Interface["list"]>[0]) {
        const filterConditions = await this.parseFilterQueryParams({ filter });
        const [results, total] = await this.repository.findAndCount(
          { $and: [conditions, filterConditions] } as FilterQuery<Entity>,
          {
            limit,
            offset,
            orderBy: await this.parseOrderQueryParams({ order }),
            filters: await this.decideEntityFilters({ user }),
          }
        );
        return { total, results };
      }

      async create({
        data,
      }: Parameters<Interface["create"]>[0]): ReturnType<Interface["create"]> {
        const entity = this.repository.create(data);
        this.repository.persist(entity);
        await this.repository.flush();
        return entity;
      }

      async retrieve({
        conditions = {},
        user,
      }: Parameters<Interface["retrieve"]>[0]) {
        return await this.repository.findOneOrFail(conditions, {
          filters: await this.decideEntityFilters({ user }),
          failHandler: () => new NotFoundException(),
        });
      }

      async replace({
        entity,
        data,
      }: Parameters<Interface["replace"]>[0]): ReturnType<
        Interface["replace"]
      > {
        entity.assign(data, { merge: true });
        await this.repository.flush();
        return entity;
      }

      async update({
        entity,
        data,
      }: Parameters<Interface["update"]>[0]): ReturnType<Interface["update"]> {
        entity.assign(data, { merge: true });
        await this.repository.flush();
        return entity;
      }

      async destroy({ entity }: Parameters<Interface["destroy"]>[0]) {
        await this.repository.remove(entity).flush();
        return entity;
      }

      async checkPermission({
        action,
        entity,
        user,
      }: Parameters<Interface["checkPermission"]>[0]): ReturnType<
        Interface["checkPermission"]
      > {
        return;
      }

      async initCollections({
        entity,
      }: Parameters<Interface["initCollections"]>[0]): ReturnType<
        Interface["initCollections"]
      > {
        const { relations } = entity[
          "__meta" as keyof typeof entity
        ] as unknown as EntityMetadata;

        await Promise.all(
          relations.map(async ({ name }) => {
            const item = entity[name as EntityField<Entity>];
            if (item instanceof Collection) await item.init();
          })
        );

        return entity;
      }

      async decideEntityFilters({
        user,
      }: Parameters<Interface["decideEntityFilters"]>[0]): ReturnType<
        Interface["decideEntityFilters"]
      > {
        return { crud: { user } };
      }

      async parseOrderQueryParams({
        order,
      }: Parameters<Interface["parseOrderQueryParams"]>[0]): ReturnType<
        Interface["parseOrderQueryParams"]
      > {
        const orderOptions: FindOptions<Entity>["orderBy"] = {};
        order.forEach((raw) => {
          const [field, order] = raw.split(":") as [
            EntityField<Entity>,
            "asc" | "desc"
          ];
          orderOptions[field] = order;
        });
        return orderOptions;
      }

      async parseFilterQueryParams({
        filter: rawFilters,
      }: Parameters<Interface["parseFilterQueryParams"]>[0]): ReturnType<
        Interface["parseFilterQueryParams"]
      > {
        const conditions: Partial<
          Record<EntityField<Entity>, OperatorMap<unknown>>
        > = {};

        rawFilters.forEach(async (raw) => {
          const [, field, rawOp, value] = /^(.*)\|(.+):(.*)$/.exec(raw)! as [
            string,
            EntityField<Entity>,
            FilterOperator,
            string
          ] &
            RegExpExecArray;

          const parseMultiValues = () =>
            value.split(/(?<!\\),/).map((v) => v.replace("\\,", ","));

          const fieldConditions: OperatorMap<unknown> =
            conditions[field] ?? (conditions[field] = {});

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
    };
  }

  protected defineInjections() {
    const { entityClass } = this.options;

    this.defineType("repository", entityClass).applyPropertyDecorators(
      "repository",
      InjectRepository(entityClass)
    );
  }
}
