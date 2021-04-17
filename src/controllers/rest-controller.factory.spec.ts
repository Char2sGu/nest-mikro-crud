import { Body, Post } from "@nestjs/common";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
import { RestServiceOptions } from "src/services/rest-service-options.interface";
import { Column, Entity } from "typeorm";
import { RestControllerFactory } from "./rest-controller.factory";
import { RestController } from "./rest-controller.interface";
import { RouteNames } from "./route-names.types";

jest.mock("@nestjs/common", () => ({
  ...jest.requireActual("@nestjs/common"),
  Post: jest.fn(),
  Body: jest.fn(),
}));
const MockPost = Post as jest.MockedFunction<typeof Post>;
const MockBody = Body as jest.MockedFunction<typeof Body>;

describe("RestControllerFactory", () => {
  @Entity()
  class TestEntity {
    @Column()
    field!: number;
  }

  const testServiceOptions: RestServiceOptions<TestEntity> = {
    entityClass: TestEntity,
    dtoClasses: { create: TestEntity, update: TestEntity },
    lookupField: "field",
  };

  const TestServiceProto = {
    list: jest.fn(),
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
  };

  const TestService = jest.fn(() => TestServiceProto);
  Reflect.defineMetadata(
    REST_SERVICE_OPTIONS_METADATA_KEY,
    testServiceOptions,
    TestService
  );

  let factory: RestControllerFactory;

  beforeEach(() => {
    factory = new RestControllerFactory({ restServiceClass: TestService });
  });

  it("should be defined", () => {
    expect(factory).toBeDefined();
  });

  it.each([
    ["list", []],
    ["create", [TestEntity]],
    ["retrieve", [Number]],
    ["update", [Number, TestEntity]],
    ["destroy", [Number]],
  ] as [RouteNames, any[]][])(
    "should emit correct parameter types metadata to `.%s()`",
    (name, types) => {
      const metadata = Reflect.getMetadata(
        "design:paramtypes",
        factory.controller.prototype,
        name
      );
      expect(metadata).toEqual(types);
    }
  );

  describe(".enableRoutes()", () => {
    const doSpy = () => jest.spyOn(factory, "applyDecorators");
    let spy: ReturnType<typeof doSpy>;
    let ret: ReturnType<typeof factory["enableRoutes"]>;

    beforeEach(() => {
      spy = doSpy();
      MockPost.mockReturnValueOnce(() => {});
      MockBody.mockReturnValueOnce(() => {});
      ret = factory.enableRoutes({
        lookupParam: "param",
        routeNames: ["create"],
      });
    });

    it("should return itself", () => {
      expect(ret).toBe(factory);
    });

    it("should call `.applyDecorators()`", () => {
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("should call the decorator builders", () => {
      expect(MockPost).toHaveBeenCalled();
      expect(MockBody).toHaveBeenCalled();
    });
  });

  describe.each([
    [
      "create",
      () => [
        factory.controller.prototype,
        "create",
        Object.getOwnPropertyDescriptor(factory.controller.prototype, "create"),
      ],
    ],
    ["create:0", () => [factory.controller.prototype, "create", 0]],
  ])(".applyDecorators(%s, ...)", (target: any, params) => {
    it("should call the decorator once with proper params passed and return itself", () => {
      const decorator = jest.fn();
      const ret = factory.applyDecorators(target, decorator);
      expect(ret).toBe(factory);
      expect(decorator).toHaveBeenCalledTimes(1);
      expect(decorator).toHaveBeenCalledWith(...params());
    });
  });

  describe(".controller", () => {
    let TestController: typeof factory.controller;
    let controller: RestController;

    beforeEach(() => {
      TestController = factory.controller;
      controller = new TestController(new TestService());
    });

    describe(".list()", () => {
      it("should return what the service returns", async () => {
        TestServiceProto.list.mockResolvedValueOnce(1);
        const ret = await controller.list();
        expect(ret).toBe(1);
      });
    });

    describe(".create()", () => {
      it("should return what the service returns", async () => {
        TestServiceProto.create.mockResolvedValueOnce(1);
        const ret = await controller.create({});
        expect(ret).toBe(1);
      });
    });

    describe(".retrieve()", () => {
      it("should return what the service returns", async () => {
        TestServiceProto.retrieve.mockResolvedValueOnce(1);
        const ret = await controller.retrieve(1);
        expect(ret).toBe(1);
      });
    });

    describe(".update()", () => {
      it("should return what the service returns", async () => {
        TestServiceProto.update.mockResolvedValueOnce(1);
        const ret = await controller.update(1, {});
        expect(ret).toBe(1);
      });
    });

    describe(".destroy()", () => {
      it("should call the service and return nothing", async () => {
        TestServiceProto.destroy.mockResolvedValueOnce(1);
        const ret = await controller.destroy(1);
        expect(TestServiceProto.destroy).toHaveBeenCalledTimes(1);
        expect(ret).toBeUndefined();
      });
    });
  });
});
