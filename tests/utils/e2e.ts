import { AnyEntity, EntityName, MikroORM } from "@mikro-orm/core";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { ModuleMetadata } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import supertest from "supertest";
import { Book, Page } from "tests/e2e/entities";
import { Summary } from "tests/e2e/entities/summary.entity";

export async function prepareE2E(
  metadata: ModuleMetadata,
  entities: EntityName<AnyEntity>[] = [],
  debug?: boolean
) {
  entities.push(Book, Page, Summary);

  const module = await Test.createTestingModule({
    ...metadata,
    imports: [
      MikroOrmModule.forRoot({
        type: "sqlite",
        dbName: ":memory:",
        entities,
        debug,
      }),
      MikroOrmModule.forFeature(entities),
      ...(metadata.imports ?? []),
    ],
  }).compile();

  const schemaGenerator = module.get(MikroORM).getSchemaGenerator();
  await schemaGenerator.execute(await schemaGenerator.generate());

  const app = await module.createNestApplication().init();
  const requester = supertest(app.getHttpServer());

  return { module, app, requester };
}
