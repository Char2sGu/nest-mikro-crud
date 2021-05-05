import { Exclude, plainToClass } from "class-transformer";
import { async } from "rxjs";
import {
  QueryDto,
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

    let repository: Repository<TestEntity>;
    let service: RestService<TestEntity>;
    let entity: TestEntity;
    let queries: QueryDto;

    beforeEach(() => {
      repository = new Repository();
      service = new factory.product();
      // @ts-expect-error - manual injection
      service.repository = repository;
      queries = { limit: 1, offset: 2, expand: [] };
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
        ret = await service.list(queries);
      });

      it("should return an array of entities", () => {
        expect(ret).toBeInstanceOf(Array);
        expect(ret[0]).toBeInstanceOf(TestEntity);
      });

      it("should get the query conditions", () => {
        expect(service.getQueryConditions).toHaveBeenCalledTimes(1);
        expect(service.getQueryConditions).toHaveBeenCalledWith(undefined);
      });

      it("should get the relation options", () => {
        expect(service.getRelationOptions).toHaveBeenCalledTimes(1);
        expect(service.getRelationOptions).toHaveBeenCalledWith(queries);
      });

      it("should execute the query", () => {
        expect(repository.find).toHaveBeenCalledTimes(1);
        expect(repository.find).toHaveBeenCalledWith({
          where: {},
          take: 1,
          skip: 2,
          relations: [],
          loadRelationIds: { relations: [] },
        });
      });
    });

    describe(d(".create()"), () => {
      let ret: Resolved<ReturnType<RestService["create"]>>;

      beforeEach(async () => {
        jest.spyOn(service, "retrieve").mockResolvedValueOnce(entity);
        ret = await service.create(queries, entity);
      });

      it("should retrieve the created entity", () => {
        expect(service.retrieve).toHaveBeenCalledTimes(1);
        expect(service.retrieve).toHaveBeenCalledWith(1, queries);
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
        ret = await service.retrieve(1, queries);
      });

      it("should return an entity", () => {
        expect(ret).toBeInstanceOf(TestEntity);
      });

      it("should should find the entity", async () => {
        expect(service.getQueryConditions).toHaveBeenCalledTimes(1);
        expect(service.getQueryConditions).toHaveBeenCalledWith(1);
        expect(service.getRelationOptions).toHaveBeenCalledTimes(1);
        expect(service.getRelationOptions).toHaveBeenCalledWith(queries);
        expect(repository.findOneOrFail).toHaveBeenCalledTimes(1);
        expect(repository.findOneOrFail).toHaveBeenCalledWith({
          where: {},
          relations: [],
          loadRelationIds: { relations: [] },
        });
      });
    });

    describe(d(".replace()"), () => {
      let ret: Resolved<ReturnType<RestService["replace"]>>;

      beforeEach(async () => {
        jest.spyOn(service, "retrieve").mockResolvedValue(entity);
        m(repository.merge).mockReturnValueOnce(entity);
        ret = await service.replace(1, queries, entity);
      });

      it("should retrieve the entity", () => {
        expect(service.retrieve).toHaveBeenCalledTimes(2);
        expect(service.retrieve).toHaveBeenCalledWith(1, queries);
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
        ret = await service.update(1, queries, entity);
      });

      it("should retrieve the entity", () => {
        expect(service.retrieve).toHaveBeenCalledTimes(2);
        expect(service.retrieve).toHaveBeenCalledWith(1, queries);
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
        ret = await service.destroy(1, queries);
      });

      it("should retrieve the entity", () => {
        expect(service.retrieve).toHaveBeenCalledTimes(1);
        expect(service.retrieve).toHaveBeenCalledWith(1, queries);
      });

      it("should remove the entity", () => {
        expect(repository.remove).toHaveBeenCalledTimes(1);
        expect(repository.remove).toHaveBeenCalledWith(entity);
      });

      it("should return the entity", () => {
        expect(ret).toBe(entity);
      });
    });

    describe(d(".transform()"), () => {
      let ret: Resolved<ReturnType<RestService["transform"]>>;

      beforeEach(async () => {
        ret = await service.transform(entity);
      });

      it("should return a transformed entity", async () => {
        expect(ret).toEqual({});
      });
    });

    describe.each`
      lookup       | expected
      ${undefined} | ${{}}
      ${0}         | ${{ id: 0 }}
    `(d(".getQueryConditions($lookup)"), ({ lookup, expected }) => {
      let ret: Resolved<ReturnType<RestService["getQueryConditions"]>>;

      beforeEach(async () => {
        ret = await service.getQueryConditions(lookup);
      });

      it(`should return ${expected}`, async () => {
        expect(ret).toEqual(expected);
      });
    });

    describe.each`
      expand   | all                | expected
      ${["1"]} | ${["1", "2", "3"]} | ${[["1"], ["2", "3"]]}
    `(
      d(".getRelationOptions($expand) all:$all"),
      ({ expand, all, expected }) => {
        let ret: Resolved<ReturnType<RestService["getRelationOptions"]>>;

        beforeEach(async () => {
          // @ts-expect-error - mock data
          repository.metadata = {
            relations: all.map((v: string) => ({ propertyPath: v })),
          } as any;
          ret = await service.getRelationOptions({ expand });
        });

        it(`should return relations: [${expected[0]}] and relaiton ids: [${expected[1]}]`, () => {
          expect(ret.relations).toEqual(expected[0]);
          expect(ret.loadRelationIds).toEqual({ relations: expected[1] });
        });
      }
    );
  });
});
