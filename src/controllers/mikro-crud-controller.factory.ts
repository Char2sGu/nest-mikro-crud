import { BaseEntity, FilterQuery } from "@mikro-orm/core";
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
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { AbstractFactory } from "../abstract.factory";
import { FACTORY_METADATA_KEY, TS_TYPE_METADATA_KEY } from "../constants";
import { ReqUser } from "../decorators";
import { QueryDtoFactory } from "../dtos";
import { MikroCrudService, MikroCrudServiceFactory } from "../services";
import { ActionName, LookupableField } from "../types";
import { MikroCrudControllerFactoryOptions } from "./mikro-crud-controller-factory-options.interface";
import { MikroCrudController } from "./mikro-crud-controller.interface";

type ServiceGenerics<Service> = Service extends MikroCrudService<
  infer Entity,
  infer CreateDto,
  infer UpdateDto
>
  ? {
      Entity: Entity;
      CreateDto: CreateDto;
      UpdateDto: UpdateDto;
    }
  : never;

// TODO: make the generic type `LookupField` literal
export class MikroCrudControllerFactory<
  Service extends MikroCrudService<
    Entity,
    CreateDto,
    UpdateDto
  > = MikroCrudService,
  Entity extends BaseEntity<any, any> = ServiceGenerics<Service>["Entity"],
  CreateDto = ServiceGenerics<Service>["CreateDto"],
  UpdateDto = ServiceGenerics<Service>["UpdateDto"],
  LookupField extends LookupableField<Entity> = LookupableField<Entity>
> extends AbstractFactory<
  MikroCrudController<Entity, CreateDto, UpdateDto, LookupField, Service>
