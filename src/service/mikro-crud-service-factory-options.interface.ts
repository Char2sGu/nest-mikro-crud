import { AnyEntity, EntityData } from "@mikro-orm/core";
import { Type } from "@nestjs/common";

export interface MikroCrudServiceFactoryOptions<
  Entity extends AnyEntity<Entity> = any,
  CreateDto extends EntityData<Entity> = EntityData<Entity>,
  UpdateDto extends EntityData<Entity> = EntityData<Entity>
> {
  /**
   * The entity's constructor whose repository will be auto-injected.
   */
  entityClass: Type<Entity>;
  /**
   * Be used to infer the generic types and apply validation in the
   * controller.
   */
  dtoClasses: {
    create: Type<CreateDto>;
    update: Type<UpdateDto>;
  };
}
