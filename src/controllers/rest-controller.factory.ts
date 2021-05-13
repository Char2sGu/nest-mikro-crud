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
import { ClassConstructor } from "class-transformer";
import { AbstractFactory } from "../abstract.factory";
import {
  REST_SERVICE_OPTIONS_METADATA_KEY,
  TS_TYPE_METADATA_KEY,
} from "../constants";
import { QueryDtoFactory } from "../dtos";
import { EntityNotFoundErrorFilter } from "../filters";
import {
  LookupFields,
  RestService,
  RestServiceFactoryOptions,
} from "../services";
import { ActionNames } from "./action-names.types";
import { RestControllerFactoryOptions } from "./rest-controller-factory-options.interface";
import { RestController } from "./rest-controller.interface";

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
  Service extends RestService<
    Entity,
    CreateDto,
    UpdateDto,
    LookupField
  > = RestService<Entity, CreateDto, UpdateDto, LookupField>
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
    this.completeActions();
    this.applyClassDecorators(
      UsePipes(new ValidationPipe(this.options.validationPipeOptions))
    );
    if (this.options.catchEntityNotFound)
      this.applyClassDecorators(UseFilters(EntityNotFoundErrorFilter));
  }

  protected processOptions(
    options: RestControllerFactoryOptions<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField
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
        ...[{ limit, offset, expand }, ...args]: Parameters<Interface["list"]>
      ): Promise<unknown> {
        const ctx = await this.prepareContext(args);
        const entities = await this.service.list({
          ...ctx,
          limit,
          offset,
          expand,
        });
        const transformed = await Promise.all(
          entities.map((entity) => this.service.transform({ ...ctx, entity }))
        );
        return await this.service.finalizeList({
          ...ctx,
          entities: transformed,
        });
      }

      async create(
        ...[{ expand }, data, ...args]: Parameters<Interface["create"]>
      ): Promise<unknown> {
        const ctx = await this.prepareContext(args);
        let entity = await this.service.create({ ...ctx, data });
        const lookup = entity[lookupField];
        entity = await this.service.retrieve({ ...ctx, lookup, expand });
        return await this.service.transform({ ...ctx, entity });
      }

      async retrieve(
        ...[lookup, { expand }, ...args]: Parameters<Interface["retrieve"]>
      ): Promise<unknown> {
        const ctx = await this.prepareContext(args);
        const entity = await this.service.retrieve({ ...ctx, lookup, expand });
        return await this.service.transform({ ...ctx, entity });
      }

      async replace(
        ...[lookup, { expand }, data, ...args]: Parameters<Interface["replace"]>
      ): Promise<unknown> {
        const ctx = await this.prepareContext(args);
        let entity: Entity;
        entity = await this.service.retrieve({ ...ctx, lookup });
        await this.service.replace({ ...ctx, entity, data });
        entity = await this.service.retrieve({ ...ctx, lookup, expand });
        return await this.service.transform({ ...ctx, entity });
      }

      async update(
        ...[lookup, { expand }, data, ...args]: Parameters<Interface["update"]>
      ): Promise<unknown> {
        const ctx = await this.prepareContext(args);
        let entity: Entity;
        entity = await this.service.retrieve({ ...ctx, lookup });
        await this.service.update({ ...ctx, entity, data });
        entity = await this.service.retrieve({ ...ctx, lookup, expand });
        return await this.service.transform({ ...ctx, entity });
      }

      async destroy(
        ...[lookup, ...args]: Parameters<Interface["destroy"]>
      ): Promise<unknown> {
        const ctx = await this.prepareContext(args);
        const entity = await this.service.retrieve({ ...ctx, lookup });
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

  protected defineInjectionsMetadata() {
    const target = this.product.prototype;
    const serviceKey: keyof RestController = "service";
    Inject(this.options.restServiceClass)(target, serviceKey);
  }

  protected completeActions() {
    const lookupType = this.lookupType;

    const {
      dtoClasses: { create: createDto, update: updateDto },
    } = this.serviceOptions;
    const { queryDto } = this.options;

    const path = `:${this.options.lookupParam}`;

    const Lookup = Param(
      this.options.lookupParam,
      ...(this.lookupType == Number ? [ParseIntPipe] : [])
    );
    const Queries = Query();
    const Data = Body();

    const contextTypes: ClassConstructor<unknown>[] = [];
    const contextDecorators: ParameterDecorator[][] = [];
    Object.values(this.options.contextOptions).forEach(
      ({ type, decorators }) => {
        contextTypes.push(type);
        contextDecorators.push(decorators);
      }
    );

    const table: Record<
      ActionNames,
      [MethodDecorator[], ClassConstructor<unknown>[], ParameterDecorator[][]]
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
      const name = k as ActionNames;
      this.applyMethodDecorators(name, ...methodDecorators)
        .defineParamTypesMetadata(name, ...paramTypes, ...contextTypes)
        .applyParamDecoratorSets(
          name,
          ...paramDecoratorSets,
          ...contextDecorators
        );
    }
  }
}
