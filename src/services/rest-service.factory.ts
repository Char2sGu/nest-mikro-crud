import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { FindConditions, FindManyOptions } from "typeorm";
import { AbstractFactory } from "../abstract.factory";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "../constants";
import { EntityField, LookupableField } from "../types";
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
    this.defineInjectionsMetadata();

    Reflect.defineMetadata(
      REST_SERVICE_OPTIONS_METADATA_KEY,
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
        ...args
      }: Parameters<Interface["list"]>[0]) {
        return await this.repository.find({
          where: await this.getQueryConditions({ ...args }),
          take: limit,
          skip: offset,
          order: await this.parseOrders({ order }),
          ...(await this.parseFieldExpansions({ expand, ...args })),
        });
      }

      async create({ data, ...args }: Parameters<Interface["create"]>[0]) {
        return await this.repository.save(data);
      }

      async retrieve({
        lookup,
        expand = [],
        ...args
      }: Parameters<Interface["retrieve"]>[0]) {
        return await this.repository.findOneOrFail({
          where: await this.getQueryConditions({ lookup, ...args }),
          ...(await this.parseFieldExpansions({ expand, ...args })),
        });
      }

      async replace({
        entity,
        data,
        ...args
      }: Parameters<Interface["replace"]>[0]) {
        const updatedEntity = this.repository.merge(entity, data);
        return await this.repository.save(updatedEntity);
      }

      async update({
        entity,
        data,
        ...args
      }: Parameters<Interface["update"]>[0]) {
        const updatedEntity = this.repository.merge(entity, data);
        return await this.repository.save(updatedEntity);
      }

      async destroy({ entity, ...args }: Parameters<Interface["destroy"]>[0]) {
        return await this.repository.remove(entity);
      }

      async count({ ...args }: Parameters<Interface["count"]>[0]) {
        return await this.repository.count({
          where: await this.getQueryConditions({ ...args }),
        });
      }

      async transform({
        entity,
        ...args
      }: Parameters<Interface["transform"]>[0]) {
        return plainToClass(entityClass, entity);
      }

      async getQueryConditions({
        lookup,
        ...args
      }: Parameters<Interface["getQueryConditions"]>[0]) {
        return (
          lookup != null
            ? ({
                [lookupField]: lookup,
              } as unknown)
            : {}
        ) as FindConditions<Entity>;
      }

      async parseFieldExpansions({
        expand,
        ...args
      }: Parameters<Interface["parseFieldExpansions"]>[0]) {
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

      async parseOrders({ order }: Parameters<Interface["parseOrders"]>[0]) {
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

      async finalizeList({
        entities,
        ...args
      }: Parameters<Interface["finalizeList"]>[0]): Promise<unknown> {
        return {
          total: await this.count({ ...args }),
          results: entities,
        };
      }
    };
  }

  protected defineInjectionsMetadata() {
    const repositoryKey: keyof RestService = "repository";
    InjectRepository(this.options.entityClass, this.options.repoConnection)(
      this.product.prototype,
      repositoryKey
    );
  }
}
