import {
  Body,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { AbstractFactory } from "../abstract.factory";
import {
  REST_SERVICE_OPTIONS_METADATA_KEY,
  TS_TYPE_METADATA_KEY,
} from "../constants";
import { QueryDtoFactory } from "../dtos";
import { EntityNotFoundErrorFilter } from "../filters";
import { LookupFields, RestServiceFactoryOptions } from "../services";
import { RestControllerFactoryOptions } from "./rest-controller-factory-options.interface";
import { RestController } from "./rest-controller.interface";
import { RouteNames } from "./route-names.types";

// TODO: Fix the issue below.
/**
 * Strangely, literal generic types will be lost in nested type inferences and I've not
 * found any graceful solutions yet.
 */
export class RestControllerFactory<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupFields<Entity> = LookupFields<Entity>,
  CustomArgs extends any[] = any[]
> extends AbstractFactory<
  RestController<Entity, CreateDto, UpdateDto, LookupField, CustomArgs>
> {
  readonly options;
  readonly serviceOptions;
  readonly lookupType: typeof Number | typeof String;
  readonly product;

  constructor(
    options: RestControllerFactoryOptions<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField,
      CustomArgs
    >
  ) {
    super();

    this.options = this.processOptions(options);

    this.serviceOptions = Reflect.getMetadata(
      REST_SERVICE_OPTIONS_METADATA_KEY,
      this.options.restServiceClass
    ) as RestServiceFactoryOptions<Entity, CreateDto, UpdateDto, LookupField>;

    this.lookupType = Reflect.getMetadata(
      TS_TYPE_METADATA_KEY,
      this.serviceOptions.entityClass.prototype,
      this.serviceOptions.lookupField
    );

    this.product = this.createRawClass();
    this.defineInjectionsMetadata();
    this.defineRoutesTypesMetadata();
    this.applyRoutesDecorators();
    this.applyClassDecorators(UsePipes(ValidationPipe));
    if (options.catchEntityNotFound)
      this.applyClassDecorators(UseFilters(EntityNotFoundErrorFilter));
    this.applyMethodDecorators("destroy", HttpCode(204));
  }

  protected processOptions(
    options: RestControllerFactoryOptions<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField,
      CustomArgs
    >
  ) {
    options.queryDto = options.queryDto ?? new QueryDtoFactory({}).product;
    options.lookupParam = options.lookupParam ?? "lookup";
    options.customArgs = options.customArgs ?? [];
    options.catchEntityNotFound = options.catchEntityNotFound ?? true;
    return options as Required<typeof options>;
  }

  /**
   * Create a no-metadata controller class
   */
  protected createRawClass() {
    const options = this.options;

    type Interface = RestController<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField,
      CustomArgs
    >;
    return class RestController implements Interface {
      readonly service!: Interface["service"];

      async list(...[query, ...args]: Parameters<Interface["list"]>) {
        query = plainToClass(options.queryDto, query, {
          exposeDefaultValues: true,
        });
        // The query dto may be customized with some extra fields.
        const { limit, offset } = query;
        const entities = await this.service.list({ limit, offset }, ...args);
        return Promise.all(
          entities.map((entity) => this.service.transform(entity, ...args))
        );
      }

      async create(...[dto, ...args]: Parameters<Interface["create"]>) {
        const entity = await this.service.create(dto, ...args);
        return await this.service.transform(entity, ...args);
      }

      async retrieve(...[lookup, ...args]: Parameters<Interface["retrieve"]>) {
        const entity = await this.service.retrieve(lookup, ...args);
        return await this.service.transform(entity, ...args);
      }

      async replace(
        ...[lookup, dto, ...args]: Parameters<Interface["replace"]>
      ) {
        const entity = await this.service.replace(lookup, dto, ...args);
        return await this.service.transform(entity, ...args);
      }

      async update(...[lookup, dto, ...args]: Parameters<Interface["update"]>) {
        const entity = await this.service.update(lookup, dto, ...args);
        return await this.service.transform(entity, ...args);
      }

      async destroy(...[lookup, ...args]: Parameters<Interface["destroy"]>) {
        await this.service.destroy(lookup, ...args);
      }
    };
  }

  protected defineInjectionsMetadata() {
    const target = this.product.prototype;
    Inject(this.options.restServiceClass)(target, "service");
  }

  protected defineRoutesTypesMetadata() {
    const {
      dtoClasses: { create: createDto, update: updateDto },
    } = this.serviceOptions;

    const extra = this.options.customArgs.map(([type]) => type);
    this.defineParamTypesMetadata("list", this.options.queryDto, ...extra)
      .defineParamTypesMetadata("create", createDto, ...extra)
      .defineParamTypesMetadata("retrieve", this.lookupType, ...extra)
      .defineParamTypesMetadata("replace", this.lookupType, createDto, ...extra)
      .defineParamTypesMetadata("update", this.lookupType, updateDto, ...extra)
      .defineParamTypesMetadata("destroy", this.lookupType, ...extra);
  }

  protected applyRoutesDecorators() {
    const path = `:${this.options.lookupParam}`;

    const LookupParam = Param(
      this.options.lookupParam,
      ...(this.lookupType == Number ? [ParseIntPipe] : [])
    );
    const AllQueries = Query();
    const Dto = Body();

    const extra = this.options.customArgs.map(([, decoraotrs]) => decoraotrs);
    const routesMapping: Record<
      RouteNames,
      [MethodDecorator, ParameterDecorator[][]]
    > = {
      list: [Get(), [[AllQueries], ...extra]],
      create: [Post(), [[Dto], ...extra]],
      retrieve: [Get(path), [[LookupParam], ...extra]],
      replace: [Put(path), [[LookupParam], [Dto], ...extra]],
      update: [Patch(path), [[LookupParam], [Dto], ...extra]],
      destroy: [Delete(path), [[LookupParam], ...extra]],
    };

    this.options.routes.forEach((routeName) => {
      const [routeDecorator, paramDecoratorSets] = routesMapping[routeName];
      this.applyMethodDecorators(routeName, routeDecorator);
      this.applyParamDecoratorSets(routeName, ...paramDecoratorSets);
    });
  }
}
