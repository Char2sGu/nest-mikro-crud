import { Type } from "@nestjs/common";
import { LookupableField } from "../types";

export interface RestServiceFactoryOptions<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupableField<Entity> = LookupableField<Entity>
> {
  /**
   * The entity's constructor whose repository will be auto-injected.
   */
  entityClass: Type<Entity>;
  /**
   * Specify the connection name of the entity repository.
   */
  repoConnection?: string;
  /**
   * Be used to infer the generic types and apply validation in the
   * controller.
   */
  dtoClasses: {
    create: Type<CreateDto>;
    update: Type<UpdateDto>;
  };
  /**
   * Choose the field used for entity lookup.
   */
  lookupField: LookupField;
}
