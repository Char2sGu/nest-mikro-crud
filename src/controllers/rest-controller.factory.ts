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
    this.applyClassDecorators(
      UsePipes(new ValidationPipe(options.validationPipeOptions))
    );
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
    options.validationPipeOptions = {
      ...options.validationPipeOptions,
      transform: true,
      transformOptions: {
        ...options.validationPipeOptions?.transformOptions,
        exposeDefaultValues: true,
      },
    };
    return options as Required<typeof options>;
  }

  /**
   * Create a no-metadata controller class
   */
  protected createRawClass() {
    type Interface = RestController<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField,
      CustomArgs
    >;
    return class RestController implements Interface {
      readonly service!: Interface["service"];

      async list(
        ...[queries, ...args]: Parameters<Interface["list"]>
      ): Promise<unknown> {
        const entities = await this.service.list(queries, ...args);
        return Promise.all(
          entities.map((entity) => this.service.transform(entity, ...args))
        );
      }

      async create(
        ...[queries, dto, ...args]: Parameters<Interface["create"]>
      ): Promise<unknown> {
        const entity = await this.service.create(queries, dto, ...args);
        return await this.service.transform(entity, ...args);
      }

      async retrieve(
        ...[lookup, queries, ...args]: Parameters<Interface["retrieve"]>
      ): Promise<unknown> {
        const entity = await this.service.retrieve(lookup, queries, ...args);
        return await this.service.transform(entity, ...args);
      }

      async replace(
        ...[lookup, queries, dto, ...args]: Parameters<Interface["replace"]>
      ): Promise<unknown> {
        const entity = await this.service.replace(
          lookup,
          queries,
          dto,
          ...args
        );
        return await this.service.transform(entity, ...args);
      }

      async update(
        ...[lookup, queries, dto, ...args]: Parameters<Interface["update"]>
      ): Promise<unknown> {
        const entity = await this.service.update(lookup, queries, dto, ...args);
        return await this.service.transform(entity, ...args);
      }

      async destroy(
        ...[lookup, queries, ...args]: Parameters<Interface["destroy"]>
      ): Promise<unknown> {
        await this.service.destroy(lookup, queries, ...args);
        return;
      }
    };
  }

  protected defineInjectionsMetadata() {
    const target = this.product.prototype;
    Inject(this.options.restServiceClass)(target, "service");
  }

  protected defineRoutesTypesMetadata() {
    const lookupType = this.lookupType;
    const {
      dtoClasses: { create: createDto, update: updateDto },
    } = this.serviceOptions;
    const queryDto = this.options.queryDto;
    const extra = this.options.customArgs.map(([type]) => type);

    this.defineParamTypesMetadata("list", queryDto, ...extra)
      .defineParamTypesMetadata("create", queryDto, createDto, ...extra)
      .defineParamTypesMetadata("retrieve", lookupType, queryDto, ...extra)
      .defineParamTypesMetadata(
        "replace",
        lookupType,
        queryDto,
        createDto,
        ...extra
      )
      .defineParamTypesMetadata(
        "update",
        lookupType,
        queryDto,
        updateDto,
        ...extra
      )
      .defineParamTypesMetadata("destroy", lookupType, queryDto, ...extra);
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

    this.applyMethodDecorators("list", Get())
      .applyParamDecoratorSets("list", [AllQueries], ...extra)

      .applyMethodDecorators("create", Post())
      .applyParamDecoratorSets("create", [AllQueries], [Dto], ...extra)

      .applyMethodDecorators("retrieve", Get(path))
      .applyParamDecoratorSets(
        "retrieve",
        [LookupParam],
        [AllQueries],
        ...extra
      )

      .applyMethodDecorators("replace", Put(path))
      .applyParamDecoratorSets(
        "replace",
        [LookupParam],
        [AllQueries],
        [Dto],
        ...extra
      )

      .applyMethodDecorators("update", Patch(path))
      .applyParamDecoratorSets(
        "update",
        [LookupParam],
        [AllQueries],
        [Dto],
        ...extra
      )

      .applyMethodDecorators("destroy", Delete(path))
      .applyParamDecoratorSets(
        "destroy",
        [LookupParam],
        [AllQueries],
        ...extra
      );
  }
}
