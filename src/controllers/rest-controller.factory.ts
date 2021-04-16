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
import { ClassConstructor } from "class-transformer";
import { EntityNotFoundErrorFilter } from "src/entity-not-found-error.filter";
import { LookupFields } from "src/services/lookup-fields.type";
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

  constructor(
    readonly options: {
      restServiceClass: ClassConstructor<Service>;
    }
  ) {
    let restService: Service;

    type Interface = RestController<Entity, CreateDto, UpdateDto, LookupField>;
    this.controller = class RestController implements Interface {
      constructor(service: Service) {
        restService = service;
      }

      async list() {
        return await restService.list();
      }

      async create(dto: CreateDto) {
        return await restService.create(dto);
      }

      async retrieve(lookup: Entity[LookupField]) {
        return await restService.retrieve(lookup);
      }

      async update(lookup: Entity[LookupField], dto: UpdateDto) {
        return await restService.update(lookup, dto);
      }

      async destroy(lookup: Entity[LookupField]) {
        await restService.destroy(lookup);
      }
    };

    UseFilters(EntityNotFoundErrorFilter)(this.controller);
    this.applyDecorators("destroy", HttpCode(204));
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
