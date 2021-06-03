import { Exclude, Transform, Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
} from "class-validator";
import { AbstractFactory } from "../abstract.factory";
import { FILTER_OPERATORS } from "../constants";
import { OrderQueryParam, RelationPath } from "../types";
import { QueryDtoFactoryOptions } from "./query-dto-factory-options.interface";
import { QueryDto } from "./query-dto.interface";

const deduplicate = (arr: unknown[]) => [...new Set(arr)];

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
    const { order } = options;

    return {
      ...options,
      order: order
        ? {
            ...order,
            in: deduplicate(
              order.in.flatMap((v) =>
                v.includes(":") ? v : [`${v}:asc`, `${v}:desc`]
              )
            ) as OrderQueryParam<Entity>[],
          }
        : undefined,
    };
  }

  protected createRawClass() {
    const { limit, offset, expand, order, filter } = this.options;

    type Interface = QueryDto<Entity>;
    return class QueryDto implements Interface {
      limit? = limit?.default;
      offset? = offset?.default;
      expand? = expand?.default;
      order? = order?.default;
      filter? = filter?.default;
    };
  }

  protected defineValidations() {
    const { limit, offset, expand, order, filter } = this.options;

    if (limit)
      this.defineType("limit", Number).applyPropertyDecorators(
        "limit",
        Type(() => Number),
        IsOptional(),
        IsNumber(),
        Min(1),
        ...(limit.max ? [Max(limit.max)] : [])
      );

    if (offset)
      this.defineType("offset", Number).applyPropertyDecorators(
        "offset",
        Type(() => Number),
        IsOptional(),
        IsNumber(),
        Min(1),
        ...(offset.max ? [Max(offset.max)] : [])
      );

    if (expand)
      this.defineType("expand", Array).applyPropertyDecorators(
        "expand",
        Type(() => String),
        IsOptional(),
        IsArray(),
        IsIn(expand.in, { each: true })
      );

    if (order)
      this.defineType("order", Array).applyPropertyDecorators(
        "order",
        Type(() => String),
        IsOptional(),
        IsArray(),
        IsIn(order.in, { each: true })
      );

    if (filter)
      this.defineType("filter", Array).applyPropertyDecorators(
        "filter",
        Type(() => String),
        IsOptional(),
        IsArray(),
        Matches(
          `^(${filter.in.join("|")})\\|(${FILTER_OPERATORS.join("|")}):.*$`,
          undefined,
          { each: true }
        )
      );
  }

  protected excludeDisabled() {
    const { expand, order, filter } = this.options;
    if (!expand) this.applyPropertyDecorators("expand", Exclude());
    if (!order) this.applyPropertyDecorators("order", Exclude());
    if (!filter) this.applyPropertyDecorators("filter", Exclude());
  }
}
