import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
import { RestServiceFactoryOptions } from "src/services";
import { EntityNotFoundError, FindConditions, Repository } from "typeorm";
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
    readonly options: RestServiceFactoryOptions<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField
    >
  ) {
    this.service = this.createRawClass();
    this.emitInjectionsMetadata();

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
      readonly repository!: Repository<Entity>;

      async list(...[options, ...args]: Parameters<Interface["list"]>) {
        return await this.repository.find({
          where: await this.getQueryConditions(...args),
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
        try {
          return await this.update(lookup, dto, ...args);
        } catch (error) {
          if (error instanceof EntityNotFoundError)
            return await this.create(dto, ...args);
          throw error;
        }
      }

      async update(...[lookup, dto, ...args]: Parameters<Interface["update"]>) {
        const entity = await this.retrieve(lookup, ...args);
        Object.assign(entity, dto);
        return await this.repository.save(entity);
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
        return lookup != null
          ? (({
              [options.lookupField]: lookup,
            } as unknown) as FindConditions<Entity>)
          : {};
      }
    };
  }

  protected emitInjectionsMetadata() {
    InjectRepository(this.options.entityClass, this.options.repoConnection)(
      this.service.prototype,
      "repository"
    );
  }
}
