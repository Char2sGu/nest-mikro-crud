import { plainToClass } from "class-transformer";
import {
  REST_REPOSITORY_PROPERTY_KEY,
  REST_SERVICE_OPTIONS_METADATA_KEY,
} from "src/constants";
import { Resolved } from "src/utils/resolved.type";
import { Repository } from "typeorm";
import { RestServiceFactory } from "./rest-service.factory";
import { RestService } from "./rest-service.interface";

jest.mock("typeorm");
const MockRepository = Repository as jest.MockedClass<typeof Repository>;

describe("RestServiceFactory", () => {
  class TestEntity {
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
      service[REST_REPOSITORY_PROPERTY_KEY] = repository;
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
        MockRepository.prototype.find.mockResolvedValueOnce([
          plainToClass(TestEntity, { id: 1 }),
        ]);
        ret = await service.list();
      });

      it("should return an array of entities", () => {
        expect(ret).toBeInstanceOf(Array);
        expect(ret[0]).toBeInstanceOf(TestEntity);
      });

      it("should call `repo.find()`", async () => {
        expect(MockRepository.prototype.find).toHaveBeenCalledTimes(1);
      });
    });

    describe(".create()", () => {
      let dto: TestEntity;
      let ret: Resolved<ReturnType<RestService["create"]>>;

      beforeEach(async () => {
        dto = { id: 1 };

        MockRepository.prototype.create.mockReturnValueOnce(
          plainToClass(TestEntity, dto)
        );
        MockRepository.prototype.save.mockImplementationOnce(async (v) => v);
        ret = await service.create(dto);
      });

      it("should return an entity", () => {
        expect(ret).toBeInstanceOf(TestEntity);
      });

      it("should call `repo.save()` once with an entity", () => {
        expect(MockRepository.prototype.save.mock.calls[0][0]).toBeInstanceOf(
          TestEntity
        );
      });

      it("should call `repo.create()` once with a dto", () => {
        expect(MockRepository.prototype.create).toHaveBeenCalledTimes(1);
        expect(MockRepository.prototype.create).toHaveBeenCalledWith(dto);
      });
    });

    describe(".retrieve()", () => {
      it("should call `repo.findOne()` once with the lookup condition and return the return value", async () => {
        MockRepository.prototype.findOneOrFail.mockResolvedValueOnce(
          "something"
        );
        const ret = await service.retrieve(1);
        expect(ret).toBe("something");
        expect(MockRepository.prototype.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(MockRepository.prototype.findOneOrFail.mock.calls[0][0]).toEqual(
          {
            id: 1,
          }
        );
      });
    });

    describe(".replace()", () => {
      it("should create and return an entity when not found", async () => {
        const spy = jest.spyOn(service, "create").mockResolvedValueOnce(entity);
        const ret = await service.replace(1, entity);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(ret).toEqual(entity);
      });

      it("should update and return an entity when found", async () => {
        MockRepository.prototype.findOne.mockResolvedValueOnce(entity);
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
        MockRepository.prototype.save.mockImplementationOnce(async (v) => v);
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
        expect(MockRepository.prototype.remove).toHaveBeenCalledTimes(1);
        expect(MockRepository.prototype.remove).toHaveBeenCalledWith(entity);
      });
    });

    describe(".count()", () => {
      it("should call `repo.count()`", async () => {
        await service.count();
        expect(MockRepository.prototype.count).toHaveBeenCalledTimes(1);
      });
    });
  });
});
