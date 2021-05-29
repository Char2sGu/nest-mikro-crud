import { Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import {
  EntityManager,
  Equal,
  FindConditions,
  FindManyOptions,
  ILike,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not,
} from "typeorm";
import { AbstractFactory } from "../abstract.factory";
import { REST_FACTORY_OPTIONS_METADATA_KEY } from "../constants";
import { EntityField, FilterOperator, LookupableField } from "../types";
import { RestServiceFactoryOptions } from "./rest-service-factory-options.interface";
import { RestService } from "./rest-service.interface";

export class RestServiceFactory<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupableField<Entity> = LookupableField<Entity>
> extends AbstractFactory<
  RestService<Entity, CreateDto, UpdateDto, LookupField>
> {
  readonly product;

  constructor(
    readonly options: RestServiceFactoryOptions<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField
    >
  ) {
    super();

    this.product = this.createRawClass();
    this.defineInjections();

    Reflect.defineMetadata(
      REST_FACTORY_OPTIONS_METADATA_KEY,
      options,
      this.product
    );
  }

  protected createRawClass() {
    const { lookupField, entityClass } = this.options;

    type Interface = RestService<Entity, CreateDto, UpdateDto, LookupField>;
    return class RestService implements Interface {
      readonly repository!: Interface["repository"];

      async list({
        limit,
        offset,
        expand = [],
        order = [],
        filter = [],
        ...args
      }: Parameters<Interface["list"]>[0]): ReturnType<Interface["list"]> {
        const conditions = await this.finalizeQueryConditions({
          conditions: await this.parseFilters({ filter, ...args }),
          ...args,
        });
        const total = await this.repository.count({ where: conditions });
        const results = await this.repository.find({
          where: conditions,
          take: limit,
          skip: offset,
          order: await this.parseOrders({ order, ...args }),
          ...(await this.parseFieldExpansions({ expand, ...args })),
        });
        return { total, results };
      }

      async create({
        data,
        ...args
      }: Parameters<Interface["create"]>[0]): ReturnType<Interface["create"]> {
        return await this.repository.save(data);
      }

      async retrieve({
        lookup,
        expand = [],
        ...args
      }: Parameters<Interface["retrieve"]>[0]) {
        return await this.repository.findOneOrFail({
          where: await this.finalizeQueryConditions({
            conditions: { [lookupField]: lookup } as any,
            ...args,
          }),
          ...(await this.parseFieldExpansions({ expand, ...args })),
        });
      }

      async replace({
        entity,
        data,
        ...args
      }: Parameters<Interface["replace"]>[0]): ReturnType<
        Interface["replace"]
      > {
        const updatedEntity = this.repository.merge(entity, data);
        return await this.repository.save(updatedEntity);
      }

      async update({
        entity,
        data,
        ...args
      }: Parameters<Interface["update"]>[0]): ReturnType<Interface["update"]> {
        const updatedEntity = this.repository.merge(entity, data);
        return await this.repository.save(updatedEntity);
      }

      async destroy({
        entity,
        ...args
      }: Parameters<Interface["destroy"]>[0]): ReturnType<
        Interface["destroy"]
      > {
        return await this.repository.remove(entity);
      }

      async transform({
        entity,
        ...args
      }: Parameters<Interface["transform"]>[0]): ReturnType<
        Interface["transform"]
      > {
        return plainToClass(entityClass, entity);
      }

      async checkPermission({
        action,
        entity,
        ...args
      }: Parameters<Interface["checkPermission"]>[0]): ReturnType<
        Interface["checkPermission"]
      > {
        return;
      }

      async finalizeQueryConditions({
        conditions,
      }: Parameters<Interface["finalizeQueryConditions"]>[0]): ReturnType<
        Interface["finalizeQueryConditions"]
      > {
        return [conditions];
      }

      async parseFieldExpansions({
        expand,
        ...args
      }: Parameters<Interface["parseFieldExpansions"]>[0]): ReturnType<
        Interface["parseFieldExpansions"]
      > {
        expand = [...new Set(expand)];
        const allRelationPaths = this.repository.metadata.relations.map(
          (relation) => relation.propertyPath
        );
        return {
          relations: expand,
          loadRelationIds: {
            relations: allRelationPaths.filter(
              (v) => !expand.includes(v as any)
            ),
          },
        };
      }

      async parseOrders({
        order,
      }: Parameters<Interface["parseOrders"]>[0]): ReturnType<
        Interface["parseOrders"]
      > {
        const orderOptions: FindManyOptions<Entity>["order"] = {};
        order.forEach((raw) => {
          const [field, order] = raw.split(":") as [
            EntityField<Entity>,
            "asc" | "desc"
          ];
          orderOptions[field] = order == "asc" ? "ASC" : "DESC";
        });
        return orderOptions;
      }

      async parseFilters({
        filter,
        ...args
      }: Parameters<Interface["parseFilters"]>[0]): ReturnType<
        Interface["parseFilters"]
      > {
        const entries = await Promise.all(
          filter.map(async (filter) => {
            const regexp = /^(.*)\|(.+):(.*)$/;
            const [, field, operator, value] = regexp.exec(filter)! as [
              unknown,
              EntityField<Entity>,
              FilterOperator,
              string
            ] &
              RegExpExecArray;
            const findOperator = await this.parseFilterOperator({
              operator,
              value,
            });
            return [field, findOperator] as [typeof field, typeof findOperator];
          })
        );
        return Object.fromEntries(entries) as FindConditions<Entity>;
      }

      async parseFilterOperator({
        operator,
        value,
        ...args
      }: Parameters<Interface["parseFilterOperator"]>[0]): ReturnType<
        Interface["parseFilterOperator"]
      > {
        switch (operator) {
          case "contains":
            return Like(`%${value}%`);
          case "endswith":
            return Like(`%${value}`);
          case "eq":
            return Equal(value);
          case "gt":
            return MoreThan(value);
          case "gte":
            return MoreThanOrEqual(value);
          case "icontains":
            return ILike(`%${value}%`);
          case "iendswith":
            return ILike(`%${value}`);
          case "in":
            return In(
              value.split(/(?<!\\),/).map((v) => v.replace("\\,", ","))
            );
          case "isnull":
            return ["true", "True", "1", "t", "T"].includes(value)
              ? IsNull()
              : Not(IsNull());
          case "istartswith":
            return ILike(`${value}%`);
          case "lt":
            return LessThan(value);
          case "lte":
            return LessThanOrEqual(value);
          case "ne":
            return Not(value);
          case "startswith":
            return Like(`${value}%`);
        }
      }
    };
  }

  protected defineInjections() {
    const proto = this.product.prototype;
    let key: keyof RestService;

    key = "repository";
    const { entityClass, repoConnection } = this.options;
    this.defineType(key, entityClass);
    InjectRepository(entityClass, repoConnection)(proto, key);
  }
}
