import { ListQueryDto } from "../dtos";
import { LookupFields, RestService } from "../services";

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
  LookupField extends LookupFields<Entity> = LookupFields<Entity>,
  CustomArgs extends any[] = any[]
> {
  readonly service: RestService<
    Entity,
    CreateDto,
    UpdateDto,
    LookupField,
    CustomArgs
  >;

  list(query: ListQueryDto, ...args: CustomArgs): Promise<Entity[]>;

  create(dto: CreateDto, ...args: CustomArgs): Promise<Entity>;

  retrieve(lookup: Entity[LookupField], ...args: CustomArgs): Promise<Entity>;

  replace(
    lookup: Entity[LookupField],
    dto: CreateDto,
    ...args: CustomArgs
  ): Promise<Entity>;

  update(
    lookup: Entity[LookupField],
    dto: UpdateDto,
    ...args: CustomArgs
  ): Promise<Entity>;

  destroy(lookup: Entity[LookupField], ...args: CustomArgs): Promise<void>;
}
