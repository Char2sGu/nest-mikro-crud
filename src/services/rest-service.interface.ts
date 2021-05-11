import {
  FindConditions,
  FindManyOptions,
  FindOneOptions,
  Repository,
} from "typeorm";
import { RelationPaths } from "../dtos";
import { LookupFields } from "./lookup-fields.type";

export interface RestService<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>
> {
  readonly repository: Repository<Entity>;

  list(args: {
    limit?: number;
    offset?: number;
    expand?: RelationPaths<Entity>[];
  }): Promise<Entity[]>;

  create(args: {
    data: CreateDto;
    expand?: RelationPaths<Entity>[];
  }): Promise<Entity>;

  retrieve(args: {
    lookup: Entity[LookupField];
    expand?: RelationPaths<Entity>[];
  }): Promise<Entity>;

  replace(args: {
    lookup: Entity[LookupField];
    data: CreateDto;
    expand?: RelationPaths<Entity>[];
  }): Promise<Entity>;

  update(args: {
    lookup: Entity[LookupField];
    data: UpdateDto;
    expand?: RelationPaths<Entity>[];
  }): Promise<Entity>;

  destroy(args: { lookup: Entity[LookupField] }): Promise<Entity>;

  count(args: {}): Promise<number>;

  /**
   * Transform the entity before sending the response.
   *
   * Interceptors are not used because overloading may change the data structure.
   */
  transform(args: { entity: Entity }): Promise<Entity>;

  /**
   * Could be overrided to enforce some conditions.
   * @param lookup
   */
  getQueryConditions(args: {
    lookup?: Entity[LookupField];
  }): Promise<FindConditions<Entity>>;

  getRelationOptions(args: {
    expand?: RelationPaths<Entity>[];
  }): Promise<FindOneOptions<Entity> | FindManyOptions<Entity>>;

  /**
   * Will be called before responding the `list` result. By default it returns the
   * entities directly, override it to change its behavior.
   * @param entities
   * @param queries
   * @param args
   */
  finalizeList(args: { entities: Entity[] }): Promise<unknown>;
}
