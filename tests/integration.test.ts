import {
  Controller,
  Injectable,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { NestApplication } from "@nestjs/core";
import { PartialType } from "@nestjs/mapped-types";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository } from "@nestjs/typeorm";
import { Exclude } from "class-transformer";
import { IsString } from "class-validator";
import { RestControllerFactory } from "src/controllers/rest-controller.factory";
import { ListQueryDto } from "src/dtos/list-query.dto";
import { RestServiceFactory } from "src/services/rest-service.factory";
import { Column, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import { getRequester } from "./get-requester";
import { getTypeOrmModules } from "./get-typeorm-modules";

describe("Integration", () => {
  const testPipe = jest.fn((v) => v);

  @Entity()
  class TestEntity {
    @Exclude()
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

    @Post()
    create(dto: TestCreateDto, @Param() params: any) {
      params; // do something with params
      return super.create(dto);
    }
  }

  let app: NestApplication;
  let requester: ReturnType<typeof getRequester>;
  let repository: Repository<TestEntity>;
  let entity: TestEntity;
  let serializedEntity: Partial<TestEntity>;

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

    entity = { id: 1, field: "str" };
    serializedEntity = { field: "str" };

    await repository.save(entity);
  });

  describe("/ (GET)", () => {
    it.each`
      count | query
      ${2}  | ${{}}
      ${1}  | ${{ limit: 1 }}
      ${1}  | ${{ offset: 1 }}
    `(
      "should return $count serialized entities when query is $query",
      async ({ count, query }: { count: number; query: ListQueryDto }) => {
        const anotherEntity: TestEntity = { id: 2, field: "str" };
        await repository.save(anotherEntity);
        await requester
          .get("/")
          .query(query)
          .expect(200)
          .expect(({ body }) => {
            expect(body).toBeInstanceOf(Array);
            expect(body[0]).toEqual(serializedEntity);
            expect(body).toHaveLength(count);
          });
      }
    );
  });

  describe("/ (POST)", () => {
    it("should return a serialized entity", async () => {
      const entity: TestCreateDto = { field: "created" };
      const serializedEntity: Partial<TestEntity> = { field: "created" };
      await requester
        .post("/")
        .send(entity)
        .expect(201)
        .expect(({ body }) => {
          expect(body).toEqual(serializedEntity);
        });
    });

    it("should return a 400 when passed illegal data", async () => {
      await requester.post("/").send({}).expect(400);
    });
  });

  describe("/:id/ (GET)", () => {
    it("should return the serialized target entity", async () => {
      await requester
        .get("/1/")
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual(serializedEntity);
        });
    });

    it("should return a 404 when not found", async () => {
      await requester.get("/notexists/").expect(404);
    });
  });

  describe("/:id/ (PATCH)", () => {
    it("should call the pipe and return the updated serialized entity", async () => {
      await requester
        .patch("/1/")
        .send({ field: "updated" })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ ...serializedEntity, field: "updated" });
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
      await requester.delete("/1/").expect(204).expect("");
      expect(await repository.findOne(1)).toBeUndefined();
    });

    it("should return a 404 when not found", async () => {
      await requester.delete("/notexists/").expect(404);
    });
  });
});
