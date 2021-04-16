import { ClassConstructor } from "class-transformer";
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
    readonly options: {
      entityClass: ClassConstructor<Entity>;
      dtoClasses: {
        create: ClassConstructor<CreateDto>;
        update: ClassConstructor<UpdateDto>;
      };
      lookupField: LookupField;
    }
  ) {
    // store data outside the service class to avoid namespace pollutions
    let repo: Repository<Entity>;

    type Interface = RestService<Entity, CreateDto, UpdateDto, LookupField>;
    this.service = class RestService implements Interface {
      constructor(repository: Repository<Entity>) {
        repo = repository;
      }

      async list() {
        return await repo.find();
      }

      async create(dto: CreateDto) {
        const entity = repo.create(dto);
        return await repo.save(entity);
      }

      async retrieve(lookup: Entity[LookupField]) {
        return await repo.findOneOrFail({ [options.lookupField]: lookup });
      }

      async update(lookup: Entity[LookupField], dto: UpdateDto) {
        const entity = await repo.findOneOrFail({
          [options.lookupField]: lookup,
        });
        Object.assign(entity, dto);
        return await repo.save(entity);
      }

      async destroy(lookup: Entity[LookupField]) {
        const entity = await repo.findOneOrFail({
          [options.lookupField]: lookup,
        });
        return await repo.remove(entity);
      }

      async count() {
        return await repo.count();
      }
    };
  }
}
