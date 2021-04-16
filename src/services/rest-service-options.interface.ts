import { ClassConstructor } from "class-transformer";
import { LookupFields } from "./lookup-fields.type";

export interface RestServiceOptions<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>
> {
  entityClass: ClassConstructor<Entity>;
  dtoClasses: {
    create: ClassConstructor<CreateDto>;
    update: ClassConstructor<UpdateDto>;
  };
  lookupField: LookupField;
}
