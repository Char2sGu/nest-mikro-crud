import { AnyEntity } from "@mikro-orm/core";
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
import { FILTER_OPERATORS } from "..";
import { AbstractFactory } from "../abstract.factory";
import { FACTORY } from "../symbols";
import { OrderQueryParam } from "../types";
import { QueryDtoFactoryOptions } from "./query-dto-factory-options.interface";
import { QueryDto } from "./query-dto.interface";

const deduplicate = (arr: unknown[]) => [...new Set(arr)];

export class QueryDtoFactory<
  Entity extends AnyEntity<Entity> = any
> extends AbstractFactory<QueryDto<Entity>> {
  readonly options;
  readonly product;

  constructor(options: QueryDtoFactoryOptions<Entity>) {
    super();
    this.options = this.standardizeOptions(options);
    this.product = this.createRawClass();
    this.defineValidations();
    this.excludeDisabled();
    Reflect.defineMetadata(FACTORY, this, this.product);
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
    const { limit, offset, order, filter, expand } = this.options;

    type Interface = QueryDto<Entity>;
    return class QueryDto implements Interface {
      limit? = limit?.default;
      offset? = offset?.default;
      order? = order?.default;
      filter? = filter?.default;
      expand? = expand?.default;
    };
  }

  protected defineValidations() {
    const { limit, offset, order, filter, expand } = this.options;

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

    if (expand)
      this.defineType("expand", Array).applyPropertyDecorators(
        "expand",
        Type(() => String),
        IsOptional(),
        IsArray(),
        IsIn(expand.in, { each: true })
      );
  }

  protected excludeDisabled() {
    const names: (keyof QueryDtoFactoryOptions<Entity>)[] = [
      "order",
      "filter",
      "expand",
    ];
    for (const name of names)
      if (!this.options[name]) this.applyPropertyDecorators(name, Exclude());
  }
}
