import { BaseEntity, FilterQuery, FindOptions, wrap } from "@mikro-orm/core";
import { OperatorMap } from "@mikro-orm/core/typings";
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
        const filterConditions = await this.parseFilters({ filter });
        const [results, total] = await this.repository.findAndCount(
          { $and: [conditions, filterConditions] } as FilterQuery<Entity>,
          {
            limit,
            offset,
            orderBy: await this.parseOrders({ order }),
            filters: await this.setupFilters({ user }),
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
        const entity = await this.repository.findOneOrFail(conditions, {
          filters: await this.setupFilters({ user }),
          failHandler: () => new NotFoundException(),
        });
        return entity;
      }

      async replace({
        entity,
        data,
      }: Parameters<Interface["replace"]>[0]): ReturnType<
        Interface["replace"]
      > {
        wrap(entity).assign(data, { merge: true });
        await this.repository.flush();
        return entity;
      }

      async update({
        entity,
        data,
      }: Parameters<Interface["update"]>[0]): ReturnType<Interface["update"]> {
        wrap(entity).assign(data, { merge: true });
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
      }: Parameters<Interface["checkPermission"]>[0]): ReturnType<
        Interface["checkPermission"]
      > {
        return;
      }

      async setupFilters({
        user,
      }: Parameters<Interface["setupFilters"]>[0]): ReturnType<
        Interface["setupFilters"]
      > {
        return {
          crud: { user },
        };
      }

      async parseOrders({
        order,
      }: Parameters<Interface["parseOrders"]>[0]): ReturnType<
        Interface["parseOrders"]
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

      async parseFilters({
        filter: rawFilters,
      }: Parameters<Interface["parseFilters"]>[0]): ReturnType<
        Interface["parseFilters"]
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
