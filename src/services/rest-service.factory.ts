import { NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import {
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
import { REST_FACTORY_METADATA_KEY } from "../constants";
import { EntityField, FilterOperator } from "../types";
import { RestServiceFactoryOptions } from "./rest-service-factory-options.interface";
import { RestService } from "./rest-service.interface";

export class RestServiceFactory<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto
> extends AbstractFactory<RestService<Entity, CreateDto, UpdateDto>> {
  readonly options;
  readonly product;

  constructor(
    options: RestServiceFactoryOptions<Entity, CreateDto, UpdateDto>
  ) {
    super();

    this.options = this.standardizeOptions(options);

    this.product = this.createRawClass();
    this.defineInjections();

    Reflect.defineMetadata(REST_FACTORY_METADATA_KEY, this, this.product);
  }

  protected standardizeOptions(
    options: RestServiceFactoryOptions<Entity, CreateDto, UpdateDto>
  ) {
    return options;
  }

  protected createRawClass() {
    const { entityClass } = this.options;

    type Interface = RestService<Entity, CreateDto, UpdateDto>;
    return class RestService implements Interface {
      readonly repository!: Interface["repository"];

      async list({
        limit,
        offset,
        expand = [],
        order = [],
        filter = [],
        user,
      }: Parameters<Interface["list"]>[0]): ReturnType<Interface["list"]> {
        const conditions = await this.finalizeQueryConditions({
          conditions: await this.parseFilters({ filter }),
          user,
        });
        const relationOptions = await this.parseFieldExpansions({
          expand,
        });
        const total = await this.repository.count({
          where: conditions,
          ...relationOptions,
        });
        const results = await this.repository.find({
          where: conditions,
          take: limit,
          skip: offset,
          order: await this.parseOrders({ order }),
          ...relationOptions,
        });
        return { total, results };
      }

      async create({
        data,
      }: Parameters<Interface["create"]>[0]): ReturnType<Interface["create"]> {
        return await this.repository.save(data);
      }

      async retrieve({
        conditions,
        expand = [],
        user,
      }: Parameters<Interface["retrieve"]>[0]) {
        const entity = await this.repository.findOne({
          where: await this.finalizeQueryConditions({
            conditions,
            user,
          }),
          ...(await this.parseFieldExpansions({ expand })),
        });
        if (!entity) throw new NotFoundException();
        return entity;
      }

      async replace({
        entity,
        data,
      }: Parameters<Interface["replace"]>[0]): ReturnType<
        Interface["replace"]
      > {
        const updatedEntity = this.repository.merge(entity, data);
        return await this.repository.save(updatedEntity);
      }

      async update({
        entity,
        data,
      }: Parameters<Interface["update"]>[0]): ReturnType<Interface["update"]> {
        const updatedEntity = this.repository.merge(entity, data);
        return await this.repository.save(updatedEntity);
      }

      async destroy({
        entity,
      }: Parameters<Interface["destroy"]>[0]): ReturnType<
        Interface["destroy"]
      > {
        return await this.repository.remove(entity);
      }

      async checkPermission({
        action,
        entity,
      }: Parameters<Interface["checkPermission"]>[0]): ReturnType<
        Interface["checkPermission"]
      > {
        return;
      }

      async transform({
        entity,
      }: Parameters<Interface["transform"]>[0]): ReturnType<
        Interface["transform"]
      > {
        return plainToClass(entityClass, entity);
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
      }: Parameters<Interface["parseFilterOperator"]>[0]): ReturnType<
        Interface["parseFilterOperator"]
      > {
        const parseMultiValues = () =>
          value.split(/(?<!\\),/).map((v) => v.replace("\\,", ","));

        switch (operator) {
          case "eq":
            return Equal(value);
          case "gt":
            return MoreThan(value);
          case "gte":
            return MoreThanOrEqual(value);
          case "in":
            return In(parseMultiValues());
          case "lt":
            return LessThan(value);
          case "lte":
            return LessThanOrEqual(value);
          case "ne":
            return Not(Equal(value));
          case "nin":
            return Not(In(parseMultiValues()));
          case "like":
            return Like(value);
          case "ilike":
            return ILike(value);
          case "isnull":
            return IsNull();
          case "notnull":
            return Not(IsNull());
        }
      }
    };
  }

  protected defineInjections() {
    const { entityClass, repoConnection } = this.options;

    this.defineType("repository", entityClass).applyPropertyDecorators(
      "repository",
      InjectRepository(entityClass, repoConnection)
    );
  }
}
