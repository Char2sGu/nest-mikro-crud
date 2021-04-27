import { ListQueryDto } from "src/dtos";
import { LookupFields, RestService } from "src/services";

/**
 * ### Metadata in Overriding
 *
 * - Controller-level decorators store metadata in the controller, there is **NO
 * NEED** to decorate controllers again.
 * - Route-level decorators store metadata in the route method directly, which
 * will be lost when overriding the routes, so the routes **SHOULD BE** decoratored
 * again to make them work.
 * - Param-level decorators store metadata in the controller, so there's **NO
 * NEED** to decorate the params again, just ensure not to change the order of
 * the params.
 *
 * ### Rest Parameters
 *
 * Rest params in each route are for better extendability, without them there
 * can be no extra params when overloading the route.
 */
export interface RestController<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>
> {
  readonly service: RestService<Entity, CreateDto, UpdateDto, LookupField>;

  list(query: ListQueryDto, ...args: any[]): Promise<Entity[]>;

  create(dto: CreateDto, ...args: any[]): Promise<Entity>;

  retrieve(lookup: Entity[LookupField], ...args: any[]): Promise<Entity>;

  replace(
    lookup: Entity[LookupField],
    dto: CreateDto,
    ...args: any[]
  ): Promise<Entity>;

  update(
    lookup: Entity[LookupField],
    dto: UpdateDto,
    ...args: any[]
  ): Promise<Entity>;

  destroy(lookup: Entity[LookupField], ...args: any[]): Promise<void>;
}
