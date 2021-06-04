import { Controller, Injectable, Provider, Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  QueryDtoFactory,
  RestControllerFactory,
  RestServiceFactory,
} from "src";
import { Response } from "supertest";
import { getConnection, Repository } from "typeorm";
import { CreateParentEntityDto, UpdateParentEntityDto } from "./dtos";
import { ChildEntity, ParentEntity } from "./entities";
import { getRequester, getTypeOrmModules } from "./utils";

describe("E2E", () => {
  let parentRepository: Repository<ParentEntity>;
  let childRepository: Repository<ChildEntity>;
  let requester: ReturnType<typeof getRequester>;
  let response: Response;
  let createParentDto: CreateParentEntityDto;
  let updateParentDto: UpdateParentEntityDto;
  let entity: ParentEntity;

  @Injectable()
  class TestService extends new RestServiceFactory({
    entityClass: ParentEntity,
    dtoClasses: {
      create: CreateParentEntityDto,
      update: UpdateParentEntityDto,
    },
  }).product {}

  async function prepare(serviceClass: Provider, controllerClass: Type) {
    const module = await Test.createTestingModule({
      imports: [...getTypeOrmModules(ParentEntity, ChildEntity)],
      controllers: [controllerClass],
      providers: [serviceClass],
    }).compile();

    const app = await module.createNestApplication().init();

    parentRepository = module.get(getRepositoryToken(ParentEntity));
    childRepository = module.get(getRepositoryToken(ChildEntity));
    requester = getRequester(app);

    for (let i = 1; i <= 5; i++)
      await parentRepository.save({
        name: "parent" + i,
        secret: "secret",
      });
  }

  function assertEntityFieldTypes({
    entity,
    expand = false,
  }: {
    entity: ParentEntity;
    expand?: boolean;
  }) {
    expect(typeof entity.id).toBe("number");
    expect(typeof entity.name).toBe("string");
    expect(entity.secret).toBeUndefined();
    entity.children.forEach((child) => {
      if (!expand) expect(typeof child).toBe("number");
      else {
        expect(typeof child.id).toBe("number");
        expect(typeof child.name).toBe("string");
        expect(child.parent).toBeUndefined();
      }
    });
  }

  afterEach(async () => {
    await getConnection().close();
  });

  describe("Basic CRUD", () => {
    @Controller()
    class TestController extends new RestControllerFactory<TestService>({
      restServiceClass: TestService,
      actions: ["list", "retrieve", "create", "replace", "update", "destroy"],
      lookup: { field: "id" },
    }).product {}

    beforeEach(async () => {
      await prepare(TestService, TestController);
    });

    describe("/ (GET)", () => {
      describe("Common", () => {
        beforeEach(async () => {
          response = await requester.get("/");
        });

        it("should return status 200", () => {
          expect(response.status).toBe(200);
        });

        it("should show the total is 5", () => {
          expect(response.body.total).toBe(5);
        });

        it(`should return 5 transformed entities`, () => {
          expect(response.body.results).toHaveLength(5);
          response.body.results.forEach((entity: ParentEntity) =>
            assertEntityFieldTypes({ entity })
          );
        });
      });
    });

    describe("/ (POST)", () => {
      describe("Common", () => {
        beforeEach(async () => {
          createParentDto = { name: "new", secret: "secret" };
          response = await requester.post("/").send(createParentDto);
          entity = response.body;
        });

        it("should return status 201", () => {
          expect(response.status).toBe(201);
        });

        it("should return a transformed entity", () => {
          assertEntityFieldTypes({ entity });
          expect(entity.name).toBe(createParentDto.name);
        });
      });

      describe.each`
        data
        ${{}}
        ${{ name: 1 }}
      `("Illegal Data: $data", ({ data }) => {
        beforeEach(async () => {
          response = await requester.post("/").send(data);
        });

        it("should return status 400", () => {
          expect(response.status).toBe(400);
        });
      });
    });

    describe("/:lookup/ (GET)", () => {
      describe("Common", () => {
        beforeEach(async () => {
          response = await requester.get("/1/");
          entity = response.body;
        });

        it("should return status 200", () => {
          expect(response.status).toBe(200);
        });

        it("should return an serialized entity", () => {
          assertEntityFieldTypes({ entity });
          expect(entity.id).toBe(1);
        });
      });

      describe.each`
        lookup   | code
        ${0}     | ${404}
        ${"str"} | ${400}
      `("Illegal Lookup: $lookup", ({ lookup, code }) => {
        beforeEach(async () => {
          response = await requester.get(`/${lookup}/`);
        });

        it(`should return status ${code}`, () => {
          expect(response.status).toBe(code);
        });
      });
    });

    describe("/:lookup/ (PUT)", () => {
      beforeEach(() => {
        createParentDto = { name: "updated", secret: "secret" };
      });

      describe("Common", () => {
        beforeEach(async () => {
          response = await requester.put("/1/").send(createParentDto);
          entity = response.body;
        });

        it("should return status 200", () => {
          expect(response.status).toBe(200);
        });

        it("should return a transformed entity", () => {
          assertEntityFieldTypes({ entity });
          expect(entity.name).toBe(createParentDto.name);
        });
      });

      describe.each`
        data
        ${{}}
        ${{ name: "n" }}
      `("Illegal Data: $data", ({ data }) => {
        beforeEach(async () => {
          response = await requester.put("/1/").send(data);
        });

        it("should return status 400", () => {
          expect(response.status).toBe(400);
        });
      });

      describe.each`
        lookup   | code
        ${0}     | ${404}
        ${"put"} | ${400}
      `("Illegal Lookup: $lookup", ({ lookup, code }) => {
        beforeEach(async () => {
          response = await requester.put(`/${lookup}/`).send(createParentDto);
        });

        it(`should return status ${code}`, () => {
          expect(response.status).toBe(code);
        });
      });
    });

    describe("/:lookup/ (PATCH)", () => {
      beforeEach(() => {
        updateParentDto = { name: "updated" };
      });

      describe("Common", () => {
        beforeEach(async () => {
          response = await requester.patch("/1/").send(updateParentDto);
          entity = response.body;
        });

        it("should return status 200", () => {
          expect(response.status).toBe(200);
        });

        it("should return a transformed entity", () => {
          assertEntityFieldTypes({ entity });
          expect(entity.name).toBe(updateParentDto.name);
        });
      });

      describe.each`
        data
        ${{ name: 1 }}
      `("Illegal Data: $data", ({ data }) => {
        beforeEach(async () => {
          response = await requester.patch("/1/").send(data);
        });

        it("should return status 400", () => {
          expect(response.status).toBe(400);
        });
      });

      describe.each`
        lookup   | code
        ${0}     | ${404}
        ${"str"} | ${400}
      `("Illegal Lookup: $lookup", ({ lookup, code }) => {
        beforeEach(async () => {
          response = await requester.patch(`/${lookup}/`).send(updateParentDto);
        });

        it(`should return status ${code}`, () => {
          expect(response.status).toBe(code);
        });
      });
    });

    describe("/:lookup/ (DELETE)", () => {
      describe("Common", () => {
        beforeEach(async () => {
          response = await requester.delete("/1/");
        });

        it("should return status 204", () => {
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
      `("Illegal Lookup: $lookup", ({ lookup, code }) => {
        beforeEach(async () => {
          response = await requester.delete(`/${lookup}/`);
        });

        it(`should return status ${code}`, () => {
          expect(response.status).toBe(code);
        });
      });
    });
  });

  describe("Query Params", () => {
    describe("Limit & Offset", () => {
      @Controller()
      class TestController extends new RestControllerFactory<TestService>({
        restServiceClass: TestService,
        actions: ["list"],
        lookup: { field: "id" },
        queryDtoClass: new QueryDtoFactory<ParentEntity>({
          limit: { max: 3, default: 1 },
          offset: { max: 2, default: 1 },
        }).product,
      }).product {}

      beforeEach(async () => {
        await prepare(TestService, TestController);
      });

      describe("/ (GET)", () => {
        describe.each`
          queries          | count | firstId
          ${{}}            | ${1}  | ${2}
          ${{ limit: 2 }}  | ${2}  | ${2}
          ${{ offset: 2 }} | ${1}  | ${3}
        `("Common Queries: $queries", ({ queries, count, firstId }) => {
          beforeEach(async () => {
            response = await requester.get("/").query(queries);
          });

          it(`should make the results have length ${count} `, () => {
            expect(response.body.results).toHaveLength(count);
          });

          it(`should make the first id ${firstId}`, () => {
            entity = response.body.results[0];
            expect(entity.id).toBe(firstId);
          });
        });

        describe.each`
          queries
          ${{ limit: 0 }}
          ${{ limit: -1 }}
          ${{ limit: 4 }}
          ${{ offset: 0 }}
          ${{ offset: -1 }}
          ${{ offset: 3 }}
        `("Illegal Queries: $queries", ({ queries }) => {
          beforeEach(async () => {
            response = await requester.get("/").query(queries);
          });

          it(`should return status 400`, () => {
            expect(response.status).toBe(400);
          });
        });
      });
    });

    describe("Order", () => {
      @Controller()
      class TestController extends new RestControllerFactory<TestService>({
        restServiceClass: TestService,
        actions: ["list"],
        lookup: { field: "id" },
        queryDtoClass: new QueryDtoFactory<ParentEntity>({
          order: { in: ["id:desc", "name:desc"], default: ["id:desc"] },
        }).product,
      }).product {}

      beforeEach(async () => {
        await prepare(TestService, TestController);
      });

      describe("/ (GET)", () => {
        describe.each`
          order            | firstId
          ${undefined}     | ${5}
          ${["id:desc"]}   | ${5}
          ${["name:desc"]} | ${5}
        `("Legal Order: $order", ({ order, firstId }) => {
          beforeEach(async () => {
            response = await requester.get("/").query({ "order[]": order });
            entity = response.body.results[0];
          });

          it(`should make the first id ${firstId}`, () => {
            expect(entity.id).toBe(firstId);
          });
        });

        describe.each`
          queries
          ${{ order: ["id:desc"] }}
          ${{ "order[]": ["id:xxxx"] }}
        `("Illegal Order: $queries", ({ queries }) => {
          beforeEach(async () => {
            response = await requester.get("/").query(queries);
          });

          it("should returns status 400", () => {
            expect(response.status).toBe(400);
          });
        });
      });
    });

    describe("Expand", () => {
      @Controller()
      class TestController extends new RestControllerFactory<TestService>({
        restServiceClass: TestService,
        actions: ["list", "create", "retrieve", "replace", "update", "destroy"],
        lookup: { field: "id" },
        queryDtoClass: new QueryDtoFactory<ParentEntity>({
          expand: { in: ["children"], default: ["children"] },
        }).product,
      }).product {}

      beforeEach(async () => {
        await prepare(TestService, TestController);
        createParentDto = { name: "new", secret: "secret" };
        updateParentDto = { name: "updated" };

        for (let i = 1; i <= 5; i++)
          await childRepository.save({
            parent: i as any,
            name: "child" + i,
          });
      });

      describe.each`
        description             | getResponse                                                                     | getEntity
        ${"/ (GET)"}            | ${(queries: {}) => requester.get("/").query(queries)}                           | ${(response: Response) => response.body.results[0]}
        ${"/ (POST)"}           | ${(queries: {}) => requester.post("/").query(queries).send(createParentDto)}    | ${(response: Response) => response.body}
        ${"/:lookup/ (GET)"}    | ${(queries: {}) => requester.get("/1/").query(queries)}                         | ${(response: Response) => response.body}
        ${"/:lookup/ (PUT))"}   | ${(queries: {}) => requester.put("/1/").query(queries).send(createParentDto)}   | ${(response: Response) => response.body}
        ${"/:lookup/ (PATCH))"} | ${(queries: {}) => requester.patch("/1/").query(queries).send(updateParentDto)} | ${(response: Response) => response.body}
      `("$description", ({ getResponse, getEntity }) => {
        describe.each`
          expand
          ${undefined}
          ${["children"]}
        `("Legal Expand: $expand", ({ expand }) => {
          beforeEach(async () => {
            response = await getResponse({ "expand[]": expand });
            entity = getEntity(response);
          });

          it("should expand the field", () => {
            assertEntityFieldTypes({ entity, expand: true });
          });
        });

        describe.each`
          queries
          ${{ expand: ["children"] }}
          ${{ "expand[]": ["xxxxx"] }}
        `("Illegal Expand: $queries", ({ queries }) => {
          beforeEach(async () => {
            response = await getResponse(queries);
          });

          it("should return status 400", () => {
            expect(response.status).toBe(400);
          });
        });
      });
    });

    describe("Filter", () => {
      @Controller()
      class TestController extends new RestControllerFactory<TestService>({
        restServiceClass: TestService,
        actions: ["list"],
        lookup: { field: "id" },
        queryDtoClass: new QueryDtoFactory<ParentEntity>({
          filter: { in: ["id", "name"], default: ["name|eq:parent3"] },
        }).product,
      }).product {}

      beforeEach(async () => {
        await prepare(TestService, TestController);
      });

      describe("/ (GET)", () => {
        describe.each`
          filter                            | count | firstId
          ${undefined}                      | ${1}  | ${3}
          ${["id|eq:"]}                     | ${0}  | ${undefined}
          ${["id|eq:2"]}                    | ${1}  | ${2}
          ${["id|gt:2"]}                    | ${3}  | ${3}
          ${["name|gt:parent2"]}            | ${3}  | ${3}
          ${["id|gte:2"]}                   | ${4}  | ${2}
          ${["name|gte:parent2"]}           | ${4}  | ${2}
          ${["name|in:"]}                   | ${0}  | ${undefined}
          ${["name|in:parent2,parent3"]}    | ${2}  | ${2}
          ${["id|lt:3"]}                    | ${2}  | ${1}
          ${["name|lt:parent3"]}            | ${2}  | ${1}
          ${["id|lte:3"]}                   | ${3}  | ${1}
          ${["name|lte:parent3"]}           | ${3}  | ${1}
          ${["id|ne:"]}                     | ${5}  | ${1}
          ${["id|ne:1"]}                    | ${4}  | ${2}
          ${["id|nin:1,2"]}                 | ${3}  | ${3}
          ${["name|like:parent%"]}          | ${5}  | ${1}
          ${["name|like:%rent5"]}           | ${1}  | ${5}
          ${["name|like:%rent5"]}           | ${1}  | ${5}
          ${["name|isnull:"]}               | ${0}  | ${undefined}
          ${["name|notnull:"]}              | ${5}  | ${1}
          ${["id|gt:1", "name|ne:parent2"]} | ${3}  | ${3}
        `("Legal Filter: $filter", ({ filter, count, firstId }) => {
          beforeEach(async () => {
            response = await requester.get("/").query({ "filter[]": filter });
          });

          it(`should make the results have length ${count}`, () => {
            expect(response.body.results).toHaveLength(count);
          });

          it(`should make the first id ${firstId}`, () => {
            entity = response.body.results[0];
            expect(entity?.id).toBe(firstId);
          });
        });
      });
    });
  });
});
