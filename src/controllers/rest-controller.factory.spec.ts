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
import {
  Body,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
import { ListQueryDto } from "src/dtos";
import { RestService, RestServiceFactoryOptions } from "src/services";
import { Resolved } from "src/utils";
import { _ } from "tests/mocked-type-helper";
import { Repository } from "typeorm";
import { RestControllerFactoryOptions } from "./rest-controller-factory-options.interface";
import { RestControllerFactory } from "./rest-controller.factory";
import { RestController } from "./rest-controller.interface";
import { RouteNames } from "./route-names.types";

describe("RestControllerFactory", () => {
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
    jest.spyOn(Reflect, "getMetadata").mockReturnValueOnce(testServiceOptions);
    jest.spyOn(Reflect, "defineMetadata");
    jest
      .spyOn(RestControllerFactory.prototype, "applyDecorators")
      .mockReturnThis();
    jest
      .spyOn(RestControllerFactory.prototype, "emitParamTypesMetadata")
      .mockReturnThis();
    factory = new RestControllerFactory(options);
  });

  it("should fill default values of the passed options and expose it", () => {
    expect(factory.options.lookupParam).toBeDefined();
    expect(factory.options.customArgs).toBeDefined();
  });

  it("should expose the service's options", () => {
    expect(Reflect.getMetadata).toHaveBeenCalledWith(
      REST_SERVICE_OPTIONS_METADATA_KEY,
      TestService
    );
    expect(factory.serviceOptions).toBe(testServiceOptions);
  });

  describe("should create the controller class", () => {
    let controller: RestController;

    beforeEach(() => {
      controller = new factory.controller();
      // @ts-expect-error - manual injection
      controller.service = new TestService();
    });

    describe.each`
      rawOptions                     | parsedOptions              | rest
      ${{ limit: "1", offset: "1" }} | ${{ limit: 1, offset: 1 }} | ${["extra"]}
    `(
      ".list($rawOptions, ...$rest)",
      ({
        rawOptions,
        parsedOptions,
        rest,
      }: {
        rawOptions: {};
        parsedOptions: {};
        rest: [];
      }) => {
        let ret: Resolved<ReturnType<typeof controller.list>>;

        beforeEach(async () => {
          ret = await controller.list(rawOptions, ...rest);
        });

        it("should query the entities", () => {
          expect(testService.list).toHaveBeenCalledTimes(1);
          expect(testService.list).toHaveBeenCalledWith(parsedOptions, ...rest);
        });

        it("should transform the entities", () => {
          expect(testService.transform).toHaveBeenCalledTimes(1);
          expect(testService.transform).toHaveBeenCalledWith(entities, ...rest);
        });

        it("should return the entities", () => {
          expect(ret).toEqual(entities);
        });
      }
    );

    describe.each`
      dto              | rest
      ${{ im: "dto" }} | ${["extra"]}
    `(".create($dto, ...$rest)", ({ dto, rest }: { dto: {}; rest: [] }) => {
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
    `(
      ".retrieve($lookup, ...$rest)",
      ({ lookup, rest }: { lookup: number; rest: [] }) => {
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
      }
    );

    describe.each`
      lookup | dto                   | rest
      ${1}   | ${{ replace: "dto" }} | ${["rest"]}
    `(
      ".replace($lookup, $dto, ...$rest)",
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
      ".update($lookup, $dto, ...$rest)",
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
      ".destroy($lookup, ...$rest)",
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
    expect(_(Inject).mock.results[0].value).toHaveBeenCalledTimes(1);
    expect(_(Inject).mock.results[0].value).toHaveBeenCalledWith(
      factory.controller.prototype,
      "service"
    );
  });

  it.each`
    name          | types
    ${"list"}     | ${[ListQueryDto]}
    ${"create"}   | ${["dto:create"]}
    ${"retrieve"} | ${["lookup"]}
    ${"replace"}  | ${["lookup", "dto:create"]}
    ${"update"}   | ${["lookup", "dto:update"]}
    ${"destroy"}  | ${["lookup"]}
  `("should emit parameter types metadata to `.$name()`", ({ name, types }) => {
    expect(factory.emitParamTypesMetadata).toHaveBeenCalledWith(name, types);
  });

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
      const inner = _(decorators).mock.results[nth].value;
      expect(factory.applyDecorators).toHaveBeenCalledWith(name, inner);
    }
  );

  it.each`
    builder  | args
    ${Param} | ${["lookup"]}
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
        builders.map((builder) => _(builder).mock.results[0].value)
      );
      expect(factory.applyDecorators).toHaveBeenCalledWith(
        name,
        ...decoratorSets
      );
    }
  );

  describe.each`
    shortcutTypes     | types
    ${[ListQueryDto]} | ${[ListQueryDto]}
    ${["lookup"]}     | ${[Number]}
    ${["dto:create"]} | ${[TestEntity]}
  `(
    ".emitParamTypesMetadata(<method-name>, $shortcutTypes)",
    ({ shortcutTypes, types }: { shortcutTypes: []; types: [] }) => {
      const name = "list";

      let ret: unknown;

      beforeEach(() => {
        _(Reflect.getMetadata).mockReturnValueOnce(Number);
        _(factory.emitParamTypesMetadata).mockRestore();
        ret = factory.emitParamTypesMetadata(name, shortcutTypes);
      });

      it("should define the types metadata", () => {
        expect(Reflect.defineMetadata).toHaveBeenCalledWith(
          "design:paramtypes",
          types,
          factory.controller.prototype,
          name
        );
      });

      it("should return `this`", () => {
        expect(ret).toBe(factory);
      });
    }
  );

  describe(".applyDecorators(<method-name>, ...<method-decorators>)", () => {
    const target: RouteNames = "create";
    const decorator: MethodDecorator = jest.fn();

    let ret: unknown;

    beforeEach(() => {
      _(factory.applyDecorators).mockRestore();
      ret = factory.applyDecorators(target, decorator);
    });

    it("should apply the method decorators", () => {
      expect(decorator).toHaveBeenCalledWith(
        factory.controller.prototype,
        target,
        Object.getOwnPropertyDescriptor(factory.controller.prototype, target)
      );
    });

    it("should return `this`", () => {
      expect(ret).toBe(factory);
    });
  });

  describe(".applyDecorators(<method-name-with-param-index>, ...<param-decorators>)", () => {
    const decorator: ParameterDecorator = jest.fn();
    const name: RouteNames = "create";
    const index = 0;
    const target = `${name}:${index}` as `${RouteNames}:${number}`;

    let ret: unknown;

    beforeEach(() => {
      _(factory.applyDecorators).mockRestore();
      ret = factory.applyDecorators(target, decorator);
    });

    it("should apply the param decorators", () => {
      expect(decorator).toHaveBeenCalledWith(
        factory.controller.prototype,
        name,
        index
      );
    });

    it("should return this", () => {
      expect(ret).toBe(factory);
    });
  });

  describe(".applyDecorators(<method-name>, ...<param-decorator-sets>)", () => {
    const name: RouteNames = "create";
    const decorator: ParameterDecorator = jest.fn();

    let ret: unknown;

    beforeEach(() => {
      _(factory.applyDecorators).mockRestore();
      jest.spyOn(factory, "applyDecorators");
      ret = factory.applyDecorators(name, [decorator]);
    });

    it("should call itself to apply the param decorators", () => {
      expect(factory.applyDecorators).toHaveBeenCalledTimes(2);
      expect(factory.applyDecorators).toHaveBeenCalledWith(
        `${name}:0`,
        decorator
      );
      expect(decorator).toHaveBeenCalledTimes(1);
      expect(decorator).toHaveBeenCalledWith(
        factory.controller.prototype,
        name,
        0
      );
    });

    it("should return `this`", () => {
      expect(ret).toBe(factory);
    });
  });
});
