import { Exclude, Type } from "class-transformer";
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
    this.product = this.createRawClass();
    this.defineValidations();
    this.excludeDisabled();
  }

  protected standardizeOptions(options: QueryDtoFactoryOptions<Entity>) {
    const { limit = {}, offset = {}, expand = {}, order = {} } = options;

    return {
      limit,
      offset,
      expand: {
        ...expand,
        in: expand.in ?? [],
      },
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

  protected createRawClass() {
    const { limit, offset, expand, order } = this.options;

    type Interface = QueryDto<Entity>;
    return class QueryDto implements Interface {
      limit? = limit.default;
      offset? = offset.default;
      expand? = expand.default;
      order? = order.default;
    };
  }

  protected defineValidations() {
    const { limit, offset, expand, order } = this.options;

    this.defineTypeMetadata("limit", Number)
      .applyPropertyDecorators(
        "limit",
        Type(() => Number),
        IsOptional(),
        IsNumber(),
        Min(1),
        ...(limit.max ? [Max(limit.max)] : [])
      )

      .defineTypeMetadata("offset", Number)
      .applyPropertyDecorators(
        "offset",
        Type(() => Number),
        IsOptional(),
        IsNumber(),
        Min(1),
        ...(offset.max ? [Max(offset.max)] : [])
      )

      .defineTypeMetadata("expand", Array)
      .applyPropertyDecorators(
        "expand",
        Type(() => String),
        IsOptional(),
        IsArray(),
        IsIn(expand.in, { each: true })
      )

      .defineTypeMetadata("order", Array)
      .applyPropertyDecorators(
        "order",
        Type(() => String),
        IsOptional(),
        IsArray(),
        IsIn(order.in, { each: true })
      );
  }

  protected excludeDisabled() {
    const { expand, order } = this.options;
    if (!expand.in.length) this.applyPropertyDecorators("expand", Exclude());
    if (!order.in.length) this.applyPropertyDecorators("order", Exclude());
  }
}
