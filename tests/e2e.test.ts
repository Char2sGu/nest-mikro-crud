import { EntityRepository, MikroORM } from "@mikro-orm/core";
import { getRepositoryToken, MikroOrmModule } from "@mikro-orm/nestjs";
import { Controller, Injectable, Provider, Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  MikroCrudControllerFactory,
  MikroCrudServiceFactory,
  QueryDtoFactory,
} from "src";
import { Response } from "supertest";
import { CreateBookDto, UpdateParentEntityDto } from "./dtos";
import { Book, Page } from "./entities";
import { getRequester } from "./utils";

describe("E2E", () => {
  let bookRepository: EntityRepository<Book>;
  let requester: ReturnType<typeof getRequester>;
  let response: Response;
  let createBookDto: CreateBookDto;
  let updateBookDto: UpdateParentEntityDto;
  let entity: Book;

  @Injectable()
  class TestService extends new MikroCrudServiceFactory({
    entityClass: Book,
    dtoClasses: {
      create: CreateBookDto,
      update: UpdateParentEntityDto,
    },
  }).product {}

  async function prepare(serviceClass: Provider, controllerClass: Type) {
    const module = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot({
          type: "sqlite",
          dbName: ":memory:",
          entities: [Book, Page],
        }),
        MikroOrmModule.forFeature([Book, Page]),
      ],
      controllers: [controllerClass],
      providers: [serviceClass],
    }).compile();

    const app = await module.createNestApplication().init();

    await module.get(MikroORM).getSchemaGenerator().createSchema();
    bookRepository = module.get(getRepositoryToken(Book));
    requester = getRequester(app);

    for (let i = 1; i <= 5; i++) {
      const entity = new Book().assign({
        name: "parent" + i,
        price: i,
      });
      await bookRepository.persistAndFlush(entity);
    }
  }

  function assertEntityFieldTypes({ entity }: { entity: Book }) {
    expect(typeof entity.id).toBe("number");
    expect(typeof entity.name).toBe("string");
    expect(entity.price).toBeUndefined();
  }

  describe("Basic CRUD", () => {
    @Controller()
    class TestController extends new MikroCrudControllerFactory<TestService>({
      serviceClass: TestService,
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
          response.body.results.forEach((entity: Book) =>
            assertEntityFieldTypes({ entity })
          );
        });
      });
    });

    describe("/ (POST)", () => {
      describe("Common", () => {
        beforeEach(async () => {
          createBookDto = { name: "new", price: 123 };
          response = await requester.post("/").send(createBookDto);
          entity = response.body;
        });

        it("should return status 201", () => {
          expect(response.status).toBe(201);
        });

        it("should return a transformed entity", () => {
          assertEntityFieldTypes({ entity });
          expect(entity.name).toBe(createBookDto.name);
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
        createBookDto = { name: "updated", price: 123 };
      });

      describe("Common", () => {
        beforeEach(async () => {
          response = await requester.put("/1/").send(createBookDto);
          entity = response.body;
        });

        it("should return status 200", () => {
          expect(response.status).toBe(200);
        });

        it("should return a transformed entity", () => {
          assertEntityFieldTypes({ entity });
          expect(entity.name).toBe(createBookDto.name);
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
          response = await requester.put(`/${lookup}/`).send(createBookDto);
        });

        it(`should return status ${code}`, () => {
          expect(response.status).toBe(code);
        });
      });
    });

    describe("/:lookup/ (PATCH)", () => {
      beforeEach(() => {
        updateBookDto = { name: "updated" };
      });

      describe("Common", () => {
        beforeEach(async () => {
          response = await requester.patch("/1/").send(updateBookDto);
          entity = response.body;
        });

        it("should return status 200", () => {
          expect(response.status).toBe(200);
        });

        it("should return a transformed entity", () => {
          assertEntityFieldTypes({ entity });
          expect(entity.name).toBe(updateBookDto.name);
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
          response = await requester.patch(`/${lookup}/`).send(updateBookDto);
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

  describe("Disabled Actions", () => {
    @Controller()
    class TestController extends new MikroCrudControllerFactory({
      serviceClass: TestService,
      actions: [],
      lookup: { field: "id" },
    }).product {}

    beforeEach(async () => {
      await prepare(TestService, TestController);
    });

    describe("/ (GET)", () => {
      beforeEach(async () => {
        response = await requester.get("/");
      });

      it("should return status 404", () => {
        expect(response.status).toBe(404);
      });
    });
  });

  describe("Query Params", () => {
    describe("Limit & Offset", () => {
      @Controller()
      class TestController extends new MikroCrudControllerFactory<TestService>({
        serviceClass: TestService,
        actions: ["list"],
        lookup: { field: "id" },
        queryDtoClass: new QueryDtoFactory<Book>({
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
      class TestController extends new MikroCrudControllerFactory<TestService>({
        serviceClass: TestService,
        actions: ["list"],
        lookup: { field: "id" },
        queryDtoClass: new QueryDtoFactory<Book>({
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

    describe("Filter", () => {
      @Controller()
      class TestController extends new MikroCrudControllerFactory<TestService>({
        serviceClass: TestService,
        actions: ["list"],
        lookup: { field: "id" },
        queryDtoClass: new QueryDtoFactory<Book>({
          filter: { in: ["id", "name"], default: ["name|eq:parent3"] },
        }).product,
      }).product {}

      beforeEach(async () => {
        await prepare(TestService, TestController);
      });

      describe("/ (GET)", () => {
        describe.each`
          filter                         | count | firstId
          ${undefined}                   | ${1}  | ${3}
          ${["id|eq:"]}                  | ${0}  | ${undefined}
          ${["id|eq:2"]}                 | ${1}  | ${2}
          ${["id|gt:2"]}                 | ${3}  | ${3}
          ${["name|gt:parent2"]}         | ${3}  | ${3}
          ${["id|gte:2"]}                | ${4}  | ${2}
          ${["name|gte:parent2"]}        | ${4}  | ${2}
          ${["name|in:"]}                | ${0}  | ${undefined}
          ${["name|in:parent2,parent3"]} | ${2}  | ${2}
          ${["id|lt:3"]}                 | ${2}  | ${1}
          ${["name|lt:parent3"]}         | ${2}  | ${1}
          ${["id|lte:3"]}                | ${3}  | ${1}
          ${["name|lte:parent3"]}        | ${3}  | ${1}
          ${["id|ne:"]}                  | ${5}  | ${1}
          ${["id|ne:1"]}                 | ${4}  | ${2}
          ${["id|nin:1,2"]}              | ${3}  | ${3}
          ${["name|like:parent%"]}       | ${5}  | ${1}
          ${["name|like:%rent5"]}        | ${1}  | ${5}
          ${["name|like:%rent5"]}        | ${1}  | ${5}
          ${["name|isnull:"]}            | ${0}  | ${undefined}
          ${["name|notnull:"]}           | ${5}  | ${1}
          ${["id|gt:1", "id|lt:3"]}      | ${1}  | ${2}
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
