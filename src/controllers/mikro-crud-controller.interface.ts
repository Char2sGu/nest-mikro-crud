import { BaseEntity } from "@mikro-orm/core";
import { QueryDto } from "../dtos";
import { MikroCrudService } from "../services";
import { LookupableField } from "../types";

export interface MikroCrudController<
  Entity extends BaseEntity<any, any> = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupableField<Entity> = LookupableField<Entity>,
  Service extends MikroCrudService<
    Entity,
    CreateDto,
    UpdateDto
  > = MikroCrudService<Entity, CreateDto, UpdateDto>
> {
  readonly service: Service;

  list(queries: QueryDto<Entity>, user: any, ...args: any[]): Promise<unknown>;

  create(data: CreateDto, user: any, ...args: any[]): Promise<unknown>;

  retrieve(
    lookup: Entity[LookupField],
    user: any,
    ...args: any[]
  ): Promise<unknown>;

  replace(
    lookup: Entity[LookupField],
    data: CreateDto,
    user: any,
    ...args: any[]
  ): Promise<unknown>;

  update(
    lookup: Entity[LookupField],
    data: UpdateDto,
    user: any,
    ...args: any[]
  ): Promise<unknown>;

  destroy(
    lookup: Entity[LookupField],
    user: any,
    ...args: any[]
  ): Promise<unknown>;
}
