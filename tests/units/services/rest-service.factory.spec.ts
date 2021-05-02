import { Exclude, plainToClass } from "class-transformer";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
import { RestServiceFactory } from "src/services/rest-service.factory";
import { RestService } from "src/services/rest-service.interface";
import { Resolved } from "src/utils";
import { buildKeyChecker, m } from "tests/utils/type-helpers";
import { EntityNotFoundError, Repository } from "typeorm";

jest.mock("typeorm");

describe(RestServiceFactory.name, () => {
  const d = buildKeyChecker<RestServiceFactory>();

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

  describe(d(".product"), () => {
    const d = buildKeyChecker<RestService>();

    let repository: Repository<TestEntity>;
    let service: RestService<TestEntity>;
    let entity: TestEntity;

    beforeEach(() => {
      repository = new Repository();
      service = new factory.product();
      // @ts-expect-error - manual injection
      service.repository = repository;
      entity = { id: 1 };
    });

    it("should have the metadata of the options passed", () => {
      const metadata = Reflect.getMetadata(
        REST_SERVICE_OPTIONS_METADATA_KEY,
        factory.product
      );
      expect(metadata).toBeDefined();
      expect(metadata).toBeInstanceOf(Object);
    });

    describe(d(".list()"), () => {
      let ret: Resolved<ReturnType<RestService["list"]>>;

      beforeEach(async () => {
        m(Repository).prototype.find.mockResolvedValueOnce([
          plainToClass(TestEntity, { id: 1 }),
        ]);
        ret = await service.list();
      });

      it("should return an array of entities", () => {
        expect(ret).toBeInstanceOf(Array);
        expect(ret[0]).toBeInstanceOf(TestEntity);
      });

      it("should call `repo.find()`", async () => {
        expect(m(Repository).prototype.find).toHaveBeenCalledTimes(1);
      });
    });

    describe(d(".create()"), () => {
      let dto: TestEntity;
      let ret: Resolved<ReturnType<RestService["create"]>>;

      beforeEach(async () => {
        dto = { id: 1 };

        m(Repository).prototype.create.mockReturnValueOnce(
          plainToClass(TestEntity, dto)
        );
        m(Repository).prototype.save.mockImplementationOnce(async (v) => v);
        ret = await service.create(dto);
      });

      it("should return an entity", () => {
        expect(ret).toBeInstanceOf(TestEntity);
      });

      it("should call `repo.save()` once with an entity", () => {
        expect(m(Repository).prototype.save.mock.calls[0][0]).toBeInstanceOf(
          TestEntity
        );
      });

      it("should call `repo.create()` once with a dto", () => {
        expect(m(Repository).prototype.create).toHaveBeenCalledTimes(1);
        expect(m(Repository).prototype.create).toHaveBeenCalledWith(dto);
      });
    });

    describe(d(".retrieve()"), () => {
      it("should call `repo.findOne()` once with the lookup condition and return the return value", async () => {
        m(Repository).prototype.findOneOrFail.mockResolvedValueOnce(
          "something"
        );
        const getQueryConditionsSpy = jest.spyOn(service, "getQueryConditions");
        const ret = await service.retrieve(1);
        expect(ret).toBe("something");
        expect(m(Repository).prototype.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(getQueryConditionsSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe(d(".replace()"), () => {
      it("should replace and return the entity", async () => {
        const spy = jest.spyOn(service, "update").mockResolvedValueOnce(entity);
        const ret = await service.replace(1, entity);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(ret).toEqual(entity);
      });
    });

    describe(d(".update()"), () => {
      it("should return the updated entity", async () => {
        const updated: TestEntity = { id: 2 };
        const spy = jest
          .spyOn(service, "retrieve")
          .mockResolvedValueOnce(entity);
        m(Repository).prototype.save.mockImplementationOnce(async (v) => v);
        const ret = await service.update(1, updated);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(ret).toEqual(updated);
      });
    });

    describe(d(".destroy()"), () => {
      it("should call `.retrieve()` and `repo.remove()`", async () => {
        const spy = jest
          .spyOn(service, "retrieve")
          .mockResolvedValueOnce(entity);
        await service.destroy(1);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(m(Repository).prototype.remove).toHaveBeenCalledTimes(1);
        expect(m(Repository).prototype.remove).toHaveBeenCalledWith(entity);
      });
    });

    describe(d(".count()"), () => {
      it("should call `repo.count()`", async () => {
        await service.count();
        expect(m(Repository).prototype.count).toHaveBeenCalledTimes(1);
      });
    });

    describe(d(".transform()"), () => {
      it("should return a transformed entity when passed an entity", async () => {
        const ret = await service.transform({ id: 1 });
        expect(ret).toEqual({});
      });

      it("should return an array of transformed entities when passed an array", async () => {
        const ret = await service.transform([{ id: 1 }]);
        expect(ret).toEqual([{}]);
      });
    });

    describe(d(".getQueryConditions()"), () => {
      it("should return an empty object", async () => {
        const ret = await service.getQueryConditions();
        expect(ret).toEqual({});
      });
    });

    describe(d(".getQueryConditions(0)"), () => {
      it("should return a condition object filled with the lookup condition", async () => {
        const ret = await service.getQueryConditions(0);
        expect(ret).toEqual({ id: 0 });
      });
    });
  });
});
