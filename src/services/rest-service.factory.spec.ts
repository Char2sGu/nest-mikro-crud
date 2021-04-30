import { Exclude, plainToClass } from "class-transformer";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
import { Resolved } from "src/utils";
import { EntityNotFoundError, Repository } from "typeorm";
import { RestServiceFactory } from "./rest-service.factory";
import { RestService } from "./rest-service.interface";
import { _ } from "tests/mocked-type-helper";

jest.mock("typeorm");

describe("RestServiceFactory", () => {
  class TestEntity {
    @Exclude()
    id!: number;
  }

  let factory: RestServiceFactory;

  beforeEach(() => {
    factory = new RestServiceFactory({
      entityClass: TestEntity,
      dtoClasses: { create: TestEntity, update: TestEntity },
      lookupField: "id",
    });
  });

  it("should be defined", () => {
    expect(factory).toBeDefined();
  });

  describe(".service", () => {
    let repository: Repository<TestEntity>;
    let service: RestService<TestEntity>;
    let entity: TestEntity;

    beforeEach(() => {
      repository = new Repository();
      service = new factory.service();
      // @ts-expect-error - manual injection
      service.repository = repository;
      entity = { id: 1 };
    });

    it("should have the metadata of the options passed", () => {
      const metadata = Reflect.getMetadata(
        REST_SERVICE_OPTIONS_METADATA_KEY,
        factory.service
      );
      expect(metadata).toBeDefined();
      expect(metadata).toBeInstanceOf(Object);
    });

    describe(".list()", () => {
      let ret: Resolved<ReturnType<RestService["list"]>>;

      beforeEach(async () => {
        _(Repository).prototype.find.mockResolvedValueOnce([
          plainToClass(TestEntity, { id: 1 }),
        ]);
        ret = await service.list();
      });

      it("should return an array of entities", () => {
        expect(ret).toBeInstanceOf(Array);
        expect(ret[0]).toBeInstanceOf(TestEntity);
      });

      it("should call `repo.find()`", async () => {
        expect(_(Repository).prototype.find).toHaveBeenCalledTimes(1);
      });
    });

    describe(".create()", () => {
      let dto: TestEntity;
      let ret: Resolved<ReturnType<RestService["create"]>>;

      beforeEach(async () => {
        dto = { id: 1 };

        _(Repository).prototype.create.mockReturnValueOnce(
          plainToClass(TestEntity, dto)
        );
        _(Repository).prototype.save.mockImplementationOnce(async (v) => v);
        ret = await service.create(dto);
      });

      it("should return an entity", () => {
        expect(ret).toBeInstanceOf(TestEntity);
      });

      it("should call `repo.save()` once with an entity", () => {
        expect(_(Repository).prototype.save.mock.calls[0][0]).toBeInstanceOf(
          TestEntity
        );
      });

      it("should call `repo.create()` once with a dto", () => {
        expect(_(Repository).prototype.create).toHaveBeenCalledTimes(1);
        expect(_(Repository).prototype.create).toHaveBeenCalledWith(dto);
      });
    });

    describe(".retrieve()", () => {
      it("should call `repo.findOne()` once with the lookup condition and return the return value", async () => {
        _(Repository).prototype.findOneOrFail.mockResolvedValueOnce(
          "something"
        );
        const getQueryConditionsSpy = jest.spyOn(service, "getQueryConditions");
        const ret = await service.retrieve(1);
        expect(ret).toBe("something");
        expect(_(Repository).prototype.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(getQueryConditionsSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe(".replace()", () => {
      it("should create and return an entity when not found", async () => {
        const spys = {
          create: jest.spyOn(service, "create").mockResolvedValueOnce(entity),
          update: jest.spyOn(service, "update").mockImplementationOnce(() => {
            throw new EntityNotFoundError(class {}, {});
          }),
        };
        const ret = await service.replace(1, entity);
        expect(spys.update).toHaveBeenCalledTimes(1);
        expect(spys.create).toHaveBeenCalledTimes(1);
        expect(ret).toEqual(entity);
      });

      it("should update and return an entity when found", async () => {
        const spy = jest.spyOn(service, "update").mockResolvedValueOnce(entity);
        const ret = await service.replace(1, entity);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(ret).toEqual(entity);
      });
    });

    describe(".update()", () => {
      it("should return the updated entity", async () => {
        const updated: TestEntity = { id: 2 };
        const spy = jest
          .spyOn(service, "retrieve")
          .mockResolvedValueOnce(entity);
        _(Repository).prototype.save.mockImplementationOnce(async (v) => v);
        const ret = await service.update(1, updated);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(ret).toEqual(updated);
      });
    });

    describe(".destroy()", () => {
      it("should call `.retrieve()` and `repo.remove()`", async () => {
        const spy = jest
          .spyOn(service, "retrieve")
          .mockResolvedValueOnce(entity);
        await service.destroy(1);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(_(Repository).prototype.remove).toHaveBeenCalledTimes(1);
        expect(_(Repository).prototype.remove).toHaveBeenCalledWith(entity);
      });
    });

    describe(".count()", () => {
      it("should call `repo.count()`", async () => {
        await service.count();
        expect(_(Repository).prototype.count).toHaveBeenCalledTimes(1);
      });
    });

    describe(".transform()", () => {
      it("should return a transformed entity when passed an entity", async () => {
        const ret = await service.transform({ id: 1 });
        expect(ret).toEqual({});
      });

      it("should return an array of transformed entities when passed an array", async () => {
        const ret = await service.transform([{ id: 1 }]);
        expect(ret).toEqual([{}]);
      });
    });

    describe(".getQueryConditions()", () => {
      it("should return an empty object", async () => {
        const ret = await service.getQueryConditions();
        expect(ret).toEqual({});
      });
    });

    describe(".getQueryConditions(0)", () => {
      it("should return a condition object filled with the lookup condition", async () => {
        const ret = await service.getQueryConditions(0);
        expect(ret).toEqual({ id: 0 });
      });
    });
  });
});
