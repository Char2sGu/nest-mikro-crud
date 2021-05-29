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
  Type,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { AbstractFactory } from "../abstract.factory";
import {
  REST_FACTORY_OPTIONS_METADATA_KEY,
  TS_TYPE_METADATA_KEY,
} from "../constants";
import { QueryDtoFactory } from "../dtos";
import { EntityNotFoundErrorFilter } from "../filters";
import { RestService, RestServiceFactoryOptions } from "../services";
import { ActionName, LookupableField } from "../types";
import { RestControllerFactoryOptions } from "./rest-controller-factory-options.interface";
import { RestController } from "./rest-controller.interface";

type ServiceGenerics<Service> = Service extends RestService<
  infer Entity,
  infer CreateDto,
  infer UpdateDto,
  infer LookupField
>
  ? {
      Entity: Entity;
      CreateDto: CreateDto;
      UpdateDto: UpdateDto;
      LookupField: LookupField;
    }
  : never;

// TODO: make the generic type `LookupField` literal
export class RestControllerFactory<
  Service extends RestService<
    Entity,
    CreateDto,
    UpdateDto,
    LookupField
  > = RestService,
  Entity = ServiceGenerics<Service>["Entity"],
  CreateDto = ServiceGenerics<Service>["CreateDto"],
  UpdateDto = ServiceGenerics<Service>["UpdateDto"],
  LookupField extends LookupableField<Entity> = ServiceGenerics<Service>["LookupField"]
