import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { FindConditions, Repository } from "typeorm";
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

      async list(...[options, ...args]: Parameters<Interface["list"]>) {
        return await this.repository.find({
          where: await this.getQueryConditions(undefined, ...args),
          take: options?.limit,
          skip: options?.offset,
        });
      }

      async create(...[dto, ...args]: Parameters<Interface["create"]>) {
        const entity = this.repository.create(dto);
        return await this.repository.save(entity);
      }

      async retrieve(...[lookup, ...args]: Parameters<Interface["retrieve"]>) {
        return await this.repository.findOneOrFail({
          where: await this.getQueryConditions(lookup, ...args),
        });
      }

      async replace(
        ...[lookup, dto, ...args]: Parameters<Interface["replace"]>
      ) {
        return await this.update(lookup, dto, ...args);
      }

      async update(...[lookup, dto, ...args]: Parameters<Interface["update"]>) {
        const rawEntity = await this.retrieve(lookup, ...args);
        const updatedEntity = this.repository.merge(rawEntity, dto);
        return await this.repository.save(updatedEntity);
      }

      async destroy(...[lookup, ...args]: Parameters<Interface["destroy"]>) {
        const entity = await this.retrieve(lookup, ...args);
        return await this.repository.remove(entity);
      }

      async count(...[...args]: Parameters<Interface["count"]>) {
        return await this.repository.count();
      }

      async transform(entity: Entity, ...args: any[]): Promise<Entity>;
      async transform(entities: Entity[], ...args: any[]): Promise<Entity[]>;
      async transform(entities: Entity | Entity[], ...args: any[]) {
        // to trigger overloads
        return entities instanceof Array
          ? plainToClass(options.entityClass, entities)
          : plainToClass(options.entityClass, entities);
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
    };
  }

  protected defineInjectionsMetadata() {
    InjectRepository(this.options.entityClass, this.options.repoConnection)(
      this.product.prototype,
      "repository"
    );
  }
}
