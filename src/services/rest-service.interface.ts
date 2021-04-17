import { LookupFields } from "./lookup-fields.type";

export interface RestService<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>
> {
  list(): Promise<Entity[]>;
  create(dto: CreateDto): Promise<Entity>;
  retrieve(lookup: Entity[LookupField]): Promise<Entity>;
  replace(lookup: Entity[LookupField], dto: CreateDto): Promise<Entity>;
  update(lookup: Entity[LookupField], dto: UpdateDto): Promise<Entity>;
  destroy(lookup: Entity[LookupField]): Promise<Entity>;
  count(): Promise<number>;
}
