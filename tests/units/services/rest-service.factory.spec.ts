import { Exclude } from "class-transformer";
import {
  Resolved,
  RestService,
  RestServiceFactory,
  REST_SERVICE_OPTIONS_METADATA_KEY,
} from "src";
import { buildKeyChecker, m } from "tests/utils";
import { Repository } from "typeorm";

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

    const extraArgs = { extra: "arg" };

    let repository: Repository<TestEntity>;
    let service: RestService<TestEntity, TestEntity, TestEntity, "id">;
    let entity: TestEntity;

    beforeEach(() => {
      repository = new Repository();
      service = new factory.product();
      // @ts-expect-error - manual injection
      service.repository = repository;
      entity = new TestEntity();
      entity.id = 1;
      m(repository.create).mockImplementation((v) => v as any);
      m(repository.save).mockImplementationOnce(async (v) => v as any);
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
        m(repository.find).mockResolvedValueOnce([entity]);
        jest.spyOn(service, "getQueryConditions").mockResolvedValueOnce({});
        jest.spyOn(service, "getRelationOptions").mockResolvedValueOnce({
          relations: [],
          loadRelationIds: { relations: [] },
        });
        ret = await service.list({
          limit: 1,
          offset: 2,
          expand: [],
          ...extraArgs,
        });
      });

      it("should return an array of entities", () => {
        expect(ret).toBeInstanceOf(Array);
        expect(ret[0]).toBeInstanceOf(TestEntity);
      });

      it("should get the query conditions", () => {
        expect(service.getQueryConditions).toHaveBeenCalledTimes(1);
        expect(service.getQueryConditions).toHaveBeenCalledWith({
          ...extraArgs,
        });
      });

      it("should get the relation options", () => {
        expect(service.getRelationOptions).toHaveBeenCalledTimes(1);
        expect(service.getRelationOptions).toHaveBeenCalledWith({
          expand: [],
          ...extraArgs,
        });
      });

      it("should execute the query", () => {
        expect(repository.find).toHaveBeenCalledTimes(1);
      });
    });

    describe(d(".create()"), () => {
      let ret: Resolved<ReturnType<RestService["create"]>>;

      beforeEach(async () => {
        jest.spyOn(service, "retrieve").mockResolvedValueOnce(entity);
        ret = await service.create({
          data: entity,
          expand: [],
          ...extraArgs,
        });
      });

      it("should retrieve the created entity", () => {
        expect(service.retrieve).toHaveBeenCalledTimes(1);
        expect(service.retrieve).toHaveBeenCalledWith({
          lookup: 1,
          expand: [],
          ...extraArgs,
        });
      });

      it("should return an entity", () => {
        expect(ret).toBeInstanceOf(TestEntity);
      });

      it("should save the entity", () => {
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.save).toHaveBeenCalledWith(entity);
      });
    });

    describe(d(".retrieve()"), () => {
      let ret: Resolved<ReturnType<RestService["retrieve"]>>;

      beforeEach(async () => {
        m(repository.findOneOrFail).mockResolvedValueOnce(entity);
        jest.spyOn(service, "getQueryConditions").mockResolvedValueOnce({});
        jest.spyOn(service, "getRelationOptions").mockResolvedValueOnce({
          relations: [],
          loadRelationIds: { relations: [] },
        });
        ret = await service.retrieve({
          lookup: 1,
          expand: [],
          ...extraArgs,
        });
      });

      it("should return an entity", () => {
        expect(ret).toBeInstanceOf(TestEntity);
      });

      it("should should find the entity", async () => {
        expect(service.getQueryConditions).toHaveBeenCalledTimes(1);
        expect(service.getQueryConditions).toHaveBeenCalledWith({
          lookup: 1,
          ...extraArgs,
        });
        expect(service.getRelationOptions).toHaveBeenCalledTimes(1);
        expect(service.getRelationOptions).toHaveBeenCalledWith({
          expand: [],
          ...extraArgs,
        });
        expect(repository.findOneOrFail).toHaveBeenCalledTimes(1);
      });
    });

    describe(d(".replace()"), () => {
      let ret: Resolved<ReturnType<RestService["replace"]>>;

      beforeEach(async () => {
        jest.spyOn(service, "retrieve").mockResolvedValue(entity);
        m(repository.merge).mockReturnValueOnce(entity);
        ret = await service.replace({
          lookup: 1,
          data: entity,
          expand: [],
          ...extraArgs,
        });
      });

      it("should retrieve the entity", () => {
        expect(service.retrieve).toHaveBeenCalledTimes(2);
        for (let i = 1; i <= 2; i++)
          expect(service.retrieve).toHaveBeenNthCalledWith(i, {
            lookup: 1,
            expand: [],
            ...extraArgs,
          });
      });

      it("should save the entity", () => {
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.save).toHaveBeenCalledWith(entity);
      });

      it("should return an entity", () => {
        expect(ret).toBeInstanceOf(TestEntity);
      });
    });

    describe(d(".update()"), () => {
      let ret: Resolved<ReturnType<RestService["update"]>>;

      beforeEach(async () => {
        jest.spyOn(service, "retrieve").mockResolvedValue(entity);
        m(repository.merge).mockReturnValueOnce(entity);
        ret = await service.update({
          lookup: 1,
          data: entity,
          expand: [],
          ...extraArgs,
        });
      });

      it("should retrieve the entity", () => {
        expect(service.retrieve).toHaveBeenCalledTimes(2);
        for (let i = 1; i <= 2; i++)
          expect(service.retrieve).toHaveBeenNthCalledWith(i, {
            lookup: 1,
            expand: [],
            ...extraArgs,
          });
      });

      it("should save the entity", () => {
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(repository.save).toHaveBeenCalledWith(entity);
      });

      it("should return an entity", () => {
        expect(ret).toBeInstanceOf(TestEntity);
      });
    });

    describe(d(".destroy()"), () => {
      let ret: Resolved<ReturnType<RestService["destroy"]>>;

      beforeEach(async () => {
        jest.spyOn(service, "retrieve").mockResolvedValue(entity);
        m(repository.remove).mockResolvedValueOnce(entity);
        ret = await service.destroy({
          lookup: 1,
          ...extraArgs,
        });
      });

      it("should retrieve the entity", () => {
        expect(service.retrieve).toHaveBeenCalledTimes(1);
        expect(service.retrieve).toHaveBeenCalledWith({
          lookup: 1,
          ...extraArgs,
        });
      });

      it("should remove the entity", () => {
        expect(repository.remove).toHaveBeenCalledTimes(1);
        expect(repository.remove).toHaveBeenCalledWith(entity);
      });

      it("should return the entity", () => {
        expect(ret).toBe(entity);
      });
    });

    describe(d(".count"), () => {
      let ret: Resolved<ReturnType<RestService["count"]>>;

      beforeEach(async () => {
        m(repository.count).mockResolvedValueOnce(1);
        jest.spyOn(service, "getQueryConditions").mockResolvedValueOnce({});
        ret = await service.count({ ...extraArgs });
      });

      it("should get the query conditions", () => {
        expect(service.getQueryConditions).toHaveBeenCalledTimes(1);
        expect(service.getQueryConditions).toHaveBeenCalledWith({
          ...extraArgs,
        });
      });

      it("should get the count", () => {
        expect(repository.count).toHaveBeenCalledTimes(1);
      });

      it("should return the count", () => {
        expect(ret).toBe(1);
      });
    });

    describe(d(".transform()"), () => {
      let ret: Resolved<ReturnType<RestService["transform"]>>;

      beforeEach(async () => {
        ret = await service.transform({
          entity,
          ...extraArgs,
        });
      });

      it("should return a transformed entity", async () => {
        expect(ret).toEqual({});
      });
    });

    describe.each`
      lookup       | expected
      ${undefined} | ${{}}
      ${0}         | ${{ id: 0 }}
    `(d(".getQueryConditions({ lookup: $lookup })"), ({ lookup, expected }) => {
      let ret: Resolved<ReturnType<RestService["getQueryConditions"]>>;

      beforeEach(async () => {
        ret = await service.getQueryConditions({ lookup, ...extraArgs });
      });

      it(`should return ${expected}`, async () => {
        expect(ret).toEqual(expected);
      });
    });

    describe.each`
      expand   | all                | expected
      ${["1"]} | ${["1", "2", "3"]} | ${[["1"], ["2", "3"]]}
    `(
      d(".getRelationOptions({ expand: $expand }) all:$all"),
      ({ expand, all, expected }) => {
        let ret: Resolved<ReturnType<RestService["getRelationOptions"]>>;

        beforeEach(async () => {
          // @ts-expect-error - mock data
          repository.metadata = {
            relations: all.map((v: string) => ({ propertyPath: v })),
          } as any;
          ret = await service.getRelationOptions({ expand, ...extraArgs });
        });

        it(`should return relations: [${expected[0]}] and relaiton ids: [${expected[1]}]`, () => {
          expect(ret.relations).toEqual(expected[0]);
          expect(ret.loadRelationIds).toEqual({ relations: expected[1] });
        });
      }
    );

    describe(d(".finalizeList()"), () => {
      let ret: Resolved<ReturnType<RestService["finalizeList"]>>;

      beforeEach(async () => {
        jest.spyOn(service, "count").mockResolvedValueOnce(1);
        ret = await service.finalizeList({
          entities: [entity],
          ...extraArgs,
        });
      });

      it("should return the data schema with the entities", () => {
        expect(ret).toEqual({
          total: 1,
          results: [entity],
        });
      });

      it("should get the entity count", () => {
        expect(service.count).toHaveBeenCalledTimes(1);
        expect(service.count).toHaveBeenCalledWith({ ...extraArgs });
      });
    });
  });
});
