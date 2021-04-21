import { Body, Post } from "@nestjs/common";
import { Exclude } from "class-transformer";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
import { ListQueryDto } from "src/dtos/list-query.dto";
import { RestServiceOptions } from "src/services/rest-service-options.interface";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
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
    @PrimaryGeneratedColumn()
    id!: number;

    @Exclude()
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
    replace: jest.fn(),
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

  it.each(
    Object.entries({
      list: [ListQueryDto],
      create: [TestEntity],
      retrieve: [Number],
      update: [Number, TestEntity],
      replace: [Number, TestEntity],
      destroy: [Number],
    } as Record<RouteNames, any[]>)
  )(
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
        routeNames: ["create"],
      });
    });

    it("should return itself", () => {
      expect(ret).toBe(factory);
    });

    it("should call the decorator builders", () => {
      expect(MockPost).toHaveBeenCalled();
      expect(MockBody).toHaveBeenCalled();
    });

    it("should call `.applyDecorators()` on each decorator", () => {
      spy.mockImplementation();
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toBe("create");
      expect(spy.mock.calls[0][1]).toBeInstanceOf(Function);
      expect(spy.mock.calls[1][0]).toBe("create");
      expect(spy.mock.calls[1][1]).toBeInstanceOf(Array);
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
    let entity: TestEntity;
    let serializedEntity: Partial<TestEntity>;

    beforeEach(() => {
      TestController = factory.controller;
      controller = new TestController(new TestService());
      entity = { id: 1, field: 2 };
      serializedEntity = { id: 1 };
    });

    describe(".list()", () => {
      it("should serialize and return what the service returns", async () => {
        TestServiceProto.list.mockResolvedValueOnce([entity]);
        const ret = await controller.list({ limit: 1, offset: 1 });
        expect(ret[0]).toEqual(serializedEntity);
      });

      it("should parse numbers in query params", async () => {
        await controller.list({ limit: "1", offset: "1" } as any);
        expect(TestServiceProto.list.mock.calls[0][0]).toEqual({
          limit: 1,
          offset: 1,
        });
      });
    });

    describe(".create()", () => {
      it("should serialize and return what the service returns", async () => {
        TestServiceProto.create.mockResolvedValueOnce(entity);
        const ret = await controller.create({});
        expect(ret).toEqual(serializedEntity);
      });
    });

    describe(".retrieve()", () => {
      it("should serialize and return what the service returns", async () => {
        TestServiceProto.retrieve.mockResolvedValueOnce(entity);
        const ret = await controller.retrieve(1);
        expect(ret).toEqual(serializedEntity);
      });
    });

    describe(".replace()", () => {
      it("should serialize and return what the service returns", async () => {
        TestServiceProto.replace.mockResolvedValueOnce(entity);
        const ret = await controller.replace(1, {});
        expect(ret).toEqual(serializedEntity);
      });
    });

    describe(".update()", () => {
      it("should serialize and return what the service returns", async () => {
        TestServiceProto.update.mockResolvedValueOnce(entity);
        const ret = await controller.update(1, {});
        expect(ret).toEqual(serializedEntity);
      });
    });

    describe(".destroy()", () => {
      it("should call the service and return nothing", async () => {
        TestServiceProto.destroy.mockResolvedValueOnce(entity);
        const ret = await controller.destroy(1);
        expect(TestServiceProto.destroy).toHaveBeenCalledTimes(1);
        expect(ret).toBeUndefined();
      });
    });
  });
});
