import { Expose, Type } from "class-transformer";
import { IsNumber, IsOptional, Max, Min } from "class-validator";
import { AbstractFactory } from "../abstract.factory";
import { ListQueryDtoFactoryOptions } from "./list-query-dto-factory-options.interface";
import { ListQueryDto } from "./list-query-dto.interface";

export class ListQueryDtoFactory extends AbstractFactory<ListQueryDto> {
  readonly product;

  constructor(readonly options: ListQueryDtoFactoryOptions) {
    super();

    type Interface = ListQueryDto;
    this.product = class ListQueryDto implements Interface {
      limit? = options.limit?.default;
      offset? = options.offset?.default;
    };

    const commonDecorators = [
      Expose(),
      IsOptional(),
      IsNumber(),
      Type(() => Number),
      Min(1),
    ];

    this.applyPropertyDecorators(
      "limit",
      ...commonDecorators,
      ...(options.limit?.max ? [Max(options.limit.max)] : [])
    );
    this.applyPropertyDecorators(
      "offset",
      ...commonDecorators,
      ...(options.offset?.max ? [Max(options.offset.max)] : [])
    );
  }
}
