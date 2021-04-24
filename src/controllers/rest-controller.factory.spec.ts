import { Exclude } from "class-transformer";
import "reflect-metadata";
import {
  REST_REPOSITORY_PROPERTY_KEY,
  REST_SERVICE_OPTIONS_METADATA_KEY,
  REST_SERVICE_PROPERTY_KEY,
} from "src/constants";
import { ListQueryDto } from "src/dtos/list-query.dto";
import { RestServiceOptions } from "src/services/rest-service-options.interface";
import { Column, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
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
    [REST_REPOSITORY_PROPERTY_KEY]: new Repository(),
    list: jest.fn(),
    create: jest.fn(),
    retrieve: jest.fn(),
    replace: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    transform: jest.fn(),
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

        beforeEach(() => {
          controller = new factory.controller();
          // @ts-expect-error - manual injection
          controller[REST_SERVICE_PROPERTY_KEY] = new TestService();
        });

        describe(".list()", () => {
          it("should call service's methods", async () => {
            await controller.list({});
            expect(TestServiceProto.list).toHaveBeenCalledTimes(1);
            expect(TestServiceProto.transform).toHaveBeenCalledTimes(1);
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
          it("should call service's methods", async () => {
            await controller.create({});
            expect(TestServiceProto.create).toHaveBeenCalledTimes(1);
            expect(TestServiceProto.transform).toHaveBeenCalledTimes(1);
          });
        });

        describe(".retrieve()", () => {
          it("should call service's methods", async () => {
            await controller.retrieve({});
            expect(TestServiceProto.retrieve).toHaveBeenCalledTimes(1);
            expect(TestServiceProto.transform).toHaveBeenCalledTimes(1);
          });
        });

        describe(".replace()", () => {
          it("should call service's methods", async () => {
            await controller.replace({}, {});
            expect(TestServiceProto.replace).toHaveBeenCalledTimes(1);
            expect(TestServiceProto.transform).toHaveBeenCalledTimes(1);
          });
        });

        describe(".update()", () => {
          it("should call service's methods", async () => {
            await controller.update({}, {});
            expect(TestServiceProto.update).toHaveBeenCalledTimes(1);
            expect(TestServiceProto.transform).toHaveBeenCalledTimes(1);
          });
        });

        describe(".destroy()", () => {
          it("should call service's methods", async () => {
            await controller.destroy({});
            expect(TestServiceProto.destroy).toHaveBeenCalledTimes(1);
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
