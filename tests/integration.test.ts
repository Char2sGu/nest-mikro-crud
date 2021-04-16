import { Controller, Injectable } from "@nestjs/common";
import { NestApplication } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository } from "@nestjs/typeorm";
import { RestControllerFactory } from "src/controllers/rest-controller.factory";
import { RestServiceFactory } from "src/services/rest-service.factory";
import { Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import { getRequester } from "./get-requester";
import { getTypeOrmModules } from "./get-typeorm-modules";

describe("Integration", () => {
  @Entity()
  class TestEntity {
    @PrimaryGeneratedColumn()
    id!: number;
  }

  @Injectable()
  class TestService extends new RestServiceFactory({
    entityClass: TestEntity,
    dtoClasses: { create: TestEntity, update: TestEntity },
    lookupField: "id",
  }).service {
    constructor(
      @InjectRepository(TestEntity) repository: Repository<TestEntity>
    ) {
      super(repository);
    }
  }

  @Controller()
  class TestController extends new RestControllerFactory({
    restServiceClass: TestService,
  }).enableRoutes({
    routeNames: ["list", "create", "retrieve", "update", "destroy"],
  }).controller {
    constructor(service: TestService) {
      super(service);
    }
  }

  let app: NestApplication;
  let requester: ReturnType<typeof getRequester>;
  let repository: Repository<TestEntity>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [...getTypeOrmModules(TestEntity)],
      controllers: [TestController],
      providers: [TestService],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    requester = getRequester(app);
    repository = app.get(getRepositoryToken(TestEntity));
  });

  describe("/ (GET)", () => {
    it("should return an array", async () => {
      await requester
        .get("")
        .expect(200)
        .expect(({ body }) => {
          expect(body).toBeInstanceOf(Array);
        });
    });
  });

  describe("/ (POST)", () => {
    it("should return an entity", async () => {
      await requester
        .post("/")
        .send({})
        .expect(201)
        .expect(({ body }) => {
          expect(body).toEqual({ id: 1 });
        });
    });
  });

  describe("/:id/ (GET)", () => {
    it("should return the target entity", async () => {
      await repository.save({ id: 1 });
      await requester
        .get("/1/")
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ id: 1 });
        });
    });

    it("should return a 404 when not found", async () => {
      await requester.get("/notexists/").expect(404);
    });
  });

  describe("/:id/ (PATCH)", () => {
    it("should return the updated entity", async () => {
      await repository.save({ id: 1 });
      await requester
        .patch("/1/")
        .send({ id: 2 })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ id: 2 });
        });
    });

    it("should return a 404 when not found", async () => {
      await requester.patch("/notexists/").expect(404);
    });
  });

  describe("/:id/ (DELETE)", () => {
    it("should delete the entity and return a 204", async () => {
      await repository.save({ id: 1 });
      await requester.delete("/1/").expect(204).expect("");
      expect(await repository.findOne(1)).toBeUndefined();
    });

    it("should return a 404 when not found", async () => {
      await requester.delete("/notexists/").expect(404);
    });
  });
});
