import {
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseFilters,
} from "@nestjs/common";
import {
  ClassConstructor,
  ClassTransformOptions,
  plainToClass,
} from "class-transformer";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
import { EntityNotFoundErrorFilter } from "src/entity-not-found-error.filter";
import { LookupFields } from "src/services/lookup-fields.type";
import { RestServiceOptions } from "src/services/rest-service-options.interface";
import { RestService } from "src/services/rest-service.interface";
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
  readonly controller;
  readonly serviceOptions;

  constructor(
    readonly options: {
      restServiceClass: ClassConstructor<Service>;
      serializationOptions?: ClassTransformOptions;
    }
  ) {
    this.serviceOptions = Reflect.getMetadata(
      REST_SERVICE_OPTIONS_METADATA_KEY,
      this.options.restServiceClass
    ) as RestServiceOptions<Entity, CreateDto, UpdateDto, LookupField>;

    function serialize(plain: Entity[]): Entity[];
    function serialize(plain: Entity): Entity;
    function serialize(plain: Entity | Entity[]) {
      return plainToClass(
        entityClass,
        plain,
        options.serializationOptions ?? {}
      ) as Entity | Entity[];
    }

    const { entityClass } = this.serviceOptions;

    let restService: Service;

    type Interface = RestController<Entity, CreateDto, UpdateDto, LookupField>;
    this.controller = class RestController implements Interface {
      constructor(service: Service) {
        restService = service;
      }

      async list() {
        return serialize(await restService.list());
      }

      async create(dto: CreateDto) {
        return serialize(await restService.create(dto));
      }

      async retrieve(lookup: Entity[LookupField]) {
        return serialize(await restService.retrieve(lookup));
      }

      async update(lookup: Entity[LookupField], dto: UpdateDto) {
        return serialize(await restService.update(lookup, dto));
      }

      async destroy(lookup: Entity[LookupField]) {
        await restService.destroy(lookup);
      }
    };

    this.emitParamTypesMetadata();
    UseFilters(EntityNotFoundErrorFilter)(this.controller);
    this.applyDecorators("destroy", HttpCode(204));
  }

  /**
   * Emit param types metadata to "design:paramtypes" manually.
   */
  protected emitParamTypesMetadata() {
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

    for (const [name, types] of [
      ["list", []],
      ["create", [createDto]],
      ["retrieve", [lookupType]],
      ["update", [lookupType, updateDto]],
      ["destroy", [lookupType]],
    ] as [RouteNames, any[]][])
      Reflect.defineMetadata(
        TS_PARAM_TYPES_METADATA_KEY,
        types,
        this.controller.prototype,
        name
      );
  }

  enableRoutes({
    lookupParam = "lookup",
    routeNames,
  }: {
    lookupParam?: string;
    routeNames: RouteNames[];
  }) {
    const path = `:${lookupParam}`;

    const routesMapping: Record<
      RouteNames,
      [MethodDecorator, ParameterDecorator[]]
    > = {
      list: [Get(), []],
      create: [Post(), [Body()]],
      retrieve: [Get(path), [Param(lookupParam)]],
      update: [Patch(path), [Param(lookupParam), Body()]],
      destroy: [Delete(path), [Param(lookupParam)]],
    };

    routeNames.forEach((routeName) => {
      const [routeDecorator, paramDecorators] = routesMapping[routeName];
      this.applyDecorators(routeName, routeDecorator);
      paramDecorators.forEach((decorator, index) => {
        const target = `${routeName}:${index}` as `${RouteNames}:${number}`;
        this.applyDecorators(target, decorator);
      });
    });

    return this;
  }

  applyDecorators(
    target: RouteNames,
    ...decorators: MethodDecorator[]
  ): RestControllerFactory<Entity, CreateDto, UpdateDto, LookupField, Service>;
  applyDecorators(
    target: `${RouteNames}:${number}`,
    ...decorators: ParameterDecorator[]
  ): RestControllerFactory<Entity, CreateDto, UpdateDto, LookupField, Service>;
  applyDecorators(
    target: RouteNames | `${RouteNames}:${number}`,
    ...decorators: MethodDecorator[] | ParameterDecorator[]
  ) {
    function isParamMode(v: typeof decorators): v is ParameterDecorator[] {
      return target.includes(":");
    }

    const proto = this.controller.prototype;

    if (isParamMode(decorators)) {
      const [name, index] = target.split(":");
      decorators.forEach((d) => d(proto, name, +index));
    } else {
      const name = target;
      decorators.forEach((d) =>
        d(proto, name, Object.getOwnPropertyDescriptor(proto, name)!)
      );
    }

    return this;
  }
}