> {
  readonly serviceFactory;
  readonly options;
  readonly product;

  constructor(
    options: MikroCrudControllerFactoryOptions<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField,
      Service
    >
  ) {
    super();

    this.serviceFactory = Reflect.getMetadata(
      FACTORY_METADATA_KEY,
      options.serviceClass
    ) as MikroCrudServiceFactory<Entity, CreateDto, UpdateDto>;

    this.options = this.standardizeOptions(options);

    this.product = this.createRawClass();
    this.defineInjections();
    this.buildActions();
    this.applyClassDecorators(
      UsePipes(new ValidationPipe(this.options.validationPipeOptions))
    );

    Reflect.defineMetadata(FACTORY_METADATA_KEY, this, this.product);
  }

  protected standardizeOptions(
    options: MikroCrudControllerFactoryOptions<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField,
      Service
    >
  ) {
    const {
      queryDtoClass = new QueryDtoFactory({}).product,
      lookup,
      requestUser = { decorators: [ReqUser()] },
      validationPipeOptions = {},
    } = options;

    return {
      ...options,
      queryDtoClass,
      lookup: {
        ...lookup,
        type:
          lookup.type ??
          (Reflect.getMetadata(
            TS_TYPE_METADATA_KEY,
            this.serviceFactory.options.entityClass.prototype,
            lookup.field
          ) as typeof lookup.type)!,
        name: lookup.name ?? "lookup",
      },
      requestUser: {
        ...requestUser,
        type: requestUser.type ?? Object,
      },
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
    const {
      lookup: { field: lookupField },
    } = this.options;

    const getLookupCondition = (value: unknown) =>
      ({ [lookupField]: value } as unknown as FilterQuery<Entity>);

    type Interface = MikroCrudController<
      Entity,
      CreateDto,
      UpdateDto,
      LookupField,
      Service
    >;
    return class MikroCrudController implements Interface {
      readonly service!: Interface["service"];

      async list(
        ...[{ limit, offset, order, filter }, user, ...args]: Parameters<
          Interface["list"]
        >
      ): Promise<unknown> {
        const action: ActionName = "list";
        await this.service.checkPermission({ action, user });
        const { total, results } = await this.service.list({
          limit,
          offset,
          order,
          filter,
          user,
        });
        await Promise.all(
          results.map(
            async (entity) => await this.service.initCollections({ entity })
          )
        );
        return { total, results };
      }

      async create(
        ...[data, user]: Parameters<Interface["create"]>
      ): Promise<unknown> {
        const action: ActionName = "create";
        await this.service.checkPermission({ action, user });
        const entity = await this.service.create({ data, user });
        return await this.service.initCollections({ entity });
      }

      async retrieve(
        ...[lookup, user]: Parameters<Interface["retrieve"]>
      ): Promise<unknown> {
        const action: ActionName = "retrieve";
        await this.service.checkPermission({ action, user });
        const conditions = getLookupCondition(lookup);
        const entity = await this.service.retrieve({ conditions, user });
        await this.service.checkPermission({ action, entity, user });
        return await this.service.initCollections({ entity });
      }

      async replace(
        ...[lookup, data, user]: Parameters<Interface["replace"]>
      ): Promise<unknown> {
        const action: ActionName = "update";
        await this.service.checkPermission({ action, user });
        const conditions = getLookupCondition(lookup);
        const entity = await this.service.retrieve({ conditions, user });
        await this.service.checkPermission({ action, entity, user });
        await this.service.replace({ entity, data, user });
        return await this.service.initCollections({ entity });
      }

      async update(
        ...[lookup, data, user]: Parameters<Interface["update"]>
      ): Promise<unknown> {
        const action: ActionName = "update";
        await this.service.checkPermission({ action, user });
        const conditions = getLookupCondition(lookup);
        const entity = await this.service.retrieve({ conditions, user });
        await this.service.checkPermission({ action, entity, user });
        await this.service.update({ entity, data, user });
        return await this.service.initCollections({ entity });
      }

      async destroy(
        ...[lookup, user]: Parameters<Interface["destroy"]>
      ): Promise<unknown> {
        const action: ActionName = "destroy";
        await this.service.checkPermission({ action, user });
        const conditions = getLookupCondition(lookup);
        const entity = await this.service.retrieve({ conditions, user });
        await this.service.checkPermission({ action, entity, user });
        await this.service.destroy({ entity, user });
        return;
      }
    };
  }

  protected defineInjections() {
    const { serviceClass } = this.options;

    this.defineType("service", serviceClass).applyPropertyDecorators(
      "service" as any, // service is generic so the type cannot be inferred correctly
      Inject(serviceClass)
    );
  }

  protected buildActions() {
    const {
      lookup: { type: lookupType, name: lookupParamName },
    } = this.options;

    const {
      dtoClasses: { create: createDto, update: updateDto },
    } = this.serviceFactory.options;
    const {
      queryDtoClass,
      requestUser: { type: reqUserType, decorators: reqUserDecorators },
    } = this.options;

    const path = `:${lookupParamName}`;

    const Lookup = Param(
      lookupParamName,
      ...(lookupType == Number ? [ParseIntPipe] : [])
    );
    const Queries = Query();
    const Data = Body();

    const table: Record<
      ActionName,
      [MethodDecorator[], Type[], ParameterDecorator[][]]
    > = {
      list: [[Get()], [queryDtoClass], [[Queries]]],
      create: [[Post()], [createDto], [[Data]]],
      retrieve: [[Get(path)], [lookupType], [[Lookup]]],
      replace: [[Put(path)], [lookupType, createDto], [[Lookup], [Data]]],
      update: [[Patch(path)], [lookupType, updateDto], [[Lookup], [Data]]],
      destroy: [[Delete(path), HttpCode(204)], [lookupType], [[Lookup]]],
    };

    for (const [
      k,
      [methodDecorators, paramTypes, paramDecoratorSets],
    ] of Object.entries(table)) {
      const name = k as ActionName;
      if (this.options.actions.includes(name))
        this.applyMethodDecorators(name, ...methodDecorators);
      this.defineParamTypes(
        name,
        ...paramTypes,
        reqUserType
      ).applyParamDecoratorSets(name, ...paramDecoratorSets, reqUserDecorators);
    }
  }
}
