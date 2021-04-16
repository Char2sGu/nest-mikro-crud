import { plainToClass } from "class-transformer";
import { REST_SERVICE_OPTIONS_METADATA_KEY } from "src/constants";
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
    let TestService: typeof factory.service;
    let repository: Repository<TestEntity>;
    let service: RestService<TestEntity>;

    beforeEach(() => {
      TestService = class TestService extends factory.service {};
      repository = new Repository();
      service = new TestService(repository);
    });

    it("should have the metadata of the options passed", () => {
      const metadata = Reflect.getMetadata(
        REST_SERVICE_OPTIONS_METADATA_KEY,
        TestService
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

      it("should call `repo.find()` once with no args", async () => {
        expect(MockRepository.prototype.find).toHaveBeenCalledTimes(1);
        expect(MockRepository.prototype.find).toHaveBeenCalledWith();
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

    describe(".update()", () => {
      it("should return the updated entity when found the entity", async () => {
        MockRepository.prototype.findOneOrFail.mockResolvedValueOnce(
          plainToClass(TestEntity, { id: 2 })
        );
        MockRepository.prototype.save.mockImplementationOnce(async (v) => v);
        const ret = (await service.update(1, { id: 2 }))!;
        expect(ret).toBeDefined();
        expect(ret).toBeInstanceOf(TestEntity);
        expect(ret.id).toBe(2);
      });
    });

    describe(".destroy()", () => {
      it("should call `repo.remove()` when found the entity", async () => {
        MockRepository.prototype.findOneOrFail.mockResolvedValueOnce(true);
        await service.destroy(1);
        expect(MockRepository.prototype.remove).toHaveBeenCalledTimes(1);
      });
    });

    describe(".count()", () => {
      it("should return what `repo.count()` returns", async () => {
        MockRepository.prototype.count.mockResolvedValueOnce(1);
        const ret = await service.count();
        expect(ret).toBe(1);
      });
    });
  });
});
