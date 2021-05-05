import { Controller, Injectable } from "@nestjs/common";
import { NestApplication } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  QueryDtoFactory,
  RestControllerFactory,
  RestServiceFactory,
} from "src";
import { Response } from "supertest";
import { getConnection, Repository } from "typeorm";
import {
  CreateChildEntityDto,
  CreateParentEntityDto,
  UpdateChildEntityDto,
  UpdateParentEntityDto,
} from "./dtos";
import { Child1Entity, Child2Entity, ParentEntity } from "./entities";
import { getRequester, getTypeOrmModules } from "./utils";

@Injectable()
class TestService extends new RestServiceFactory({
  entityClass: ParentEntity,
  dtoClasses: {
    create: CreateParentEntityDto,
    update: UpdateParentEntityDto,
  },
  lookupField: "id",
}).product {}

@Controller()
class TestController extends new RestControllerFactory({
  restServiceClass: TestService,
  routes: ["list", "retrieve", "create", "replace", "update", "destroy"],
  queryDto: new QueryDtoFactory<ParentEntity>({
    limit: { max: 2, default: 1 },
    expand: { in: ["child2"] },
  }).product,
}).product {}

function assertSerializedEntity(entity: ParentEntity, id?: number) {
  expect(typeof entity.id).toBe("number");
  if (id) expect(entity.id).toBe(id);
  expect(entity.name).toBeUndefined();
  expect(typeof entity.child1).toBe("number");
  expect(entity.child2).toBeInstanceOf(Object);
}

function assertErrorDetails(body: any) {
  expect(typeof body.error).toBe("string");
  expect(body.message).toBeInstanceOf(Array);
  expect(typeof body.statusCode).toBe("number");
}

