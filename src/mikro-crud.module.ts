import { Module } from "@nestjs/common";
import { QueryParser } from "./services/query-parser.service";

@Module({
  providers: [QueryParser],
  exports: [QueryParser],
})
export class MikroCrudModule {}
