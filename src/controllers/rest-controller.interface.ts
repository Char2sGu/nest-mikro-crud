import { LookupFields } from "src/services/lookup-fields.type";
import { RestService } from "src/services/rest-service.interface";

export interface RestController<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>
> {
  list(): Promise<Entity[]>;
  create(dto: CreateDto): Promise<Entity>;
  retrieve(lookup: Entity[LookupField]): Promise<Entity>;
  update(lookup: Entity[LookupField], dto: UpdateDto): Promise<Entity>;
  destroy(lookup: Entity[LookupField]): Promise<void>;
}
