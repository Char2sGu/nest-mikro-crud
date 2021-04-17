import {
  Controller,
  Injectable,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { NestApplication } from "@nestjs/core";
import { PartialType } from "@nestjs/mapped-types";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository } from "@nestjs/typeorm";
import { IsString } from "class-validator";
import { RestControllerFactory } from "src/controllers/rest-controller.factory";
import { RestServiceFactory } from "src/services/rest-service.factory";
import { Column, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import { getRequester } from "./get-requester";
import { getTypeOrmModules } from "./get-typeorm-modules";

describe("Integration", () => {
  const testPipe = jest.fn((v) => v);

  @Entity()
  class TestEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    field!: string;
  }

  class TestCreateDto {
    @IsString()
    field!: string;
  }

  class TestUpdateDto extends PartialType(TestCreateDto) {}

  @Injectable()
  class TestService extends new RestServiceFactory({
    entityClass: TestEntity,
    dtoClasses: { create: TestCreateDto, update: TestUpdateDto },
    lookupField: "id",
  }).service {
    constructor(
      @InjectRepository(TestEntity) repository: Repository<TestEntity>
    ) {
      super(repository);
    }
  }

  @UsePipes(ValidationPipe)
  @Controller()
  class TestController extends new RestControllerFactory({
    restServiceClass: TestService,
  })
    .enableRoutes({
      routeNames: ["list", "create", "retrieve", "update", "destroy"],
    })
    .applyDecorators(
      "update",
      UsePipes(jest.fn(() => ({ transform: testPipe })))
    ).controller {
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
        .send({ field: "string" })
        .expect(201)
        .expect(({ body }) => {
          expect(body).toEqual({ id: 1, field: "string" });
        });
    });

    it("should return a 400 when passed illegal data", async () => {
      await requester.post("/").send({}).expect(400);
    });
  });

  describe("/:id/ (GET)", () => {
    it("should return the target entity", async () => {
      const entity: TestEntity = { id: 1, field: "string" };
      await repository.save(entity);
      await requester
        .get("/1/")
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual(entity);
        });
    });

    it("should return a 404 when not found", async () => {
      await requester.get("/notexists/").expect(404);
    });
  });

  describe("/:id/ (PATCH)", () => {
    it("should call the pipe and return the updated entity", async () => {
      const entity: TestEntity = { id: 1, field: "string" };
      await repository.save(entity);
      await requester
        .patch("/1/")
        .send({ field: "updated" })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ ...entity, field: "updated" });
        });
      expect(testPipe).toHaveBeenCalledTimes(2);
    });

    it("should return a 404 when not found", async () => {
      await requester.patch("/notexists/").expect(404);
    });

    it("should return a 400 when passed illegal data", async () => {
      await requester.patch("/1/").send({ field: 0 }).expect(400);
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
