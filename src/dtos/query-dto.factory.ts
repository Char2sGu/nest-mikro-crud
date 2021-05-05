import { Type } from "class-transformer";
import { IsIn, IsNumber, IsOptional, Max, Min } from "class-validator";
import { AbstractFactory } from "../abstract.factory";
import { QueryDtoFactoryOptions } from "./query-dto-factory-options.interface";
import { QueryDto } from "./query-dto.interface";

export class QueryDtoFactory<Entity> extends AbstractFactory<QueryDto<Entity>> {
  readonly product;

  constructor(readonly options: QueryDtoFactoryOptions<Entity>) {
    super();

    type Interface = QueryDto<Entity>;
    this.product = class QueryDto implements Interface {
      limit? = options.limit?.default;
      offset? = options.offset?.default;
      expand = [];
    };

    const commonDecorators = [IsOptional()];
    const numericDecorators = [IsNumber(), Type(), Min(1)];

    this.defineTypeMetadata("limit", Number);
    this.applyPropertyDecorators(
      "limit",
      ...commonDecorators,
      ...numericDecorators,
      ...(options.limit?.max ? [Max(options.limit.max)] : [])
    );

    this.defineTypeMetadata("offset", Number);
    this.applyPropertyDecorators(
      "offset",
      ...commonDecorators,
      ...numericDecorators,
      ...(options.offset?.max ? [Max(options.offset.max)] : [])
    );

    this.defineTypeMetadata("expand", Array);
    this.applyPropertyDecorators(
      "expand",
      ...commonDecorators,
      Type((type) => String),
      IsIn(options.expand?.in ?? [], { each: true })
    );
  }
}
