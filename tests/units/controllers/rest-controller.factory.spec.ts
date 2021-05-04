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
  ListQueryDtoFactory,
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
jest.mock("src/dtos/list-query-dto.factory", () => ({
  ListQueryDtoFactory: jest.fn(() => ({
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
    count: jest.fn(async () => entities.length),
    transform: jest.fn(async (v) => v),
    getQueryConditions: jest.fn(async () => ({})),
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

  it("should fill default values of the passed options and expose it", () => {
    expect(ListQueryDtoFactory).toHaveBeenCalled();
    expect(factory.options.listQueryDto).toBeDefined();
    expect(factory.options.lookupParam).toBeDefined();
    expect(factory.options.customArgs).toBeDefined();
    expect(factory.options.catchEntityNotFound).toBeDefined();
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

    beforeEach(() => {
      controller = new factory.product();
      // @ts-expect-error - manual injection
      controller.service = new TestService();
    });

    describe.each`
      rawOptions                     | rest
      ${{ limit: "1", offset: "1" }} | ${["extra"]}
    `(
      d(".list($rawOptions, ...$rest)"),
      ({ rawOptions, rest }: { rawOptions: {}; rest: [] }) => {
        let ret: Resolved<ReturnType<typeof controller.list>>;

        beforeEach(async () => {
          ret = await controller.list(rawOptions, ...rest);
        });

        it("should query the entities", () => {
          expect(testService.list).toHaveBeenCalledTimes(1);
          expect(testService.list).toHaveBeenCalledWith(rawOptions, ...rest);
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
    `(d(".create($dto, ...$rest)"), ({ dto, rest }: { dto: {}; rest: [] }) => {
      let ret: Resolved<ReturnType<typeof controller.create>>;

      beforeEach(async () => {
        ret = await controller.create(dto, ...rest);
      });

      it("should create an entity", () => {
        expect(testService.create).toHaveBeenCalledTimes(1);
        expect(testService.create).toHaveBeenCalledWith(dto, ...rest);
      });

      it("should transform the entity", () => {
        expect(testService.transform).toHaveBeenCalledTimes(1);
        expect(testService.transform).toHaveBeenCalledWith(entity, ...rest);
      });

      it("should return the entity", () => {
        expect(ret).toEqual(entity);
      });
    });

    describe.each`
      lookup | rest
      ${1}   | ${["extra"]}
    `(d(".retrieve()"), ({ lookup, rest }: { lookup: number; rest: [] }) => {
      let ret: Resolved<ReturnType<typeof controller.retrieve>>;

      beforeEach(async () => {
        ret = await controller.retrieve(lookup, ...rest);
      });

      it("should retrieve the entity", () => {
        expect(testService.retrieve).toHaveBeenCalledTimes(1);
        expect(testService.retrieve).toHaveBeenCalledWith(lookup, ...rest);
      });

      it("should transform the entitiy", () => {
        expect(testService.transform).toHaveBeenCalledTimes(1);
        expect(testService.transform).toHaveBeenCalledWith(entity, ...rest);
      });

      it("should return the entity", () => {
        expect(ret).toEqual(entity);
      });
    });

    describe.each`
      lookup | dto                   | rest
      ${1}   | ${{ replace: "dto" }} | ${["rest"]}
    `(
      d(".replace($lookup, $dto, ...$rest)"),
      ({ lookup, dto, rest }: { lookup: number; dto: {}; rest: [] }) => {
        let ret: Resolved<ReturnType<typeof controller.replace>>;

        beforeEach(async () => {
          ret = await controller.replace(lookup, dto, ...rest);
        });

        it("should replace the entity", () => {
          expect(testService.replace).toHaveBeenCalledTimes(1);
          expect(testService.replace).toHaveBeenCalledWith(
            lookup,
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
      d(".update($lookup, $dto, ...$rest)"),
      ({ lookup, dto, rest }: { lookup: number; dto: {}; rest: [] }) => {
        let ret: Resolved<ReturnType<typeof controller.update>>;

        beforeEach(async () => {
          ret = await controller.update(lookup, dto, ...rest);
        });

        it("should update the entity", () => {
          expect(testService.update).toHaveBeenCalledTimes(1);
          expect(testService.update).toHaveBeenCalledWith(lookup, dto, ...rest);
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
      d(".destroy($lookup, ...$rest)"),
      ({ lookup, rest }: { lookup: number; rest: [] }) => {
        let ret: Resolved<ReturnType<typeof controller.destroy>>;

        beforeEach(async () => {
          ret = await controller.destroy(lookup, ...rest);
        });

        it("should delete the entity", () => {
          expect(testService.destroy).toHaveBeenCalledTimes(1);
          expect(testService.destroy).toHaveBeenCalledWith(lookup, ...rest);
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
    ${"list"}     | ${["ListQueryDto"]}
    ${"create"}   | ${[TestEntity]}
    ${"retrieve"} | ${[Number]}
    ${"replace"}  | ${[Number, TestEntity]}
    ${"update"}   | ${[Number, TestEntity]}
    ${"destroy"}  | ${[Number]}
  `(
    "should emit parameter types metadata to `.$name()`",
    ({
      name,
      types,
    }: {
      name: string;
      types: (ClassConstructor<any> | "ListQueryDto")[];
    }) => {
      types = types.map((type) =>
        type == "ListQueryDto" ? factory.options.listQueryDto : type
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
    ${"create"}   | ${[[Body]]}
    ${"retrieve"} | ${[[Param]]}
    ${"replace"}  | ${[[Param], [Body]]}
    ${"update"}   | ${[[Param], [Body]]}
    ${"destroy"}  | ${[[Param]]}
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
