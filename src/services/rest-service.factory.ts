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
  LookupField extends LookupFields<Entity> = LookupFields<Entity>,
  CustomArgs extends any[] = any[]
> extends AbstractFactory<
  RestService<Entity, CreateDto, UpdateDto, LookupField, CustomArgs>
> {
  readonly product;

  constructor(
    readonly options: RestServiceFactoryOptions<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField,
      CustomArgs
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

    type Interface = RestService<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField,
      CustomArgs
    >;
    return class RestService implements Interface {
      readonly repository!: Interface["repository"];

      async list(...[queries, ...args]: Parameters<Interface["list"]>) {
        return await this.repository.find({
          where: await this.getQueryConditions(undefined, ...args),
          take: queries.limit,
          skip: queries.offset,
          ...(await this.getRelationOptions(queries, ...args)),
        });
      }

      async create(
        ...[queries, dto, ...args]: Parameters<Interface["create"]>
      ) {
        const entity = await this.repository.save(dto);
        return await this.retrieve(
          entity[options.lookupField],
          queries,
          ...args
        );
      }

      async retrieve(
        ...[lookup, queries, ...args]: Parameters<Interface["retrieve"]>
      ) {
        return await this.repository.findOneOrFail({
          where: await this.getQueryConditions(lookup, ...args),
          ...(await this.getRelationOptions(queries, ...args)),
        });
      }

      async replace(
        ...[lookup, queries, dto, ...args]: Parameters<Interface["replace"]>
      ) {
        const rawEntity = await this.retrieve(lookup, queries, ...args);
        const updatedEntity = this.repository.merge(rawEntity, dto);
        await this.repository.save(updatedEntity);
        return await this.retrieve(
          updatedEntity[options.lookupField],
          queries,
          ...args
        );
      }

      async update(
        ...[lookup, queries, dto, ...args]: Parameters<Interface["update"]>
      ) {
        const rawEntity = await this.retrieve(lookup, queries, ...args);
        const updatedEntity = this.repository.merge(rawEntity, dto);
        await this.repository.save(updatedEntity);
        return await this.retrieve(
          updatedEntity[options.lookupField],
          queries,
          ...args
        );
      }

      async destroy(
        ...[lookup, queries, ...args]: Parameters<Interface["destroy"]>
      ) {
        const entity = await this.retrieve(lookup, queries, ...args);
        return await this.repository.remove(entity);
      }

      async count(...args: Parameters<Interface["count"]>) {
        return await this.repository.count({
          where: await this.getQueryConditions(undefined, ...args),
        });
      }

      async transform(
        ...[entity, ...args]: Parameters<Interface["transform"]>
      ) {
        return plainToClass(options.entityClass, entity);
      }

      async getQueryConditions(
        ...[lookup, ...args]: Parameters<Interface["getQueryConditions"]>
      ) {
        return (lookup != null
          ? ({
              [options.lookupField]: lookup,
            } as unknown)
          : {}) as FindConditions<Entity>;
      }

      async getRelationOptions(
        ...[queries, ...args]: Parameters<Interface["getRelationOptions"]>
      ) {
        const allRelationPaths = this.repository.metadata.relations.map(
          (relation) => relation.propertyPath
        );
        return {
          relations: queries.expand,
          loadRelationIds: {
            relations: allRelationPaths.filter(
              (v) => !queries.expand.includes(v as any)
            ),
          },
        };
      }

      async finalizeList(
        ...[entities, queries, ...args]: Parameters<Interface["finalizeList"]>
      ): Promise<unknown> {
        return {
          total: await this.count(...args),
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