> extends AbstractFactory<
  RestController<Entity, CreateDto, UpdateDto, LookupField, Service>
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
      Service
    >
  ) {
    super();

    this.options = this.standardizeOptions(options);

    this.serviceOptions = Reflect.getMetadata(
      REST_FACTORY_OPTIONS_METADATA_KEY,
      this.options.restServiceClass
    ) as RestServiceFactoryOptions<Entity, CreateDto, UpdateDto, LookupField>;

    this.lookupType = Reflect.getMetadata(
      TS_TYPE_METADATA_KEY,
      this.serviceOptions.entityClass.prototype,
      this.serviceOptions.lookupField
    );

    this.product = this.createRawClass();
    this.defineInjections();
    this.buildActions();
    this.applyClassDecorators(
      UsePipes(new ValidationPipe(this.options.validationPipeOptions)),
      UseFilters(
        ...(this.options.catchEntityNotFound ? [EntityNotFoundErrorFilter] : [])
      )
    );

    Reflect.defineMetadata(
      REST_FACTORY_OPTIONS_METADATA_KEY,
      this.options,
      this.product
    );
  }

  protected standardizeOptions(
    options: RestControllerFactoryOptions<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField,
      Service
    >
  ) {
    const {
      queryDto = new QueryDtoFactory({}).product,
      lookupParam = "lookup",
      catchEntityNotFound = true,
      validationPipeOptions = {},
      contextOptions = {},
    } = options;

    return {
      ...options,
      queryDto,
      lookupParam,
      catchEntityNotFound,
      validationPipeOptions: {
        ...validationPipeOptions,
        transform: true,
        transformOptions: {
          ...validationPipeOptions.transformOptions,
          exposeDefaultValues: true,
        },
      },
      contextOptions: Object.fromEntries(
        Object.entries(contextOptions).map(
          ([name, { type = Object, decorators }]) => [
            name,
            { type, decorators },
          ]
        )
      ),
    };
  }

  /**
   * Create a no-metadata controller class
   */
  protected createRawClass() {
    const { contextOptions } = this.options;
    const { lookupField } = this.serviceOptions;

    type Interface = RestController<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField,
      Service
    >;
    return class RestController implements Interface {
      readonly service!: Interface["service"];

      async list(
        ...[{ limit, offset, expand, order, filter }, ...args]: Parameters<
          Interface["list"]
        >
      ): Promise<unknown> {
        const action: ActionName = "list";
        const ctx = await this.prepareContext(args);
        await this.service.checkPermission({ ...ctx, action });
        const data = await this.service.list({
          ...ctx,
          limit,
          offset,
          expand,
          order,
          filter,
        });
        data.results = await Promise.all(
          data.results.map((entity) =>
            this.service.transform({ ...ctx, entity })
          )
        );
        return data;
      }

      async create(
        ...[{ expand }, data, ...args]: Parameters<Interface["create"]>
      ): Promise<unknown> {
        const action: ActionName = "create";
        const ctx = await this.prepareContext(args);
        await this.service.checkPermission({ ...ctx, action });
        let entity = await this.service.create({ ...ctx, data });
        const lookup = entity[lookupField];
        entity = await this.service.retrieve({ ...ctx, lookup, expand });
        return await this.service.transform({ ...ctx, entity });
      }

      async retrieve(
        ...[lookup, { expand }, ...args]: Parameters<Interface["retrieve"]>
      ): Promise<unknown> {
        const action: ActionName = "retrieve";
        const ctx = await this.prepareContext(args);
        await this.service.checkPermission({ ...ctx, action });
        const entity = await this.service.retrieve({ ...ctx, lookup, expand });
        await this.service.checkPermission({ ...ctx, action, entity });
        return await this.service.transform({ ...ctx, entity });
      }

      async replace(
        ...[lookup, { expand }, data, ...args]: Parameters<Interface["replace"]>
      ): Promise<unknown> {
        const action: ActionName = "replace";
        const ctx = await this.prepareContext(args);
        await this.service.checkPermission({ ...ctx, action });
        let entity = await this.service.retrieve({ ...ctx, lookup });
        await this.service.checkPermission({ ...ctx, action, entity });
        await this.service.replace({ ...ctx, entity, data });
        lookup = entity[lookupField]; // lookup may be updated
        entity = await this.service.retrieve({ ...ctx, lookup, expand });
        return await this.service.transform({ ...ctx, entity });
      }

      async update(
        ...[lookup, { expand }, data, ...args]: Parameters<Interface["update"]>
      ): Promise<unknown> {
        const action: ActionName = "update";
        const ctx = await this.prepareContext(args);
        await this.service.checkPermission({ ...ctx, action });
        let entity = await this.service.retrieve({ ...ctx, lookup });
        await this.service.checkPermission({ ...ctx, action, entity });
        await this.service.update({ ...ctx, entity, data });
        lookup = entity[lookupField]; // lookup may be updated
        entity = await this.service.retrieve({ ...ctx, lookup, expand });
        return await this.service.transform({ ...ctx, entity });
      }

      async destroy(
        ...[lookup, ...args]: Parameters<Interface["destroy"]>
      ): Promise<unknown> {
        const action: ActionName = "destroy";
        const ctx = await this.prepareContext(args);
        await this.service.checkPermission({ ...ctx, action });
        const entity = await this.service.retrieve({ ...ctx, lookup });
        await this.service.checkPermission({ ...ctx, action, entity });
        await this.service.destroy({ ...ctx, entity });
        return;
      }

      async prepareContext(args: unknown[]) {
        return Object.fromEntries(
          Object.keys(contextOptions).map((name, index) => [name, args[index]])
        );
      }
    };
  }

  protected defineInjections() {
    const { restServiceClass } = this.options;

    this.defineType("service", restServiceClass).applyPropertyDecorators(
      "service" as any, // service is generic so the type cannot be inferred correctly
      Inject(restServiceClass)
    );
  }

  protected buildActions() {
    const lookupType = this.lookupType;

    const {
      dtoClasses: { create: createDto, update: updateDto },
    } = this.serviceOptions;
    const { queryDto } = this.options;

    const path = `:${this.options.lookupParam}`;

    const Lookup = Param(
      this.options.lookupParam,
      ...(lookupType == Number ? [ParseIntPipe] : [])
    );
    const Queries = Query();
    const Data = Body();

    const contextTypes: Type[] = [];
    const contextDecorators: ParameterDecorator[][] = [];
    Object.values(this.options.contextOptions).forEach(
      ({ type, decorators }) => {
        contextTypes.push(type);
        contextDecorators.push(decorators);
      }
    );

    const table: Record<
      ActionName,
      [MethodDecorator[], Type[], ParameterDecorator[][]]
    > = {
      list: [[Get()], [queryDto], [[Queries]]],
      create: [[Post()], [queryDto, createDto], [[Queries], [Data]]],
      retrieve: [[Get(path)], [lookupType, queryDto], [[Lookup], [Queries]]],
      replace: [
        [Put(path)],
        [lookupType, queryDto, createDto],
        [[Lookup], [Queries], [Data]],
      ],
      update: [
        [Patch(path)],
        [lookupType, queryDto, updateDto],
        [[Lookup], [Queries], [Data]],
      ],
      destroy: [[Delete(path), HttpCode(204)], [lookupType], [[Lookup]]],
    };

    for (const [
      k,
      [methodDecorators, paramTypes, paramDecoratorSets],
    ] of Object.entries(table)) {
      const name = k as ActionName;
      this.applyMethodDecorators(name, ...methodDecorators)
        .defineParamTypes(name, ...paramTypes, ...contextTypes)
        .applyParamDecoratorSets(
          name,
          ...paramDecoratorSets,
          ...contextDecorators
        );
    }
  }
}
