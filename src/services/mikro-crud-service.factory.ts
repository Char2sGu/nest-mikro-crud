import { EntityRepository, ReferenceType } from "@mikro-orm/core";
import {
  AnyEntity,
  EntityData,
  NonFunctionPropertyNames,
} from "@mikro-orm/core/typings";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Type } from "@nestjs/common";
import { AbstractFactory } from "../abstract.factory";
import { FACTORY_METADATA_KEY } from "../symbols";
import { MikroCrudServiceFactoryOptions } from "./mikro-crud-service-factory-options.interface";
import { MikroCrudService } from "./mikro-crud-service.class";

export class MikroCrudServiceFactory<
  Entity extends AnyEntity<Entity> = any,
  CreateDto extends EntityData<Entity> = EntityData<Entity>,
  UpdateDto extends EntityData<Entity> = EntityData<Entity>
> extends AbstractFactory<MikroCrudService<Entity, CreateDto, UpdateDto>> {
  readonly options;
  readonly product;

  constructor(
    options: MikroCrudServiceFactoryOptions<Entity, CreateDto, UpdateDto>
  ) {
    super();
    this.options = this.standardizeOptions(options);
    this.product = this.create();
    Reflect.defineMetadata(FACTORY_METADATA_KEY, this, this.product);
  }

  protected standardizeOptions(
    options: MikroCrudServiceFactoryOptions<Entity, CreateDto, UpdateDto>
  ) {
    return options;
  }

  protected create(): Type<MikroCrudService<Entity, CreateDto, UpdateDto>> {
    const { entityClass } = this.options;

    class Service extends MikroCrudService<Entity, CreateDto, UpdateDto> {
      @InjectRepository(entityClass)
      readonly repository!: EntityRepository<Entity>;
      readonly collectionFields = new entityClass()
        .__helper!.__meta.relations.filter(
          ({ reference, hidden }) =>
            !hidden &&
            (reference == ReferenceType.ONE_TO_MANY ||
              reference == ReferenceType.MANY_TO_MANY)
        )
        .map(({ name }) => name as NonFunctionPropertyNames<Entity>);
    }

    return Service;
  }
}
