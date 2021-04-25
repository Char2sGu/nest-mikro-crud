import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
import { RestServiceFactoryOptions } from "src/services/rest-service-factory-options.interface";
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

      async list(...[options]: Parameters<Interface["list"]>) {
        return await this.repository.find({
          where: await this.getQueryConditions(),
          take: options?.limit,
          skip: options?.offset,
        });
      }

      async create(...[dto]: Parameters<Interface["create"]>) {
        const entity = this.repository.create(dto);
        return await this.repository.save(entity);
      }

      async retrieve(...[lookup]: Parameters<Interface["retrieve"]>) {
        return await this.repository.findOneOrFail({
          where: await this.getQueryConditions(lookup),
        });
      }

      async replace(...[lookup, dto]: Parameters<Interface["replace"]>) {
        try {
          return await this.update(lookup, dto);
        } catch (error) {
          if (error instanceof EntityNotFoundError)
            return await this.create(dto);
          throw error;
        }
      }

      async update(...[lookup, dto]: Parameters<Interface["update"]>) {
        const entity = await this.retrieve(lookup);
        Object.assign(entity, dto);
        return await this.repository.save(entity);
      }

      async destroy(...[lookup]: Parameters<Interface["destroy"]>) {
        const entity = await this.retrieve(lookup);
        return await this.repository.remove(entity);
      }

      async count(...[]: Parameters<Interface["count"]>) {
        return await this.repository.count();
      }

      async transform(entity: Entity): Promise<Entity>;
      async transform(entities: Entity[]): Promise<Entity[]>;
      async transform(entities: Entity | Entity[]) {
        // to trigger overloads
        return entities instanceof Array
          ? plainToClass(options.entityClass, entities)
          : plainToClass(options.entityClass, entities);
      }

      async getQueryConditions(
        ...[lookup]: Parameters<Interface["getQueryConditions"]>
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
