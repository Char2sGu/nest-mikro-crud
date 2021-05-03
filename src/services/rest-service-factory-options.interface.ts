import { ClassConstructor } from "class-transformer";
import { LookupFields } from "./lookup-fields.type";

export interface RestServiceFactoryOptions<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>,
  CustomArgs extends any[] = any[]
> {
  /**
   * The entity's constructor whose repository will be auto-injected.
   */
  entityClass: ClassConstructor<Entity>;
  /**
   * Specify the connection name of the entity repository.
   */
  repoConnection?: string;
  /**
   * Be used to infer the generic types and apply validation in the
   * controller.
   */
  dtoClasses: {
    create: ClassConstructor<CreateDto>;
    update: ClassConstructor<UpdateDto>;
  };
  /**
   * Choose the field used for entity lookup.
   */
  lookupField: LookupField;
  /**
   * Helper to infer custom args' types.
   */
  customArgs?: (...args: CustomArgs) => any;
}
