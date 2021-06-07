import {
  Collection,
  FilterQuery,
  FindOptions,
  QueryOrderMap,
  Reference,
  ReferenceType,
} from "@mikro-orm/core";
import {
  AnyEntity,
  NonFunctionPropertyNames,
  OperatorMap,
} from "@mikro-orm/core/typings";
import { InjectRepository } from "@mikro-orm/nestjs";
import { NotFoundException } from "@nestjs/common";
import { ScalarPath } from "src/types";
import { walkPath } from "src/utils";
import { AbstractFactory } from "../abstract.factory";
import { FACTORY_METADATA_KEY } from "../constants";
import { FilterOperator } from "../types";
import { MikroCrudServiceFactoryOptions } from "./mikro-crud-service-factory-options.interface";
import { MikroCrudService } from "./mikro-crud-service.interface";

export class MikroCrudServiceFactory<
  Entity extends AnyEntity = any,
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
    const { entityClass } = this.options;

    type Interface = MikroCrudService<Entity, CreateDto, UpdateDto>;
    return class MikroCrudService implements Interface {
      readonly repository!: Interface["repository"];
      readonly entityMeta: Interface["entityMeta"];
      readonly collectionFields: Interface["collectionFields"];

      constructor() {
        this.entityMeta = (new entityClass() as AnyEntity).__helper!.__meta;

        this.collectionFields = this.entityMeta.relations
          .filter(
            ({ reference }) =>
              reference == ReferenceType.ONE_TO_MANY ||
              reference == ReferenceType.MANY_TO_MANY
          )
          .map(({ name }) => name as NonFunctionPropertyNames<Entity>);
      }

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
            populate: this.collectionFields,
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
          populate: this.collectionFields,
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

      async markRelationsUnpopulated({
        entity,
      }: Parameters<Interface["markRelationsUnpopulated"]>[0]): ReturnType<
        Interface["markRelationsUnpopulated"]
      > {
        this.entityMeta.relations.forEach(({ name }) =>
          (
            entity[name as keyof typeof entity] as unknown as
              | Reference<AnyEntity>
              | Collection<AnyEntity>
              | undefined
          )?.populated(false)
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

      async parseFilterQueryParams({
        filter: rawFilters,
      }: Parameters<Interface["parseFilterQueryParams"]>[0]): ReturnType<
        Interface["parseFilterQueryParams"]
      > {
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
