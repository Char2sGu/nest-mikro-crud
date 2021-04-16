import { TypeOrmModule } from "@nestjs/typeorm";
import { EntityClassOrSchema } from "@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type";

export function getTypeOrmModules(...entities: EntityClassOrSchema[]) {
  return [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      autoLoadEntities: true,
      synchronize: true,
      keepConnectionAlive: true,
      entities,
    }),
    TypeOrmModule.forFeature(entities),
  ];
}
