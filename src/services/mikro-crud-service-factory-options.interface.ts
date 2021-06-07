import { AnyEntity } from "@mikro-orm/core";
import { Type } from "@nestjs/common";

export interface MikroCrudServiceFactoryOptions<
  Entity extends AnyEntity<Entity> = any,
  CreateDto = Entity,
  UpdateDto = CreateDto
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
