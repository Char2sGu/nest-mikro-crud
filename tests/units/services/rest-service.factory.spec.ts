import { InjectRepository } from "@nestjs/typeorm";
import { Exclude } from "class-transformer";
import {
  Resolved,
  RestService,
  RestServiceFactory,
  REST_SERVICE_OPTIONS_METADATA_KEY,
} from "src";
import { buildKeyChecker, m } from "tests/utils";
import { Repository } from "typeorm";

jest.mock("@nestjs/typeorm", () => ({
  ...jest.requireActual("@nestjs/typeorm"),
  InjectRepository: jest.fn().mockReturnValue(jest.fn()),
}));
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
      repoConnection: "test",
      dtoClasses: { create: TestEntity, update: TestEntity },
      lookupField: "id",
    });
  });

  describe(d(".product"), () => {
    const d = buildKeyChecker<RestService>();

    const extraArgs = { extra: "arg" };

    let repository: Repository<TestEntity>;
    let service: RestService<TestEntity, TestEntity, TestEntity, "id">;
    let entity: TestEntity;

    beforeEach(() => {
      repository = new Repository();
      m(repository.save).mockImplementation((entity) => entity as any);
      m(repository.merge).mockImplementation((entity) => entity as any);
      service = new factory.product();
      // @ts-expect-error - manual injection
      service.repository = repository;
      entity = Object.create(TestEntity.prototype, { id: { value: 1 } });
    });

    describe(d(".list()"), () => {
      let ret: Resolved<ReturnType<RestService["list"]>>;

      beforeEach(async () => {
        m(repository.find).mockResolvedValueOnce([entity]);
        jest
          .spyOn(service, "getQueryConditions")
          .mockResolvedValueOnce({ id: 1 });
        jest
          .spyOn(service, "parseFieldExpansions")
          .mockResolvedValueOnce({ relations: [] });
        ret = await service.list({
          limit: 1,
          offset: 2,
          expand: [],
          ...extraArgs,
        });
      });

      it("should return an array of entities", () => {
        expect(ret).toBeInstanceOf(Array);
        expect(ret[0]).toBe(entity);
      });

      it("should get the query conditions", () => {
        expect(service.getQueryConditions).toHaveBeenCalledWith({
          ...extraArgs,
        });
      });

      it("should get the relation options", () => {
        expect(service.parseFieldExpansions).toHaveBeenCalledWith({
          expand: [],
          ...extraArgs,
        });
      });

      it("should execute the query", () => {
        expect(repository.find).toHaveBeenCalledWith({
          where: { id: 1 },
          take: 1,
          skip: 2,
          order: {},
          relations: [],
        });
      });
    });

    describe(d(".create()"), () => {
      let ret: Resolved<ReturnType<RestService["create"]>>;

      beforeEach(async () => {
        jest.spyOn(service, "retrieve").mockResolvedValueOnce(entity);
        ret = await service.create({ data: entity, ...extraArgs });
      });

      it("should return an entity", () => {
        expect(ret).toBe(entity);
      });

      it("should save the entity", () => {
        expect(repository.save).toHaveBeenCalledWith(entity);
      });
    });

    describe(d(".retrieve()"), () => {
      let ret: Resolved<ReturnType<RestService["retrieve"]>>;

      beforeEach(async () => {
        m(repository.findOneOrFail).mockResolvedValueOnce(entity);
        jest
          .spyOn(service, "getQueryConditions")
          .mockResolvedValueOnce({ id: 1 });
        jest.spyOn(service, "parseFieldExpansions").mockResolvedValueOnce({
          relations: [],
        });
        ret = await service.retrieve({
          lookup: 1,
          expand: [],
          ...extraArgs,
        });
      });

      it("should return an entity", () => {
        expect(ret).toBe(entity);
      });

      it("should get the query conditions", () => {
        expect(service.getQueryConditions).toHaveBeenCalledWith({
          lookup: 1,
          ...extraArgs,
        });
      });

      it("should get the relation options", () => {
        expect(service.parseFieldExpansions).toHaveBeenCalledTimes(1);
        expect(service.parseFieldExpansions).toHaveBeenCalledWith({
          expand: [],
          ...extraArgs,
        });
      });

      it("should should find the entity", async () => {
        expect(repository.findOneOrFail).toHaveBeenCalledWith({
          where: { id: 1 },
          relations: [],
        });
      });
    });

    describe(d(".replace()"), () => {
      let ret: Resolved<ReturnType<RestService["replace"]>>;

      beforeEach(async () => {
        ret = await service.replace({
          entity,
          data: entity,
          ...extraArgs,
        });
      });

      it("should merge the data", () => {
        expect(repository.merge).toHaveBeenCalledWith(entity, entity);
      });

      it("should save the entity", () => {
        expect(repository.save).toHaveBeenCalledWith(entity);
      });

      it("should return an entity", () => {
        expect(ret).toBe(entity);
      });
    });

    describe(d(".update()"), () => {
      let ret: Resolved<ReturnType<RestService["update"]>>;

      beforeEach(async () => {
        ret = await service.update({
          entity,
          data: entity,
          ...extraArgs,
        });
      });

      it("should save the entity", () => {
        expect(repository.save).toHaveBeenCalledWith(entity);
      });

      it("should return an entity", () => {
        expect(ret).toBe(entity);
      });
    });

    describe(d(".destroy()"), () => {
      let ret: Resolved<ReturnType<RestService["destroy"]>>;

      beforeEach(async () => {
        m(repository.remove).mockResolvedValueOnce(entity);
        ret = await service.destroy({
          entity,
          ...extraArgs,
        });
      });

      it("should remove the entity", () => {
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
        jest
          .spyOn(service, "getQueryConditions")
          .mockResolvedValueOnce({ id: 1 });
        ret = await service.count({ ...extraArgs });
      });

      it("should get the query conditions", () => {
        expect(service.getQueryConditions).toHaveBeenCalledWith({
          ...extraArgs,
        });
      });

      it("should get the count", () => {
        expect(repository.count).toHaveBeenCalledWith({
          where: { id: 1 },
        });
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
      d(".parseFieldExpansions({ expand: $expand }) all:$all"),
      ({ expand, all, expected }) => {
        let ret: Resolved<ReturnType<RestService["parseFieldExpansions"]>>;

        beforeEach(async () => {
          // @ts-expect-error - mock data
          repository.metadata = {
            relations: all.map((v: string) => ({ propertyPath: v })),
          } as any;
          ret = await service.parseFieldExpansions({ expand, ...extraArgs });
        });

        it(`should return relations: [${expected[0]}] and relaiton ids: [${expected[1]}]`, () => {
          expect(ret.relations).toEqual(expected[0]);
          expect(ret.loadRelationIds).toEqual({ relations: expected[1] });
        });
      }
    );

    describe.each`
      order             | expected
      ${["field:asc"]}  | ${{ field: "ASC" }}
      ${["field:desc"]} | ${{ field: "DESC" }}
    `(d(".parseOrders({ order: $order })"), ({ order, expected }) => {
      let ret: Resolved<ReturnType<RestService["parseOrders"]>>;

      beforeEach(async () => {
        ret = await service.parseOrders({ order });
      });

      it(`should return ${expected}`, () => {
        expect(ret).toEqual(expected);
      });
    });

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

  it("should define the options as metadata on the product", () => {
    const metadata = Reflect.getMetadata(
      REST_SERVICE_OPTIONS_METADATA_KEY,
      factory.product
    );
    expect(metadata).toBeDefined();
    expect(metadata).toBeInstanceOf(Object);
  });

  it("should apply dependency injection of the repository", () => {
    expect(InjectRepository).toHaveBeenCalledWith(TestEntity, "test");
    const decorator = m(InjectRepository).mock.results[0].value;
    expect(decorator).toHaveBeenCalledWith(
      factory.product.prototype,
      "repository"
    );
  });
});
