import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
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
    // store data outside the service class to avoid namespace pollutions
    let repo: Repository<Entity>;

    type Interface = RestService<Entity, CreateDto, UpdateDto, LookupField>;
    this.service = class RestService implements Interface {
      constructor(repository: Repository<Entity>) {
        repo = repository;
      }

      async list(...[]: Parameters<Interface["list"]>) {
        return await repo.find();
      }

      async create(...[dto]: Parameters<Interface["create"]>) {
        const entity = repo.create(dto);
        return await repo.save(entity);
      }

      async retrieve(...[lookup]: Parameters<Interface["retrieve"]>) {
        return await repo.findOneOrFail({ [options.lookupField]: lookup });
      }

      async replace(...[lookup, dto]: Parameters<Interface["replace"]>) {
        const entity = await repo.findOne(lookup);
        if (entity) return await this.update(lookup, dto);
        return await this.create(dto);
      }

      async update(...[lookup, dto]: Parameters<Interface["update"]>) {
        const entity = await this.retrieve(lookup);
        Object.assign(entity, dto);
        return await repo.save(entity);
      }

      async destroy(...[lookup]: Parameters<Interface["destroy"]>) {
        const entity = await this.retrieve(lookup);
        return await repo.remove(entity);
      }

      async count(...[]: Parameters<Interface["count"]>) {
        return await repo.count();
      }
    };

    Reflect.defineMetadata(
      REST_SERVICE_OPTIONS_METADATA_KEY,
      options,
      this.service
    );
  }
}
