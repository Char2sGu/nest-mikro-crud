import { REST_REPOSITORY_PROPERTY_KEY } from "src/constants";
import { Repository } from "typeorm";
import { LookupFields } from "./lookup-fields.type";

export interface RestService<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>
> {
  readonly [REST_REPOSITORY_PROPERTY_KEY]: Repository<Entity>;

  list(options?: { limit?: number; offset?: number }): Promise<Entity[]>;

  create(dto: CreateDto): Promise<Entity>;

  retrieve(lookup: Entity[LookupField]): Promise<Entity>;

  replace(lookup: Entity[LookupField], dto: CreateDto): Promise<Entity>;

  update(
    lookup: Entity[LookupField],

    dto: CreateDto | UpdateDto
  ): Promise<Entity>;

  destroy(lookup: Entity[LookupField]): Promise<Entity>;

  count(): Promise<number>;

  transform(entities: Entity[]): Promise<Entity[]>;
  transform(entity: Entity): Promise<Entity>;
}