describe("E2E", () => {
  let app: NestApplication;
  let parentRepository: Repository<ParentEntity>;
  let child1Repository: Repository<Child1Entity>;
  let child2Repository: Repository<Child1Entity>;
  let requester: ReturnType<typeof getRequester>;

  let entities: ParentEntity[];

  let commonQueries: {};

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [...getTypeOrmModules(ParentEntity, Child1Entity, Child2Entity)],
      controllers: [TestController],
      providers: [TestService],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    parentRepository = module.get(getRepositoryToken(ParentEntity));
    child1Repository = module.get(getRepositoryToken(Child1Entity));
    child2Repository = module.get(getRepositoryToken(Child2Entity));
    requester = getRequester(app);

    entities = [];
    for (let i = 1; i <= 3; i++)
      entities.push(
        await parentRepository.save({
          name: "parent",
          child1: { name: "child1" },
          child2: { name: "child2" },
        })
      );

    commonQueries = { "expand[]": ["child2"] };
  });

  afterEach(async () => {
    await getConnection().close();
  });

  describe.each`
    limit        | offset       | count | firstId
    ${undefined} | ${undefined} | ${1}  | ${1}
    ${2}         | ${undefined} | ${2}  | ${1}
    ${undefined} | ${1}         | ${1}  | ${2}
    ${2}         | ${1}         | ${2}  | ${2}
  `(
    "/?limit=$limit&offset=$offset (GET)",
    ({ limit, offset, count, firstId }) => {
      let response: Response;
      let body: ParentEntity[];

      beforeEach(async () => {
        response = await requester
          .get("/")
          .query({ limit, offset, ...commonQueries });
        ({ body } = response);
      });

      it("should return 200", () => {
        expect(response.status).toBe(200);
      });

      it(`should serialize and return ${count} entities`, () => {
        expect(body).toBeInstanceOf(Array);
        expect(body).toHaveLength(count);
        assertSerializedEntity(body[0], firstId);
      });
    }
  );

  describe.each`
    limit        | offset
    ${0}         | ${undefined}
    ${undefined} | ${0}
    ${4}         | ${undefined}
  `("/?limit=$limit&offset=$offset (GET)", (queries) => {
    let response: Response;

    beforeEach(async () => {
      response = await requester.get("/").query(queries);
    });

    it("should return a 400", () => {
      expect(response.status).toBe(400);
    });
  });

  describe("/ (POST)", () => {
    let childDto: CreateChildEntityDto;
    let parentDto: CreateParentEntityDto;
    let response: Response;

    beforeEach(async () => {
      childDto = { name: "child" };
      parentDto = { name: "parent", child1: 4, child2: 4 };
      await child1Repository.save(childDto);
      await child2Repository.save(childDto);
      response = await requester.post("/").query(commonQueries).send(parentDto);
    });

    it("should return 201", () => {
      expect(response.status).toBe(201);
    });

    it("should create the entity", async () => {
      const entity = await parentRepository.findOne(4);
      expect(entity).toBeDefined();
      expect(entity?.name).toBe(parentDto.name);
    });

    it("should serialize and return entity", () => {
      assertSerializedEntity(response.body, 4);
    });
  });

  describe.each`
    dto
    ${{}}
    ${{ name: 1 }}
  `("/ $dto (POST)", ({ dto }) => {
    let response: Response;

    beforeEach(async () => {
      response = await requester.post("/").query(commonQueries).send(dto);
    });

    it("should return 400", () => {
      expect(response.status).toBe(400);
    });
  });

  describe("/1/ (GET)", () => {
    let response: Response;

    beforeEach(async () => {
      response = await requester.get("/1/").query(commonQueries);
    });

    it("should return 200", () => {
      expect(response.status).toBe(200);
    });

    it("should serialize and return the entity", () => {
      assertSerializedEntity(response.body, 1);
    });
  });

  describe.each`
    lookup   | code
    ${0}     | ${404}
    ${"str"} | ${400}
  `("/$lookup/ (GET)", ({ lookup, code }) => {
    let response: Response;

    beforeEach(async () => {
      response = await requester.get(`/${lookup}/`).query(commonQueries);
    });

    it(`should return ${code}`, () => {
      expect(response.status).toBe(code);
    });
  });

  describe("/1/ (PUT)", () => {
    let dto: CreateParentEntityDto;
    let response: Response;

    beforeEach(async () => {
      dto = { name: "updated", child1: 1, child2: 1 };
      response = await requester.put("/1/").send(dto).query(commonQueries);
    });

    it("should return 200", () => {
      expect(response.status).toBe(200);
    });

    it("should update the entity", async () => {
      const entity = await parentRepository.findOne(1);
      expect(entity?.name).toBe(dto.name);
    });

    it("should serialize and return the entity", () => {
      assertSerializedEntity(response.body, 1);
    });
  });

  describe.each`
    dto
    ${{}}
    ${{ name: "n" }}
  `("/1/ $dto (PUT)", ({ dto }) => {
    let response: Response;

    beforeEach(async () => {
      response = await requester.put("/1/").send(dto).query(commonQueries);
    });

    it("should return 400", () => {
      expect(response.status).toBe(400);
    });
  });

  describe.each`
    lookup   | code
    ${0}     | ${404}
    ${"put"} | ${400}
  `("/$lookup/ (PUT)", ({ lookup, code }) => {
    let dto: CreateParentEntityDto;
    let response: Response;

    beforeEach(async () => {
      dto = { name: "updated", child1: 1, child2: 1 };
      response = await requester
        .put(`/${lookup}/`)
        .send(dto)
        .query(commonQueries);
    });

    it(`should return ${code}`, () => {
      expect(response.status).toBe(code);
    });
  });

  describe("/1/ (PATCH)", () => {
    let dto: UpdateChildEntityDto;
    let response: Response;

    beforeEach(async () => {
      dto = { name: "updated" };
      response = await requester.patch("/1/").send(dto).query(commonQueries);
    });

    it("should return 200", () => {
      expect(response.status).toBe(200);
    });

    it("should update the entity", async () => {
      const entity = await parentRepository.findOne(1);
      expect(entity?.name).toBe(dto.name);
    });

    it("should serialize and return the entity", () => {
      assertSerializedEntity(response.body, 1);
    });
  });

  describe.each`
    dto
    ${{ name: 1 }}
  `("/1/ $dto (PATCH)", ({ dto }) => {
    let response: Response;

    beforeEach(async () => {
      response = await requester.patch("/1/").send(dto).query(commonQueries);
    });

    it("should return 400", () => {
      expect(response.status).toBe(400);
    });
  });

  describe.each`
    lookup   | code
    ${0}     | ${404}
    ${"str"} | ${400}
  `("/$lookup/ (PATCH)", ({ lookup, code }) => {
    let dto: UpdateChildEntityDto;
    let response: Response;

    beforeEach(async () => {
      dto = { name: "updated" };
      response = await requester
        .patch(`/${lookup}/`)
        .send(dto)
        .query(commonQueries);
    });

    it(`should return ${code}`, () => {
      expect(response.status).toBe(code);
    });
  });

  describe("/1/ (DELETE)", () => {
    let response: Response;

    beforeEach(async () => {
      response = await requester.delete("/1/").query(commonQueries);
    });

    it("should return 204", () => {
      expect(response.status).toBe(204);
    });

    it("should return no content", () => {
      expect(response.body).toEqual({});
    });
  });

  describe.each`
    lookup   | code
    ${0}     | ${404}
    ${"str"} | ${400}
  `("/$lookup/ (DELETE)", ({ lookup, code }) => {
    let response: Response;

    beforeEach(async () => {
      response = await requester.delete(`/${lookup}/`).query(commonQueries);
    });

    it(`should return ${code}`, () => {
      expect(response.status).toBe(code);
    });
  });
});
