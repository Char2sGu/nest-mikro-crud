import { Exclude } from "class-transformer";
import "reflect-metadata";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
import { ListQueryDto } from "src/dtos/list-query.dto";
import { RestServiceFactoryOptions } from "src/services/rest-service-factory-options.interface";
import { Resolved } from "src/utils/resolved.type";
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

  const testServiceOptions: RestServiceFactoryOptions<TestEntity> = {
    entityClass: TestEntity,
    dtoClasses: { create: TestEntity, update: TestEntity },
    lookupField: "field",
  };

  const entity = { k: "v" };
  const entities = [entity];

  const TestServiceProto = {
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
              expect(TestServiceProto.list).toHaveBeenCalledTimes(1);
              expect(TestServiceProto.list).toHaveBeenCalledWith(
                parsedOptions,
                ...rest
              );
            });

            it("should transform the entities", () => {
              expect(TestServiceProto.transform).toHaveBeenCalledTimes(1);
              expect(TestServiceProto.transform).toHaveBeenCalledWith(
                entities,
                ...rest
              );
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
            expect(TestServiceProto.create).toHaveBeenCalledTimes(1);
            expect(TestServiceProto.create).toHaveBeenCalledWith(dto, ...rest);
          });

          it("should transform the entity", () => {
            expect(TestServiceProto.transform).toHaveBeenCalledTimes(1);
            expect(TestServiceProto.transform).toHaveBeenCalledWith(
              entity,
              ...rest
            );
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
              expect(TestServiceProto.retrieve).toHaveBeenCalledTimes(1);
              expect(TestServiceProto.retrieve).toHaveBeenCalledWith(
                lookup,
                ...rest
              );
            });

            it("should transform the entitiy", () => {
              expect(TestServiceProto.transform).toHaveBeenCalledTimes(1);
              expect(TestServiceProto.transform).toHaveBeenCalledWith(
                entity,
                ...rest
              );
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
              expect(TestServiceProto.replace).toHaveBeenCalledTimes(1);
              expect(TestServiceProto.replace).toHaveBeenCalledWith(
                lookup,
                dto,
                ...rest
              );
            });

            it("should transform the entity", () => {
              expect(TestServiceProto.transform).toHaveBeenCalledTimes(1);
              expect(TestServiceProto.transform).toHaveBeenCalledWith(
                entity,
                ...rest
              );
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
              expect(TestServiceProto.update).toHaveBeenCalledTimes(1);
              expect(TestServiceProto.update).toHaveBeenCalledWith(
                lookup,
                dto,
                ...rest
              );
            });

            it("should transform the entity", () => {
              expect(TestServiceProto.transform).toHaveBeenCalledTimes(1);
              expect(TestServiceProto.transform).toHaveBeenCalledWith(
                entity,
                ...rest
              );
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
              expect(TestServiceProto.destroy).toHaveBeenCalledTimes(1);
              expect(TestServiceProto.destroy).toHaveBeenCalledWith(
                lookup,
                ...rest
              );
            });

            it("should return nothing", () => {
              expect(ret).toBeUndefined();
            });
          }
        );
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
