import {
  Body,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ClassConstructor } from "class-transformer";
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
  RouteNames,
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
    transform: jest.fn(async (v) => v),
    getQueryConditions: jest.fn(async () => ({})),
    getRelationOptions: jest.fn(async () => ({
      relations: [],
      loadRelationIds: { relations: [] },
    })),
  };
  const TestService = jest.fn(() => testService);

  const options: RestControllerFactoryOptions = {
    restServiceClass: TestService,
    routes: ["list", "create", "retrieve", "replace", "update", "destroy"],
  };

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
    factory = new RestControllerFactory(options);
  });

  it("should process the passed options and expose it", () => {
    expect(QueryDtoFactory).toHaveBeenCalled();
    expect(factory.options.queryDto).toBeDefined();
    expect(factory.options.lookupParam).toBeDefined();
    expect(factory.options.customArgs).toBeDefined();
    expect(factory.options.catchEntityNotFound).toBeDefined();
    expect(factory.options.validationPipeOptions).toBeDefined();
    expect(factory.options.validationPipeOptions.transform).toBe(true);
    expect(
      factory.options.validationPipeOptions.transformOptions
        ?.exposeDefaultValues
    ).toBe(true);
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

  describe("should create the controller class", () => {
    const d = buildKeyChecker<RestController>();
    let controller: RestController;
    let commonQueries: QueryDto = { expand: [] };

    beforeEach(() => {
      controller = new factory.product();
      // @ts-expect-error - manual injection
      controller.service = new TestService();
    });

    describe.each`
      queries                                          | rest
      ${{ limit: "1", offset: "1", ...commonQueries }} | ${["extra"]}
    `(
      d(".list($queries, ...$rest)"),
      ({ queries, rest }: { queries: any; rest: [] }) => {
        let ret: Resolved<ReturnType<typeof controller.list>>;

        beforeEach(async () => {
          ret = await controller.list(queries, ...rest);
        });

        it("should query the entities", () => {
          expect(testService.list).toHaveBeenCalledTimes(1);
          expect(testService.list).toHaveBeenCalledWith(queries, ...rest);
        });

        it("should transform the entities", () => {
          expect(testService.transform).toHaveBeenCalledTimes(entities.length);
          expect(testService.transform).toHaveBeenCalledWith(entity, ...rest);
        });

        it("should return the entities", () => {
          expect(ret).toEqual(entities);
        });
      }
    );

    describe.each`
      dto              | rest
      ${{ im: "dto" }} | ${["extra"]}
    `(
      d(".create({}, $dto, ...$rest)"),
      ({ dto, rest }: { dto: {}; rest: [] }) => {
        let ret: Resolved<ReturnType<typeof controller.create>>;

        beforeEach(async () => {
          ret = await controller.create(commonQueries, dto, ...rest);
        });

        it("should create an entity", () => {
          expect(testService.create).toHaveBeenCalledTimes(1);
          expect(testService.create).toHaveBeenCalledWith(
            commonQueries,
            dto,
            ...rest
          );
        });

        it("should transform the entity", () => {
          expect(testService.transform).toHaveBeenCalledTimes(1);
          expect(testService.transform).toHaveBeenCalledWith(entity, ...rest);
        });

        it("should return the entity", () => {
          expect(ret).toEqual(entity);
        });
      }
    );

    describe.each`
      lookup | rest
      ${1}   | ${["extra"]}
    `(
      d(".retrieve($lookup, {}, ...$rest)"),
      ({ lookup, rest }: { lookup: number; rest: [] }) => {
        let ret: Resolved<ReturnType<typeof controller.retrieve>>;

        beforeEach(async () => {
          ret = await controller.retrieve(lookup, commonQueries, ...rest);
        });

        it("should retrieve the entity", () => {
          expect(testService.retrieve).toHaveBeenCalledTimes(1);
          expect(testService.retrieve).toHaveBeenCalledWith(
            lookup,
            commonQueries,
            ...rest
          );
        });

        it("should transform the entitiy", () => {
          expect(testService.transform).toHaveBeenCalledTimes(1);
          expect(testService.transform).toHaveBeenCalledWith(entity, ...rest);
        });

        it("should return the entity", () => {
          expect(ret).toEqual(entity);
        });
      }
    );

    describe.each`
      lookup | dto                   | rest
      ${1}   | ${{ replace: "dto" }} | ${["rest"]}
    `(
      d(".replace($lookup, {}, $dto, ...$rest)"),
      ({ lookup, dto, rest }: { lookup: number; dto: {}; rest: [] }) => {
        let ret: Resolved<ReturnType<typeof controller.replace>>;

        beforeEach(async () => {
          ret = await controller.replace(lookup, commonQueries, dto, ...rest);
        });

        it("should replace the entity", () => {
          expect(testService.replace).toHaveBeenCalledTimes(1);
          expect(testService.replace).toHaveBeenCalledWith(
            lookup,
            commonQueries,
            dto,
            ...rest
          );
        });

        it("should transform the entity", () => {
          expect(testService.transform).toHaveBeenCalledTimes(1);
          expect(testService.transform).toHaveBeenCalledWith(entity, ...rest);
        });

        it("should return the entity", () => {
          expect(ret).toEqual(entity);
        });
      }
    );

    describe.each`
      lookup | dto                  | rest
      ${1}   | ${{ update: "dto" }} | ${["rest"]}
    `(
      d(".update($lookup, {}, $dto, ...$rest)"),
      ({ lookup, dto, rest }: { lookup: number; dto: {}; rest: [] }) => {
        let ret: Resolved<ReturnType<typeof controller.update>>;

        beforeEach(async () => {
          ret = await controller.update(lookup, commonQueries, dto, ...rest);
        });

        it("should update the entity", () => {
          expect(testService.update).toHaveBeenCalledTimes(1);
          expect(testService.update).toHaveBeenCalledWith(
            lookup,
            commonQueries,
            dto,
            ...rest
          );
        });

        it("should transform the entity", () => {
          expect(testService.transform).toHaveBeenCalledTimes(1);
          expect(testService.transform).toHaveBeenCalledWith(entity, ...rest);
        });

        it("should return the entity", () => {
          expect(ret).toEqual(entity);
        });
      }
    );

    describe.each`
      $lookup | rest
      ${1}    | ${["rest-destroy"]}
    `(
      d(".destroy($lookup, {...}, ...$rest)"),
      ({ lookup, rest }: { lookup: number; rest: [] }) => {
        let ret: Resolved<ReturnType<typeof controller.destroy>>;

        beforeEach(async () => {
          ret = await controller.destroy(lookup, commonQueries, ...rest);
        });

        it("should delete the entity", () => {
          expect(testService.destroy).toHaveBeenCalledTimes(1);
          expect(testService.destroy).toHaveBeenCalledWith(
            lookup,
            commonQueries,
            ...rest
          );
        });

        it("should return nothing", () => {
          expect(ret).toBeUndefined();
        });
      }
    );
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

  it.each`
    name          | types
    ${"list"}     | ${["QueryDto"]}
    ${"create"}   | ${["QueryDto", TestEntity]}
    ${"retrieve"} | ${[Number, "QueryDto"]}
    ${"replace"}  | ${[Number, "QueryDto", TestEntity]}
    ${"update"}   | ${[Number, "QueryDto", TestEntity]}
    ${"destroy"}  | ${[Number, "QueryDto"]}
  `(
    "should emit parameter types metadata to `.$name()`",
    ({
      name,
      types,
    }: {
      name: string;
      types: (ClassConstructor<any> | "QueryDto")[];
    }) => {
      types = types.map((type) =>
        type == "QueryDto" ? factory.options.queryDto : type
      );
      expect(factory.defineParamTypesMetadata).toHaveBeenCalledWith(
        name,
        ...types
      );
    }
  );

  it.each`
    name          | decorators | withLookup | nth
    ${"list"}     | ${Get}     | ${false}   | ${0}
    ${"create"}   | ${Post}    | ${false}   | ${0}
    ${"retrieve"} | ${Get}     | ${true}    | ${1}
    ${"replace"}  | ${Put}     | ${true}    | ${0}
    ${"update"}   | ${Patch}   | ${true}    | ${0}
    ${"destroy"}  | ${Delete}  | ${true}    | ${0}
  `(
    "should apply route decorators for the route $name",
    ({
      name,
      decorators,
      withLookup,
      nth,
    }: {
      name: string;
      decorators: () => MethodDecorator;
      withLookup: boolean;
      nth: number;
    }) => {
      expect(decorators).toHaveBeenCalled();
      expect(decorators).toHaveBeenCalledWith(
        ...(withLookup ? [":lookup"] : [])
      );
      const inner = m(decorators).mock.results[nth].value;
      expect(factory.applyMethodDecorators).toHaveBeenCalledWith(name, inner);
    }
  );

  it.each`
    builder  | args
    ${Param} | ${["lookup", ParseIntPipe]}
    ${Query} | ${[]}
    ${Body}  | ${[]}
  `(
    "should call the param decorator builder $builder with args $args",
    ({ builder, args }: { builder: () => ParameterDecorator; args: any[] }) => {
      expect(builder).toHaveBeenCalledTimes(1);
      expect(builder).toHaveBeenCalledWith(...args);
    }
  );

  it.each`
    name          | decoratorBuilderSets
    ${"list"}     | ${[[Query]]}
    ${"create"}   | ${[[Query], [Body]]}
    ${"retrieve"} | ${[[Param], [Query]]}
    ${"replace"}  | ${[[Param], [Query], [Body]]}
    ${"update"}   | ${[[Param], [Query], [Body]]}
    ${"destroy"}  | ${[[Param], [Query]]}
  `(
    "should apply the param decorators for the route $name",
    ({
      name,
      decoratorBuilderSets,
    }: {
      name: RouteNames;
      decoratorBuilderSets: (() => ParameterDecorator)[][];
    }) => {
      const decoratorSets = decoratorBuilderSets.map((builders) =>
        builders.map((builder) => m(builder).mock.results[0].value)
      );
      expect(factory.applyParamDecoratorSets).toHaveBeenCalledWith(
        name,
        ...decoratorSets
      );
    }
  );
});
