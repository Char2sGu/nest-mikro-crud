import { Type } from "class-transformer";
import { IsNumber, IsOptional, Max, Min } from "class-validator";
import { AbstractFactory } from "../abstract.factory";
import { QueryDtoFactoryOptions } from "./query-dto-factory-options.interface";
import { QueryDto } from "./query-dto.interface";

export class QueryDtoFactory extends AbstractFactory<QueryDto> {
  readonly product;

  constructor(readonly options: QueryDtoFactoryOptions) {
    super();

    type Interface = QueryDto;
    this.product = class QueryDto implements Interface {
      limit? = options.limit?.default;
      offset? = options.offset?.default;
    };

    const commonDecorators = [IsOptional(), IsNumber(), Type(), Min(1)];

    this.defineTypeMetadata("limit", Number);
    this.applyPropertyDecorators(
      "limit",
      ...commonDecorators,
      ...(options.limit?.max ? [Max(options.limit.max)] : [])
    );

    this.defineTypeMetadata("offset", Number);
    this.applyPropertyDecorators(
      "offset",
      ...commonDecorators,
      ...(options.offset?.max ? [Max(options.offset.max)] : [])
    );
  }
}
