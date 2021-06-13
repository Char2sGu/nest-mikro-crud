import { AnyEntity } from "@mikro-orm/core";
import {
  Body,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
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
import { ActionName, LookupableField, PkType } from "../types";
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
  Entity extends AnyEntity<Entity> = ServiceGenerics<Service>["Entity"],
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
          ((Reflect.getMetadata(
            TS_TYPE_METADATA_KEY,
            this.serviceFactory.options.entityClass.prototype,
            lookup.field
          ) == Number
            ? "number"
            : "uuid") as PkType),
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
        ...[{ limit, offset, order, filter, expand }, user]: Parameters<
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
          expand,
          user,
        });
        await Promise.all(
          results.map(
            async (entity) =>
              await this.service.adjustPopulationStatus({ entity, expand })
          )
        );
        await this.service.save();
        return { total, results };
      }

      async create(
        ...[{ expand }, data, user]: Parameters<Interface["create"]>
      ): Promise<unknown> {
        const action: ActionName = "create";
        await this.service.checkPermission({ action, user });
        let entity = await this.service.create({ data, user });
        await this.service.save();
        entity = await this.service.retrieve({
          conditions: entity,
          expand,
          refresh: true,
          user,
        });
        await this.service.adjustPopulationStatus({ entity, expand });
        await this.service.save();
        return entity;
      }

      async retrieve(
        ...[lookup, { expand }, user]: Parameters<Interface["retrieve"]>
      ): Promise<unknown> {
        const action: ActionName = "retrieve";
        await this.service.checkPermission({ action, user });
        const conditions = { [lookupField]: lookup };
        const entity = await this.service
          .retrieve({
            conditions,
            expand,
            user,
          })
          .catch(() => {
            throw new NotFoundException();
          });
        await this.service.checkPermission({ action, entity, user });
        await this.service.adjustPopulationStatus({ entity, expand });
        await this.service.save();
        return entity;
      }

      async replace(
        ...[lookup, { expand }, data, user]: Parameters<Interface["replace"]>
      ): Promise<unknown> {
        const action: ActionName = "update";
        await this.service.checkPermission({ action, user });
        const conditions = { [lookupField]: lookup };
        let entity = await this.service
          .retrieve({
            conditions,
            expand,
            user,
          })
          .catch(() => {
            throw new NotFoundException();
          });
        await this.service.checkPermission({ action, entity, user });
        await this.service.replace({ entity, data, user });
        await this.service.save();
        entity = await this.service.retrieve({
          conditions: entity,
          expand,
          refresh: true,
          user,
        });
        await this.service.adjustPopulationStatus({ entity, expand });
        await this.service.save();
        return entity;
      }

      async update(
        ...[lookup, { expand }, data, user]: Parameters<Interface["update"]>
      ): Promise<unknown> {
        const action: ActionName = "update";
        await this.service.checkPermission({ action, user });
        const conditions = { [lookupField]: lookup };
        let entity = await this.service
          .retrieve({
            conditions,
            expand,
            user,
          })
          .catch(() => {
            throw new NotFoundException();
          });
        await this.service.checkPermission({ action, entity, user });
        await this.service.update({ entity, data, user });
        await this.service.save();
        entity = await this.service.retrieve({
          conditions: entity,
          expand,
          refresh: true,
          user,
        });
        await this.service.adjustPopulationStatus({ entity, expand });
        await this.service.save();
        return entity;
      }

      async destroy(
        ...[lookup, user]: Parameters<Interface["destroy"]>
      ): Promise<unknown> {
        const action: ActionName = "destroy";
        await this.service.checkPermission({ action, user });
        const conditions = { [lookupField]: lookup };
        const entity = await this.service
          .retrieve({ conditions, user })
          .catch(() => {
            throw new NotFoundException();
          });
        await this.service.checkPermission({ action, entity, user });
        await this.service.destroy({ entity, user });
        await this.service.save();
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
    const lookupInternalType = lookupType == "number" ? Number : String;

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
      ...(lookupType == "number"
        ? [ParseIntPipe]
        : lookupType == "uuid"
        ? [ParseUUIDPipe]
        : [])
    );
    const Queries = Query();
    const Data = Body();

    const table: Record<
      ActionName,
      [MethodDecorator[], Type[], ParameterDecorator[][]]
    > = {
      list: [[Get()], [queryDtoClass], [[Queries]]],
      create: [[Post()], [queryDtoClass, createDto], [[Queries], [Data]]],
      retrieve: [
        [Get(path)],
        [lookupInternalType, queryDtoClass],
        [[Lookup], [Queries]],
      ],
      replace: [
        [Put(path)],
        [lookupInternalType, queryDtoClass, createDto],
        [[Lookup], [Queries], [Data]],
      ],
      update: [
        [Patch(path)],
        [lookupInternalType, queryDtoClass, updateDto],
        [[Lookup], [Queries], [Data]],
      ],
      destroy: [
        [Delete(path), HttpCode(204)],
        [lookupInternalType],
        [[Lookup]],
      ],
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
