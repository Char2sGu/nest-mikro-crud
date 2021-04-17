import { Type } from "class-transformer";
import { IsNumber, IsNumberString, IsOptional } from "class-validator";

export class ListQueryDto {
  @IsOptional()
  @IsNumber()
  @Type()
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type()
  offset?: number;
}
