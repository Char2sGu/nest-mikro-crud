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
import {
  LookupFields,
  RestService,
  RestServiceFactoryOptions,
} from "../services";
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
    this.defineRoutesTypesMetadata();
    this.applyRoutesDecorators();
    this.applyClassDecorators(
      UsePipes(new ValidationPipe(this.options.validationPipeOptions))
    );
    if (this.options.catchEntityNotFound)
      this.applyClassDecorators(UseFilters(EntityNotFoundErrorFilter));
    this.applyMethodDecorators("destroy", HttpCode(204));
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
    };
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
      Service
    >;
    return class RestController implements Interface {
      readonly service!: Interface["service"];

      async list(
        ...[{ limit, offset, expand }]: Parameters<Interface["list"]>
      ): Promise<unknown> {
        const entities = await this.service.list({ limit, offset, expand });
        const transformed = await Promise.all(
          entities.map((entity) => this.service.transform({ entity }))
        );
        return await this.service.finalizeList({ entities: transformed });
      }

      async create(
        ...[{ expand }, data]: Parameters<Interface["create"]>
      ): Promise<unknown> {
        const entity = await this.service.create({ data, expand });
        return await this.service.transform({ entity });
      }

      async retrieve(
        ...[lookup, { expand }]: Parameters<Interface["retrieve"]>
      ): Promise<unknown> {
        const entity = await this.service.retrieve({ lookup, expand });
        return await this.service.transform({ entity });
      }

      async replace(
        ...[lookup, { expand }, data]: Parameters<Interface["replace"]>
      ): Promise<unknown> {
        const entity = await this.service.replace({ lookup, data, expand });
        return await this.service.transform({ entity });
      }

      async update(
        ...[lookup, { expand }, data]: Parameters<Interface["update"]>
      ): Promise<unknown> {
        const entity = await this.service.update({ lookup, data, expand });
        return await this.service.transform({ entity });
      }

      async destroy(
        ...[lookup]: Parameters<Interface["destroy"]>
      ): Promise<unknown> {
        await this.service.destroy({ lookup });
        return;
      }
    };
  }

  protected defineInjectionsMetadata() {
    const target = this.product.prototype;
    const serviceKey: keyof RestController = "service";
    Inject(this.options.restServiceClass)(target, serviceKey);
  }

  protected defineRoutesTypesMetadata() {
    const lookupType = this.lookupType;
    const {
      dtoClasses: { create: createDto, update: updateDto },
    } = this.serviceOptions;
    const queryDto = this.options.queryDto;

    this.defineParamTypesMetadata("list", queryDto)
      .defineParamTypesMetadata("create", queryDto, createDto)
      .defineParamTypesMetadata("retrieve", lookupType, queryDto)
      .defineParamTypesMetadata("replace", lookupType, queryDto, createDto)
      .defineParamTypesMetadata("update", lookupType, queryDto, updateDto)
      .defineParamTypesMetadata("destroy", lookupType);
  }

  protected applyRoutesDecorators() {
    const path = `:${this.options.lookupParam}`;

    const LookupParam = Param(
      this.options.lookupParam,
      ...(this.lookupType == Number ? [ParseIntPipe] : [])
    );
    const AllQueries = Query();
    const Dto = Body();

    this.applyMethodDecorators("list", Get())
      .applyParamDecoratorSets("list", [AllQueries])

      .applyMethodDecorators("create", Post())
      .applyParamDecoratorSets("create", [AllQueries], [Dto])

      .applyMethodDecorators("retrieve", Get(path))
      .applyParamDecoratorSets("retrieve", [LookupParam], [AllQueries])

      .applyMethodDecorators("replace", Put(path))
      .applyParamDecoratorSets("replace", [LookupParam], [AllQueries], [Dto])

      .applyMethodDecorators("update", Patch(path))
      .applyParamDecoratorSets("update", [LookupParam], [AllQueries], [Dto])

      .applyMethodDecorators("destroy", Delete(path))
      .applyParamDecoratorSets("destroy", [LookupParam]);
  }
}
