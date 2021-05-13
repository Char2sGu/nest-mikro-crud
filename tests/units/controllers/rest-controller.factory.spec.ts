import { Inject } from "@nestjs/common";
import {
  QueryDto,
  QueryDtoFactory,
  Resolved,
  RestController,
  RestControllerFactory,
  RestControllerFactoryOptions,
  RestService,
  RestServiceFactoryOptions,
  REST_SERVICE_OPTIONS_METADATA_KEY,
} from "src";
import { buildKeyChecker, m } from "tests/utils";
import { Repository } from "typeorm";

jest.mock("@nestjs/common", () => ({
  ...jest.requireActual("@nestjs/common"),
  Body: jest.fn(() => jest.fn()),
  Delete: jest.fn(() => jest.fn()),
  Get: jest.fn(() => jest.fn()),
  Inject: jest.fn(() => jest.fn()),
  Param: jest.fn(() => jest.fn()),
  Patch: jest.fn(() => jest.fn()),
  Post: jest.fn(() => jest.fn()),
  Put: jest.fn(() => jest.fn()),
  Query: jest.fn(() => jest.fn()),
}));
jest.mock("src/dtos/query-dto.factory", () => ({
  QueryDtoFactory: jest.fn(() => ({
    product: class {},
  })),
}));

describe(RestControllerFactory.name, () => {
  const d = buildKeyChecker<RestControllerFactory>();

  class TestEntity {
    id!: number;
    field!: number;
  }

  const testServiceOptions: RestServiceFactoryOptions<TestEntity> = {
    entityClass: TestEntity,
    dtoClasses: { create: TestEntity, update: TestEntity },
    lookupField: "field",
  };

  const entity = { k: "v" };
  const entities = [entity];

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
    getRelationOptions: jest.fn(async () => ({
      relations: [],
      loadRelationIds: { relations: [] },
    })),
    finalizeList: jest.fn(async (v) => v.entities),
  };
  const TestService = jest.fn(() => testService);

  let factory: RestControllerFactory;

  beforeEach(() => {
    jest
      .spyOn(Reflect, "getMetadata")
      .mockReturnValueOnce(testServiceOptions) // get service's options
      .mockReturnValueOnce(Number); // get entity's lookup field type
    jest.spyOn(Reflect, "defineMetadata");
    jest
      .spyOn(RestControllerFactory.prototype, "applyMethodDecorators")
      .mockReturnThis();
    jest
      .spyOn(RestControllerFactory.prototype, "applyParamDecoratorSets")
      .mockReturnThis();
    jest
      .spyOn(RestControllerFactory.prototype, "defineParamTypesMetadata")
      .mockReturnThis();
    factory = new RestControllerFactory({
      restServiceClass: TestService,
      actions: ["list", "create", "retrieve", "replace", "update", "destroy"],
    });
  });

  it("should process the passed options and expose it", () => {
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
    expect(Reflect.getMetadata).toHaveBeenCalledWith(
      REST_SERVICE_OPTIONS_METADATA_KEY,
      TestService
    );
    expect(factory.serviceOptions).toBe(testServiceOptions);
  });

  it("should expose the lookup type", () => {
    expect(factory.lookupType).toBe(Number);
  });

  describe(d(".product"), () => {
    const d = buildKeyChecker<RestController>();

    const context = { ctx: "yes" };

    let controller: RestController;
    let commonQueries: QueryDto = { expand: [] };

    beforeEach(() => {
      controller = new factory.product();
      // @ts-expect-error - manual injection
      controller.service = new TestService();
      jest.spyOn(controller, "prepareContext").mockResolvedValue(context);
    });

    describe.each`
      queries
      ${{ limit: 1, offset: 1, ...commonQueries }}
    `(d(".list($queries)"), ({ queries }: { queries: any }) => {
      let ret: Resolved<ReturnType<typeof controller.list>>;

      beforeEach(async () => {
        ret = await controller.list(queries);
      });

      it("should query the entities", () => {
        expect(testService.list).toHaveBeenCalledTimes(1);
        expect(testService.list).toHaveBeenCalledWith({
          limit: 1,
          offset: 1,
          expand: [],
          ...context,
        });
      });

      it("should transform the entities", () => {
        expect(testService.transform).toHaveBeenCalledTimes(entities.length);
        expect(testService.transform).toHaveBeenCalledWith({
          entity,
          ...context,
        });
      });

      it("should paginate the entities", () => {
        expect(testService.finalizeList).toHaveBeenCalledTimes(1);
        expect(testService.finalizeList).toHaveBeenCalledWith({
          entities,
          ...context,
        });
      });

      it("should return the entities", () => {
        expect(ret).toEqual(entities);
      });
    });

    describe.each`
      data
      ${{ im: "data" }}
    `(d(".create(, $data)"), ({ data }: { data: {} }) => {
      let ret: Resolved<ReturnType<typeof controller.create>>;

      beforeEach(async () => {
        ret = await controller.create(commonQueries, data);
      });

      it("should create an entity", () => {
        expect(testService.create).toHaveBeenCalledTimes(1);
        expect(testService.create).toHaveBeenCalledWith({
          data,
          expand: [],
          ...context,
        });
      });

      it("should transform the entity", () => {
        expect(testService.transform).toHaveBeenCalledTimes(1);
        expect(testService.transform).toHaveBeenCalledWith({
          entity,
          ...context,
        });
      });

      it("should return the entity", () => {
        expect(ret).toEqual(entity);
      });
    });

    describe.each`
      lookup
      ${1}
    `(d(".retrieve($lookup)"), ({ lookup }: { lookup: number }) => {
      let ret: Resolved<ReturnType<typeof controller.retrieve>>;

      beforeEach(async () => {
        ret = await controller.retrieve(lookup, commonQueries);
      });

      it("should retrieve the entity", () => {
        expect(testService.retrieve).toHaveBeenCalledTimes(1);
        expect(testService.retrieve).toHaveBeenCalledWith({
          lookup,
          expand: [],
          ...context,
        });
      });

      it("should transform the entitiy", () => {
        expect(testService.transform).toHaveBeenCalledTimes(1);
        expect(testService.transform).toHaveBeenCalledWith({
          entity,
          ...context,
        });
      });

      it("should return the entity", () => {
        expect(ret).toEqual(entity);
      });
    });

    describe.each`
      lookup | data
      ${1}   | ${{ replace: "data" }}
    `(
      d(".replace($lookup, , $data)"),
      ({ lookup, data }: { lookup: number; data: {} }) => {
        let ret: Resolved<ReturnType<typeof controller.replace>>;

        beforeEach(async () => {
          ret = await controller.replace(lookup, commonQueries, data);
        });

        it("should replace the entity", () => {
          expect(testService.replace).toHaveBeenCalledTimes(1);
          expect(testService.replace).toHaveBeenCalledWith({
            lookup,
            data,
            expand: [],
            ...context,
          });
        });

        it("should transform the entity", () => {
          expect(testService.transform).toHaveBeenCalledTimes(1);
          expect(testService.transform).toHaveBeenCalledWith({
            entity,
            ...context,
          });
        });

        it("should return the entity", () => {
          expect(ret).toEqual(entity);
        });
      }
    );

    describe.each`
      lookup | data
      ${1}   | ${{ update: "data" }}
    `(
      d(".update($lookup, , $data,)"),
      ({ lookup, data }: { lookup: number; data: {} }) => {
        let ret: Resolved<ReturnType<typeof controller.update>>;

        beforeEach(async () => {
          ret = await controller.update(lookup, commonQueries, data);
        });

        it("should update the entity", () => {
          expect(testService.update).toHaveBeenCalledTimes(1);
          expect(testService.update).toHaveBeenCalledWith({
            lookup,
            data,
            expand: [],
            ...context,
          });
        });

        it("should transform the entity", () => {
          expect(testService.transform).toHaveBeenCalledTimes(1);
          expect(testService.transform).toHaveBeenCalledWith({
            entity,
            ...context,
          });
        });

        it("should return the entity", () => {
          expect(ret).toEqual(entity);
        });
      }
    );

    describe.each`
      $lookup
      ${1}
    `(d(".destroy($lookup)"), ({ lookup }: { lookup: number }) => {
      let ret: Resolved<ReturnType<typeof controller.destroy>>;

      beforeEach(async () => {
        ret = await controller.destroy(lookup);
      });

      it("should delete the entity", () => {
        expect(testService.destroy).toHaveBeenCalledTimes(1);
        expect(testService.destroy).toHaveBeenCalledWith({
          lookup,
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
        factory.options.contextOptions.test = {
          type: String,
          decorators: [jest.fn()],
        };
        m(controller.prepareContext).mockRestore();
        ret = await controller.prepareContext([1]);
      });

      it("should return the context", () => {
        expect(ret).toEqual({ test: 1 });
      });
    });
  });

  it("should apply dependency injection of the service", () => {
    expect(Inject).toHaveBeenCalledTimes(1);
    expect(Inject).toHaveBeenCalledWith(TestService);
    expect(m(Inject).mock.results[0].value).toHaveBeenCalledTimes(1);
    expect(m(Inject).mock.results[0].value).toHaveBeenCalledWith(
      factory.product.prototype,
      "service"
    );
  });
});
