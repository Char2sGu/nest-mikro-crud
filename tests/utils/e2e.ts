import { AnyEntity, EntityName, MikroORM } from "@mikro-orm/core";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { ModuleMetadata } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import supertest from "supertest";

export async function prepareE2E(
  metadata: ModuleMetadata,
  entities: EntityName<AnyEntity>[]
) {
  const module = await Test.createTestingModule({
    ...metadata,
    imports: [
      MikroOrmModule.forRoot({
        type: "sqlite",
        dbName: ":memory:",
        entities,
      }),
      MikroOrmModule.forFeature(entities),
      ...(metadata.imports ?? []),
    ],
  }).compile();

  await module.get(MikroORM).getSchemaGenerator().createSchema();

  const app = await module.createNestApplication().init();
  const requester = supertest(app.getHttpServer());

  return { module, app, requester };
}
