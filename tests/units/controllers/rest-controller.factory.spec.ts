import { Inject } from "@nestjs/common";
import {
  QueryDtoFactory,
  Resolved,
  RestController,
  RestControllerFactory,
  RestService,
  RestServiceFactoryOptions,
  REST_FACTORY_OPTIONS_METADATA_KEY,
} from "src";
import { buildKeyChecker, m } from "tests/utils";
import { Entity, PrimaryGeneratedColumn, Repository } from "typeorm";

jest.mock("@nestjs/common", () => ({
  ...jest.requireActual("@nestjs/common"),
  Body: jest.fn().mockReturnValue(jest.fn()),
  Delete: jest.fn().mockReturnValue(jest.fn()),
  Get: jest.fn().mockReturnValue(jest.fn()),
  Inject: jest.fn().mockReturnValue(jest.fn()),
  Param: jest.fn().mockReturnValue(jest.fn()),
  Patch: jest.fn().mockReturnValue(jest.fn()),
  Post: jest.fn().mockReturnValue(jest.fn()),
  Put: jest.fn().mockReturnValue(jest.fn()),
  Query: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock("src/dtos/query-dto.factory", () => ({
  QueryDtoFactory: jest.fn(() => ({
    product: class {},
  })),
}));

describe(RestControllerFactory.name, () => {
  const d = buildKeyChecker<RestControllerFactory>();

  @Entity()
  class TestEntity {
    @PrimaryGeneratedColumn()
    id!: number;
  }

  const entity: TestEntity = Object.create(TestEntity.prototype, {
    id: { value: 1 },
  });
  const entities = [entity];

  const testServiceOptions: RestServiceFactoryOptions<TestEntity> = {
    entityClass: TestEntity,
    dtoClasses: { create: TestEntity, update: TestEntity },
    lookupField: "id",
  };

  const testService: RestService = {
    repository: new Repository(),
    list: jest.fn(async () => ({ total: 1, results: entities })),
    create: jest.fn(async () => entity),
    retrieve: jest.fn(async () => entity),
    replace: jest.fn(async () => entity),
    update: jest.fn(async () => entity),
    destroy: jest.fn(async () => entity),
    checkPermission: jest.fn(),
    transform: jest.fn(async (v) => v.entity),
    finalizeQueryConditions: jest.fn(async () => [{}]),
    parseFieldExpansions: jest.fn(async () => ({
      relations: [],
      loadRelationIds: { relations: [] },
    })),
    parseOrders: jest.fn(async () => ({})),
    parseFilters: jest.fn(async () => ({})),
    parseFilterOperator: jest.fn(async () => null as any),
  };
  const TestService = jest.fn(() => testService);
  Reflect.defineMetadata(
    REST_FACTORY_OPTIONS_METADATA_KEY,
    testServiceOptions,
    TestService
  );

  let factory: RestControllerFactory;

  beforeEach(() => {
    factory = new RestControllerFactory({
      restServiceClass: TestService,
      actions: ["list", "create", "retrieve", "replace", "update", "destroy"],
    });
  });

  it("should process the options and expose it", () => {
    expect(QueryDtoFactory).toHaveBeenCalled();
    expect(factory.options.queryDto).toBeDefined();
    expect(factory.options.lookupParam).toBeDefined();
    expect(factory.options.validationPipeOptions).toBeDefined();
    expect(factory.options.validationPipeOptions.transform).toBe(true);
    expect(
      factory.options.validationPipeOptions.transformOptions
        ?.exposeDefaultValues
    ).toBe(true);
  });

  it("should expose the service's options", () => {
    expect(factory.serviceOptions).toBe(testServiceOptions);
  });

  it("should expose the lookup type", () => {
    expect(factory.lookupType).toBe(Number);
  });

  describe(d(".product"), () => {
    const d = buildKeyChecker<RestController>();

    let controller: RestController;

    beforeEach(() => {
      controller = new factory.product();
      // @ts-expect-error - manual injection
      controller.service = new TestService();
    });
  });

  it("should define the options as metadata on the product", () => {
    const metadata = Reflect.getMetadata(
      REST_FACTORY_OPTIONS_METADATA_KEY,
      factory.product
    );
    expect(metadata).toBeDefined();
  });

  it("should apply dependency injection of the service", () => {
    expect(Inject).toHaveBeenCalledWith(TestService);
    expect(m(Inject).mock.results[0].value).toHaveBeenCalledWith(
      factory.product.prototype,
      "service"
    );
  });
});
