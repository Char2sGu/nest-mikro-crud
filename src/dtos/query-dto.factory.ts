import { BaseEntity } from "@mikro-orm/core";
import { Exclude, Type } from "class-transformer";
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
import { FACTORY_METADATA_KEY, FILTER_OPERATORS } from "../constants";
import { OrderQueryParam } from "../types";
import { QueryDtoFactoryOptions } from "./query-dto-factory-options.interface";
import { QueryDto } from "./query-dto.interface";

const deduplicate = (arr: unknown[]) => [...new Set(arr)];

export class QueryDtoFactory<
  Entity extends BaseEntity<any, any> = any
> extends AbstractFactory<QueryDto<Entity>> {
  readonly options;
  readonly product;

  constructor(options: QueryDtoFactoryOptions<Entity>) {
    super();
    this.options = this.standardizeOptions(options);
    this.product = this.createRawClass();
    this.defineValidations();
    this.excludeDisabled();
    Reflect.defineMetadata(FACTORY_METADATA_KEY, this, this.product);
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
    const { limit, offset, order, filter } = this.options;

    type Interface = QueryDto<Entity>;
    return class QueryDto implements Interface {
      limit? = limit?.default;
      offset? = offset?.default;
      order? = order?.default;
      filter? = filter?.default;
    };
  }

  protected defineValidations() {
    const { limit, offset, order, filter } = this.options;

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
    const { order, filter } = this.options;
    if (!order) this.applyPropertyDecorators("order", Exclude());
    if (!filter) this.applyPropertyDecorators("filter", Exclude());
  }
}
