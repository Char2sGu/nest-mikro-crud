import { Inject } from "@nestjs/common";
import {
  QueryDto,
  QueryDtoFactory,
  Resolved,
  RestController,
  RestControllerFactory,
  RestService,
  RestServiceFactoryOptions,
  REST_SERVICE_OPTIONS_METADATA_KEY,
} from "src";
import { buildKeyChecker, m } from "tests/utils";
import { Entity, PrimaryGeneratedColumn, Repository } from "typeorm";

jest.mock("@nestjs/common", () => ({
  ...jest.requireActual("@nestjs/common"),
  Body: jest.fn().mockReturnValue(jest.fn()),
  Delete: jest.fn().mockReturnValue(jest.fn()),
  Get: jest.fn().mockReturnValue(jest.fn()),
  Inject: jest.fn().mockReturnValue(jest.fn()),
  Param: jest.fn().mockReturnValue(jest.fn()),
  Patch: jest.fn().mockReturnValue(jest.fn()),
  Post: jest.fn().mockReturnValue(jest.fn()),
  Put: jest.fn().mockReturnValue(jest.fn()),
  Query: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock("src/dtos/query-dto.factory", () => ({
  QueryDtoFactory: jest.fn(() => ({
    product: class {},
  })),
}));

describe(RestControllerFactory.name, () => {
  const d = buildKeyChecker<RestControllerFactory>();

  @Entity()
  class TestEntity {
    @PrimaryGeneratedColumn()
    id!: number;
  }

  const entity: TestEntity = Object.create(TestEntity.prototype, {
    id: { value: 1 },
  });
  const entities = [entity];

  const testServiceOptions: RestServiceFactoryOptions<TestEntity> = {
    entityClass: TestEntity,
    dtoClasses: { create: TestEntity, update: TestEntity },
    lookupField: "id",
  };

  const testService: RestService = {
    repository: new Repository(),
    list: jest.fn(async () => entities),
    create: jest.fn(async () => entity),
    retrieve: jest.fn(async () => entity),
    replace: jest.fn(async () => entity),
    update: jest.fn(async () => entity),
    destroy: jest.fn(async () => entity),
    count: jest.fn(async () => entities.length),
    transform: jest.fn(async (v) => v.entity),
    getQueryConditions: jest.fn(async () => ({})),
    parseFieldExpansions: jest.fn(async () => ({
      relations: [],
      loadRelationIds: { relations: [] },
    })),
    finalizeList: jest.fn(async (v) => v.entities),
  };
  const TestService = jest.fn(() => testService);
  Reflect.defineMetadata(
    REST_SERVICE_OPTIONS_METADATA_KEY,
    testServiceOptions,
    TestService
  );

  let factory: RestControllerFactory;

  beforeEach(() => {
    factory = new RestControllerFactory({
      restServiceClass: TestService,
      actions: ["list", "create", "retrieve", "replace", "update", "destroy"],
      contextOptions: {
        ctx: { type: String, decorators: [jest.fn()] },
      },
    });
  });

  it("should process the options and expose it", () => {
    expect(QueryDtoFactory).toHaveBeenCalled();
    expect(factory.options.queryDto).toBeDefined();
    expect(factory.options.lookupParam).toBeDefined();
    expect(factory.options.catchEntityNotFound).toBeDefined();
    expect(factory.options.validationPipeOptions).toBeDefined();
    expect(factory.options.validationPipeOptions.transform).toBe(true);
    expect(
      factory.options.validationPipeOptions.transformOptions
        ?.exposeDefaultValues
    ).toBe(true);
    expect(factory.options.contextOptions).toBeDefined();
  });

  it("should expose the service's options", () => {
    expect(factory.serviceOptions).toBe(testServiceOptions);
  });

  it("should expose the lookup type", () => {
    expect(factory.lookupType).toBe(Number);
  });

  describe(d(".product"), () => {
    const d = buildKeyChecker<RestController>();

    const context = { ctx: "yes" };

    let controller: RestController;

    beforeEach(() => {
      controller = new factory.product();
      // @ts-expect-error - manual injection
      controller.service = new TestService();
      jest.spyOn(controller, "prepareContext").mockResolvedValue(context);
    });

    describe(d(".list()"), () => {
      let ret: Resolved<ReturnType<typeof controller.list>>;

      beforeEach(async () => {
        ret = await controller.list(
          {
            limit: 1,
            offset: 2,
            expand: [],
          },
          null
        );
      });

      it("should get the context", () => {
        expect(controller.prepareContext).toHaveBeenCalledWith([null]);
      });

      it("should query the entities", () => {
        expect(testService.list).toHaveBeenCalledWith({
          limit: 1,
          offset: 2,
          expand: [],
          ...context,
        });
      });

      it("should transform the entities", () => {
        expect(testService.transform).toHaveBeenCalledWith({
          entity,
          ...context,
        });
      });

      it("should paginate the entities", () => {
        expect(testService.finalizeList).toHaveBeenCalledWith({
          entities,
          ...context,
        });
      });

      it("should return the entities", () => {
        expect(ret).toEqual(entities);
      });
    });

    describe(d(".create()"), () => {
      let ret: Resolved<ReturnType<typeof controller.create>>;

      beforeEach(async () => {
        ret = await controller.create({ expand: [] }, entity, null);
      });

      it("should get the context", () => {
        expect(controller.prepareContext).toHaveBeenCalledWith([null]);
      });

      it("should create an entity", () => {
        expect(testService.create).toHaveBeenCalledWith({
          data: entity,
          ...context,
        });
      });

      it("should retrieve the entity", () => {
        expect(testService.retrieve).toHaveBeenCalledWith({
          lookup: entity.id,
          expand: [],
          ...context,
        });
      });

      it("should transform the entity", () => {
        expect(testService.transform).toHaveBeenCalledWith({
          entity,
          ...context,
        });
      });

      it("should return an entity", () => {
        expect(ret).toBeInstanceOf(TestEntity);
      });
    });

    describe(d(".retrieve()"), () => {
      let ret: Resolved<ReturnType<typeof controller.retrieve>>;

      beforeEach(async () => {
        ret = await controller.retrieve(1, { expand: [] }, null);
      });

      it("should get the context", () => {
        expect(controller.prepareContext).toHaveBeenCalledWith([null]);
      });

      it("should retrieve the entity", () => {
        expect(testService.retrieve).toHaveBeenCalledWith({
          lookup: 1,
          expand: [],
          ...context,
        });
      });

      it("should transform the entitiy", () => {
        expect(testService.transform).toHaveBeenCalledWith({
          entity,
          ...context,
        });
      });

      it("should return the entity", () => {
        expect(ret).toEqual(entity);
      });
    });

    describe(d(".replace()"), () => {
      let ret: Resolved<ReturnType<typeof controller.replace>>;

      beforeEach(async () => {
        ret = await controller.replace(1, { expand: [] }, entity, null);
      });

      it("should get the context", () => {
        expect(controller.prepareContext).toHaveBeenCalledWith([null]);
      });

      it("should retrieve the entity", () => {
        expect(testService.retrieve).toHaveBeenCalledWith({
          lookup: 1,
          ...context,
        });
        expect(testService.retrieve).toHaveBeenCalledWith({
          lookup: 1,
          expand: [],
          ...context,
        });
      });

      it("should replace the entity", () => {
        expect(testService.replace).toHaveBeenCalledWith({
          entity,
          data: entity,
          ...context,
        });
      });

      it("should transform the entity", () => {
        expect(testService.transform).toHaveBeenCalledWith({
          entity,
          ...context,
        });
      });

      it("should return the entity", () => {
        expect(ret).toEqual(entity);
      });
    });

    describe(d(".update()"), () => {
      let ret: Resolved<ReturnType<typeof controller.update>>;

      beforeEach(async () => {
        ret = await controller.update(1, { expand: [] }, entity, null);
      });

      it("should get the context", () => {
        expect(controller.prepareContext).toHaveBeenCalledWith([null]);
      });

      it("should retrieve the entity", () => {
        expect(testService.retrieve).toHaveBeenCalledWith({
          lookup: 1,
          ...context,
        });
        expect(testService.retrieve).toHaveBeenCalledWith({
          lookup: 1,
          expand: [],
          ...context,
        });
      });

      it("should update the entity", () => {
        expect(testService.update).toHaveBeenCalledWith({
          entity,
          data: entity,
          ...context,
        });
      });

      it("should transform the entity", () => {
        expect(testService.transform).toHaveBeenCalledWith({
          entity,
          ...context,
        });
      });

      it("should return the entity", () => {
        expect(ret).toEqual(entity);
      });
    });

    describe(d(".destroy()"), () => {
      let ret: Resolved<ReturnType<typeof controller.destroy>>;

      beforeEach(async () => {
        ret = await controller.destroy(1, null);
      });

      it("should get the context", () => {
        expect(controller.prepareContext).toHaveBeenCalledWith([null]);
      });

      it("should retrieve the entity", () => {
        expect(testService.retrieve).toHaveBeenCalledWith({
          lookup: 1,
          ...context,
        });
      });

      it("should delete the entity", () => {
        expect(testService.destroy).toHaveBeenCalledWith({
          entity,
          ...context,
        });
      });

      it("should return nothing", () => {
        expect(ret).toBeUndefined();
      });
    });

    describe(d(".prepareContext()"), () => {
      let ret: Resolved<ReturnType<typeof controller.prepareContext>>;

      beforeEach(async () => {
        m(controller.prepareContext).mockRestore();
        ret = await controller.prepareContext(["ctx"]);
      });

      it("should return the context", () => {
        expect(ret).toEqual({ ctx: "ctx" });
      });
    });
  });

  it("should apply dependency injection of the service", () => {
    expect(Inject).toHaveBeenCalledWith(TestService);
    expect(m(Inject).mock.results[0].value).toHaveBeenCalledWith(
      factory.product.prototype,
      "service"
    );
  });
});
