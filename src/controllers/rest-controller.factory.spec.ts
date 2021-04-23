import { Exclude } from "class-transformer";
import "reflect-metadata";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
import { ListQueryDto } from "src/dtos/list-query.dto";
import { RestServiceOptions } from "src/services/rest-service-options.interface";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { RestControllerFactory } from "./rest-controller.factory";
import { RestController } from "./rest-controller.interface";

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

  describe("()", () => {
    beforeEach(() => {
      factory = new RestControllerFactory({
        routes: ["list"],
        restServiceClass: TestService,
      });
    });

    it("should assign the options of the service to  `.serviceOptions`", () => {
      expect(factory.serviceOptions).toBeDefined();
      expect(factory.serviceOptions).toBe(testServiceOptions);
    });

    describe(".controller", () => {
      describe(".prototype", () => {
        let controller: RestController;
        let entity: TestEntity;
        let serializedEntity: Partial<TestEntity>;

        beforeEach(() => {
          controller = new factory.controller(new TestService());
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
  });

  describe(".prototype", () => {
    beforeEach(() => {
      factory = new RestControllerFactory({
        routes: ["list", "create", "retrieve", "replace", "update", "destroy"],
        restServiceClass: TestService,
      });
    });

    it("should be defined", () => {
      expect(factory).toBeDefined();
    });

    it.each`
      name          | types
      ${"list"}     | ${[ListQueryDto]}
      ${"create"}   | ${[TestEntity]}
      ${"retrieve"} | ${[Number]}
      ${"update"}   | ${[Number, TestEntity]}
      ${"replace"}  | ${[Number, TestEntity]}
      ${"destroy"}  | ${[Number]}
    `(
      "should emit parameter types metadata to `.$name()`",
      ({ name, types }) => {
        const metadata = Reflect.getMetadata(
          "design:paramtypes",
          factory.controller.prototype,
          name
        );
        expect(metadata).toEqual(types);
      }
    );

    describe.each`
      param           | type
      ${ListQueryDto} | ${ListQueryDto}
      ${"lookup"}     | ${Number}
      ${"dto:create"} | ${TestEntity}
    `(".emitParamTypesMetadata(..., [$param])", ({ param, type }) => {
      let ret: unknown;

      beforeEach(() => {
        ret = factory.emitParamTypesMetadata("list", [param]);
      });

      it("should define the proper metadata to the param", () => {
        const metadata = Reflect.getMetadata(
          "design:paramtypes",
          factory.controller.prototype,
          "list"
        );
        expect(metadata[0]).toBe(type);
      });

      it("should return `this`", () => {
        expect(ret).toBe(factory);
      });
    });

    describe.each`
      name          | params
      ${"create"}   | ${() => [factory.controller.prototype, "create", Object.getOwnPropertyDescriptor(factory.controller.prototype, "create")]}
      ${"create:0"} | ${() => [factory.controller.prototype, "create", 0]}
    `(".applyDecorators($name, ...)", ({ name, params }) => {
      it("should call the decorator once with proper params passed and return itself", () => {
        const decorator = jest.fn();
        const ret = factory.applyDecorators(name, decorator);
        expect(ret).toBe(factory);
        expect(decorator).toHaveBeenCalledTimes(1);
        expect(decorator).toHaveBeenCalledWith(...params());
      });
    });
  });
});
