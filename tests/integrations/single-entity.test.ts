import { Body, Controller, Injectable, Post, UsePipes } from "@nestjs/common";
import { NestApplication } from "@nestjs/core";
import { PartialType } from "@nestjs/mapped-types";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Exclude } from "class-transformer";
import { IsString } from "class-validator";
import { RestControllerFactory } from "src/controllers";
import { ListQueryDto, ListQueryDtoFactory } from "src/dtos";
import { RestServiceFactory } from "src/services";
import { Column, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import { getRequester } from "../units/get-requester";
import { getTypeOrmModules } from "../utils/get-typeorm-modules";
import { m } from "../utils/type-helpers";

describe("Single Entity", () => {
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
    customArgs: (body: any) => null,
  }).product {}

  @Controller()
  class TestController extends new RestControllerFactory({
    routes: ["list", "create", "retrieve", "replace", "update", "destroy"],
    restServiceClass: TestService,
    listQueryDto: new ListQueryDtoFactory({
      limit: { max: 2, default: 1 },
    }).product,
    customArgs: [[Object, [Body()]]],
  }).applyMethodDecorators(
    "update",
    UsePipes(jest.fn(() => ({ transform: testPipe })))
  ).product {
    @Post()
    create(dto: TestCreateDto, body: any) {
      return super.create(dto, body);
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
      ${1}  | ${{}}
      ${2}  | ${{ limit: 2 }}
      ${1}  | ${{ offset: 1 }}
    `(
      "should return $count serialized entities when query is $query",
      async ({ count, query }: { count: number; query: ListQueryDto }) => {
        const entities: TestEntity[] = [
          { id: 2, field: "str" },
          { id: 3, field: "strrr" },
        ];
        await repository.save(entities);
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

    it("should return a 400 when limit is to large", async () => {
      await requester.get("/").query({ limit: 3 }).expect(400);
    });

    it.each`
      name
      ${"limit"}
      ${"offset"}
    `("should return a 400 when $name is 0", async ({ name }) => {
      await requester
        .get("/")
        .query({ [name]: 0 })
        .expect(400);
    });

    it("should return a 400 when passed illegal queries", async () => {
      await requester.get("/").query({ limit: "illegal" }).expect(400);
    });
  });

  describe("/ (POST)", () => {
    it("should return a serialized entity", async () => {
      jest.spyOn(TestService.prototype, "create");
      const entity: TestCreateDto = { field: "created" };
      const serializedEntity: Partial<TestEntity> = { field: "created" };
      await requester
        .post("/")
        .send(entity)
        .expect(201)
        .expect(({ body }) => {
          expect(body).toEqual(serializedEntity);
        });
      expect(TestService.prototype.create).toHaveBeenCalledTimes(1);
      expect(m(TestService.prototype.create).mock.calls[0]).toHaveLength(2);
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

  describe("/:id/ (PUT)", () => {
    it("should replace and return the entity when the entity exists", async () => {
      await repository.save(entity);
      const { body }: { body: TestEntity } = await requester
        .put("/1/")
        .send({ field: "newStr" })
        .expect(200);
      expect(body).toBeDefined();
      expect(body.field).not.toBe(entity.field);
    });

    it("should return a 404 when the entity not exists", async () => {
      const dto: Partial<TestEntity> = { field: entity.field };
      await requester.put("/notexists/").send(dto).expect(404);
    });

    it("should return a 400 when passed illegal data", async () => {
      await repository.save({ id: 1, field: "" });
      await requester.put("/1/").send({ field: 0 }).expect(400);
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
      expect(testPipe).toHaveBeenCalledTimes(3);
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
