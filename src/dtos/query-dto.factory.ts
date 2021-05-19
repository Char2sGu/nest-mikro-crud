import { Type } from "class-transformer";
import { IsArray, IsIn, IsNumber, IsOptional, Max, Min } from "class-validator";
import { AbstractFactory } from "../abstract.factory";
import { OrderQueryParam } from "../types";
import { QueryDtoFactoryOptions } from "./query-dto-factory-options.interface";
import { QueryDto } from "./query-dto.interface";

export class QueryDtoFactory<Entity> extends AbstractFactory<QueryDto<Entity>> {
  readonly options;
  readonly product;

  constructor(options: QueryDtoFactoryOptions<Entity>) {
    super();

    this.options = this.standardizeOptions(options);

    type Interface = QueryDto<Entity>;
    this.product = class QueryDto implements Interface {
      limit? = options.limit?.default;
      offset? = options.offset?.default;
      expand? = options.expand?.default;
      order? = options.order?.default;
    };

    const commonDecorators = [IsOptional()];
    const numericDecorators = [IsNumber(), Type(), Min(1)];

    this.defineTypeMetadata("limit", Number)
      .applyPropertyDecorators(
        "limit",
        ...commonDecorators,
        ...numericDecorators,
        ...(options.limit?.max ? [Max(options.limit.max)] : [])
      )

      .defineTypeMetadata("offset", Number)
      .applyPropertyDecorators(
        "offset",
        ...commonDecorators,
        ...numericDecorators,
        ...(options.offset?.max ? [Max(options.offset.max)] : [])
      )

      .defineTypeMetadata("expand", Array)
      .applyPropertyDecorators(
        "expand",
        ...commonDecorators,
        IsArray(),
        Type((type) => String),
        IsIn(options.expand?.in ?? [], { each: true })
      )

      .defineTypeMetadata("order", Array)
      .applyPropertyDecorators(
        "order",
        ...commonDecorators,
        IsArray(),
        Type((type) => String),
        IsIn(options.order?.in ?? [], { each: true })
      );
  }

  protected standardizeOptions(options: QueryDtoFactoryOptions<Entity>) {
    const { order } = options;

    return {
      ...options,
      order: {
        ...order,
        in: [
          ...new Set(
            order?.in?.flatMap((v) =>
              v.includes(":") ? v : [`${v}:asc`, `${v}:desc`]
            )
          ),
        ] as OrderQueryParam<Entity>[],
      },
    };
  }
}
