import {
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
} from "@nestjs/common";
import { ClassConstructor, plainToClass } from "class-transformer";
import {
  REST_SERVICE_OPTIONS_METADATA_KEY,
  REST_SERVICE_SYMBOL,
} from "src/constants";
import { ListQueryDto } from "src/dtos/list-query.dto";
import { EntityNotFoundErrorFilter } from "src/entity-not-found-error.filter";
import { LookupFields } from "src/services/lookup-fields.type";
import { RestServiceOptions } from "src/services/rest-service-options.interface";
import { RestService } from "src/services/rest-service.interface";
import { RestControllerOptions } from "./rest-controller-options.interface";
import { RestController } from "./rest-controller.interface";
import { RouteNames } from "./route-names.types";

export class RestControllerFactory<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>,
  Service extends RestService<
    Entity,
    CreateDto,
    UpdateDto,
    LookupField
  > = RestService<Entity, CreateDto, UpdateDto, LookupField>
> {
  readonly options;
  readonly controller;
  readonly serviceOptions;

  constructor(options: RestControllerOptions<Service>) {
    this.options = this.processOptions(options);

    this.serviceOptions = Reflect.getMetadata(
      REST_SERVICE_OPTIONS_METADATA_KEY,
      this.options.restServiceClass
    ) as RestServiceOptions<Entity, CreateDto, UpdateDto, LookupField>;

    this.controller = this.createRawClass();
    this.emitRoutesParamsMetadata();
    this.emitRoutesMethodsMetadata();
    UseFilters(EntityNotFoundErrorFilter)(this.controller);
    this.applyDecorators("destroy", HttpCode(204));
  }

  protected processOptions(options: RestControllerOptions<Service>) {
    options.lookupParam = options.lookupParam ?? "lookup";
    options.serializationOptions = options.serializationOptions ?? {};
    return options as Required<typeof options>;
  }

  /**
   * Create a no-metadata controller class
   */
  protected createRawClass() {
    const serialize: {
      (plain: Entity): Entity;
      (plain: Entity[]): Entity[];
    } = (plain: Entity | Entity[]) =>
      plainToClass(
        this.serviceOptions.entityClass,
        plain,
        this.options.serializationOptions ?? {}
      ) as any;

    type Interface = RestController<Entity, CreateDto, UpdateDto, LookupField>;
    return class RestController implements Interface {
      readonly [REST_SERVICE_SYMBOL]: Service;

      constructor(service: Service) {
        this[REST_SERVICE_SYMBOL] = service;
      }

      async list(...[query]: Parameters<Interface["list"]>) {
        query = plainToClass(ListQueryDto, query, {
          excludeExtraneousValues: true,
        }); // parse number strings to numbers
        return serialize(await this[REST_SERVICE_SYMBOL].list(query));
      }

      async create(...[dto]: Parameters<Interface["create"]>) {
        return serialize(await this[REST_SERVICE_SYMBOL].create(dto));
      }

      async retrieve(...[lookup]: Parameters<Interface["retrieve"]>) {
        return serialize(await this[REST_SERVICE_SYMBOL].retrieve(lookup));
      }

      async replace(...[lookup, dto]: Parameters<Interface["replace"]>) {
        return serialize(await this[REST_SERVICE_SYMBOL].replace(lookup, dto));
      }

      async update(...[lookup, dto]: Parameters<Interface["update"]>) {
        return serialize(await this[REST_SERVICE_SYMBOL].update(lookup, dto));
      }

      async destroy(...[lookup]: Parameters<Interface["destroy"]>) {
        await this[REST_SERVICE_SYMBOL].destroy(lookup);
      }
    };
  }

  protected emitRoutesParamsMetadata() {
    this.emitParamTypesMetadata("list", [ListQueryDto])
      .emitParamTypesMetadata("create", ["dto:create"])
      .emitParamTypesMetadata("retrieve", ["lookup"])
      .emitParamTypesMetadata("replace", ["lookup", "dto:create"])
      .emitParamTypesMetadata("update", ["lookup", "dto:update"])
      .emitParamTypesMetadata("destroy", ["lookup"]);
  }

  protected emitRoutesMethodsMetadata() {
    const path = `:${this.options.lookupParam}`;

    const LookupParam = Param(this.options.lookupParam);
    const AllParams = Query();
    const Dto = Body();

    const routesMapping: Record<
      RouteNames,
      [MethodDecorator, ParameterDecorator[][]]
    > = {
      list: [Get(), [[AllParams]]],
      create: [Post(), [[Dto]]],
      retrieve: [Get(path), [[LookupParam]]],
      replace: [Put(path), [[LookupParam], [Dto]]],
      update: [Patch(path), [[LookupParam], [Dto]]],
      destroy: [Delete(path), [[LookupParam]]],
    };

    this.options.routes.forEach((routeName) => {
      const [routeDecorator, paramDecorators] = routesMapping[routeName];
      this.applyDecorators(routeName, routeDecorator);
      this.applyDecorators(routeName, ...paramDecorators);
    });
  }

  /**
   * Emit param types metadata to "design:paramtypes" manually.
   */
  emitParamTypesMetadata(
    name: RouteNames,
    types: (
      | ClassConstructor<unknown>
      | "lookup"
      | `dto:${"create" | "update"}`
    )[]
  ) {
    const TS_PARAM_TYPES_METADATA_KEY = "design:paramtypes";
    const TS_TYPE_METADATA_KEY = "design:type";

    const {
      dtoClasses: { create: createDto, update: updateDto },
      entityClass,
      lookupField,
    } = this.serviceOptions;

    const lookupType = Reflect.getMetadata(
      TS_TYPE_METADATA_KEY,
      entityClass.prototype,
      lookupField
    );

    const shortcutMap: Record<
      Extract<typeof types[0], string>,
      ClassConstructor<unknown>
    > = {
      lookup: lookupType,
      "dto:create": createDto,
      "dto:update": updateDto,
    };

    types = types.map((type) =>
      typeof type == "string" ? shortcutMap[type] : type
    );

    Reflect.defineMetadata(
      TS_PARAM_TYPES_METADATA_KEY,
      types,
      this.controller.prototype,
      name
    );

    return this;
  }

  /**
   * Apply multiple route-level decorators on a routing method
   * @param target
   * @param decorators
   */
  applyDecorators(target: RouteNames, ...decorators: MethodDecorator[]): this;
  /**
   * Apply multiple param-level decorators on a method param
   * @param target
   * @param decorators
   */
  applyDecorators(
    target: `${RouteNames}:${number}`,
    ...decorators: ParameterDecorator[]
  ): this;
  /**
   * Apply a list of parameter-level decorators to each parameter in order on a routing method
   * @param target
   * @param decoratorSet
   */
  applyDecorators(
    target: RouteNames,
    ...decoratorSet: ParameterDecorator[][]
  ): this;
  applyDecorators(
    target: RouteNames | `${RouteNames}:${number}`,
    ...decorators:
      | MethodDecorator[]
      | ParameterDecorator[]
      | ParameterDecorator[][]
  ) {
    if (!decorators.length) return this;

    const isParamDecorators = (
      v: typeof decorators
    ): v is ParameterDecorator[] => target.includes(":");

    const isParamDecoratorSets = (
      v: typeof decorators
    ): v is ParameterDecorator[][] => decorators[0] instanceof Array;

    const proto = this.controller.prototype;

    if (isParamDecorators(decorators)) {
      const [name, index] = target.split(":");
      decorators.forEach((d) => d(proto, name, +index));
    } else if (isParamDecoratorSets(decorators)) {
      const name = target;
      decorators.forEach((decorators, index) =>
        this.applyDecorators(
          `${name}:${index}` as `${RouteNames}:${number}`,
          ...decorators
        )
      );
    } else {
      const name = target;
      decorators.forEach((d) =>
        d(proto, name, Object.getOwnPropertyDescriptor(proto, name)!)
      );
    }

    return this;
  }
}
