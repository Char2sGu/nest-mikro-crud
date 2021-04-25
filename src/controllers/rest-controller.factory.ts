import {
  Body,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
} from "@nestjs/common";
import { ClassConstructor, plainToClass } from "class-transformer";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
import { ListQueryDto } from "src/dtos/list-query.dto";
import { EntityNotFoundErrorFilter } from "src/filters/entity-not-found-error.filter";
import { LookupFields } from "src/services/lookup-fields.type";
import { RestServiceFactoryOptions } from "src/services/rest-service-factory-options.interface";
import { RestService } from "src/services/rest-service.interface";
import { RestControllerFactoryOptions } from "./rest-controller-factory-options.interface";
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

  constructor(options: RestControllerFactoryOptions<Service>) {
    this.options = this.processOptions(options);

    this.serviceOptions = Reflect.getMetadata(
      REST_SERVICE_OPTIONS_METADATA_KEY,
      this.options.restServiceClass
    ) as RestServiceFactoryOptions<Entity, CreateDto, UpdateDto, LookupField>;

    this.controller = this.createRawClass();
    this.emitInjectionsMetadata();
    this.emitRoutesParamsMetadata();
    this.emitRoutesMethodsMetadata();
    UseFilters(EntityNotFoundErrorFilter)(this.controller);
    this.applyDecorators("destroy", HttpCode(204));
  }

  protected processOptions(options: RestControllerFactoryOptions<Service>) {
    options.lookupParam = options.lookupParam ?? "lookup";
    return options as Required<typeof options>;
  }

  /**
   * Create a no-metadata controller class
   */
  protected createRawClass() {
    type Interface = RestController<Entity, CreateDto, UpdateDto, LookupField>;
    return class RestController implements Interface {
      readonly service!: Service;

      async list(...[query]: Parameters<Interface["list"]>) {
        query = plainToClass(ListQueryDto, query, {
          excludeExtraneousValues: true,
        }); // parse number strings to numbers
        const entities = await this.service.list(query);
        return await this.service.transform(entities);
      }

      async create(...[dto]: Parameters<Interface["create"]>) {
        const entity = await this.service.create(dto);
        return await this.service.transform(entity);
      }

      async retrieve(...[lookup]: Parameters<Interface["retrieve"]>) {
        const entity = await this.service.retrieve(lookup);
        return await this.service.transform(entity);
      }

      async replace(...[lookup, dto]: Parameters<Interface["replace"]>) {
        const entity = await this.service.replace(lookup, dto);
        return await this.service.transform(entity);
      }

      async update(...[lookup, dto]: Parameters<Interface["update"]>) {
        const entity = await this.service.update(lookup, dto);
        return await this.service.transform(entity);
      }

      async destroy(...[lookup]: Parameters<Interface["destroy"]>) {
        await this.service.destroy(lookup);
      }
    };
  }

  protected emitInjectionsMetadata() {
    const target = this.controller.prototype;
    Inject(this.options.restServiceClass)(target, "service");
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
   * @param decoratorSets
   */
  applyDecorators(
    target: RouteNames,
    ...decoratorSets: ParameterDecorator[][]
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
