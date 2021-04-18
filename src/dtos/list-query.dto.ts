import { Expose, Type } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

export class ListQueryDto {
  @Expose()
  @IsOptional()
  @IsNumber()
  @Type()
  limit?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type()
  offset?: number;
}
