import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { FindConditions } from "typeorm";
import { AbstractFactory } from "../abstract.factory";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "../constants";
import { LookupFields } from "./lookup-fields.type";
import { RestServiceFactoryOptions } from "./rest-service-factory-options.interface";
import { RestService } from "./rest-service.interface";

export class RestServiceFactory<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>
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
    const options = this.options;

    type Interface = RestService<Entity, CreateDto, UpdateDto, LookupField>;
    return class RestService implements Interface {
      readonly repository!: Interface["repository"];

      async list({
        limit,
        offset,
        expand,
        ...args
      }: Parameters<Interface["list"]>[0]) {
        return await this.repository.find({
          where: await this.getQueryConditions({ ...args }),
          take: limit,
          skip: offset,
          ...(await this.getRelationOptions({ expand, ...args })),
        });
      }

      async create({
        data,
        expand,
        ...args
      }: Parameters<Interface["create"]>[0]) {
        const entity = await this.repository.save(data);
        return await this.retrieve({
          lookup: entity[options.lookupField],
          expand,
          ...args,
        });
      }

      async retrieve({
        lookup,
        expand,
        ...args
      }: Parameters<Interface["retrieve"]>[0]) {
        return await this.repository.findOneOrFail({
          where: await this.getQueryConditions({ lookup, ...args }),
          ...(await this.getRelationOptions({ expand, ...args })),
        });
      }

      async replace({
        lookup,
        data,
        expand,
        ...args
      }: Parameters<Interface["replace"]>[0]) {
        const rawEntity = await this.retrieve({ lookup, expand, ...args });
        const updatedEntity = this.repository.merge(rawEntity, data);
        await this.repository.save(updatedEntity);
        return await this.retrieve({
          lookup: updatedEntity[options.lookupField],
          expand,
          ...args,
        });
      }

      async update({
        lookup,
        data,
        expand,
        ...args
      }: Parameters<Interface["update"]>[0]) {
        const rawEntity = await this.retrieve({ lookup, expand, ...args });
        const updatedEntity = this.repository.merge(rawEntity, data);
        await this.repository.save(updatedEntity);
        return await this.retrieve({
          lookup: updatedEntity[options.lookupField],
          expand,
          ...args,
        });
      }

      async destroy({ lookup, ...args }: Parameters<Interface["destroy"]>[0]) {
        const entity = await this.retrieve({ lookup, ...args });
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
        return plainToClass(options.entityClass, entity);
      }

      async getQueryConditions({
        lookup,
        ...args
      }: Parameters<Interface["getQueryConditions"]>[0]) {
        return (lookup != null
          ? ({
              [options.lookupField]: lookup,
            } as unknown)
          : {}) as FindConditions<Entity>;
      }

      async getRelationOptions({
        expand = [],
        ...args
      }: Parameters<Interface["getRelationOptions"]>[0]) {
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
