import {
  REST_REPOSITORY_SYMBOL,
  REST_SERVICE_OPTIONS_METADATA_KEY,
} from "src/constants";
import { RestServiceOptions } from "src/services/rest-service-options.interface";
import { Repository } from "typeorm";
import { LookupFields } from "./lookup-fields.type";
import { RestService } from "./rest-service.interface";

export class RestServiceFactory<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>
> {
  readonly service;

  constructor(
    readonly options: RestServiceOptions<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField
    >
  ) {
    this.service = this.createRawClass();
    Reflect.defineMetadata(
      REST_SERVICE_OPTIONS_METADATA_KEY,
      options,
      this.service
    );
  }

  protected createRawClass() {
    const options = this.options;

    type Interface = RestService<Entity, CreateDto, UpdateDto, LookupField>;
    return class RestService implements Interface {
      readonly [REST_REPOSITORY_SYMBOL]: Repository<Entity>;

      constructor(repository: Repository<Entity>) {
        this[REST_REPOSITORY_SYMBOL] = repository;
      }

      async list(...[options]: Parameters<Interface["list"]>) {
        return await this[REST_REPOSITORY_SYMBOL].find({
          where: {}, // let Typeorm know these are options, not conditions
          take: options?.limit,
          skip: options?.offset,
        });
      }

      async create(...[dto]: Parameters<Interface["create"]>) {
        const entity = this[REST_REPOSITORY_SYMBOL].create(dto);
        return await this[REST_REPOSITORY_SYMBOL].save(entity);
      }

      async retrieve(...[lookup]: Parameters<Interface["retrieve"]>) {
        return await this[REST_REPOSITORY_SYMBOL].findOneOrFail({
          [options.lookupField]: lookup,
        });
      }

      async replace(...[lookup, dto]: Parameters<Interface["replace"]>) {
        const entity = await this[REST_REPOSITORY_SYMBOL].findOne(lookup);
        if (entity) return await this.update(lookup, dto);
        return await this.create(dto);
      }

      async update(...[lookup, dto]: Parameters<Interface["update"]>) {
        const entity = await this.retrieve(lookup);
        Object.assign(entity, dto);
        return await this[REST_REPOSITORY_SYMBOL].save(entity);
      }

      async destroy(...[lookup]: Parameters<Interface["destroy"]>) {
        const entity = await this.retrieve(lookup);
        return await this[REST_REPOSITORY_SYMBOL].remove(entity);
      }

      async count(...[]: Parameters<Interface["count"]>) {
        return await this[REST_REPOSITORY_SYMBOL].count();
      }
    };
  }
}
