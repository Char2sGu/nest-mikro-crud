import { Type } from "class-transformer";
import { IsInt, IsString } from "class-validator";

export class CreateBookDto {
  @IsString()
  name!: string;

  @Type()
  @IsInt()
  price!: number;

  @Type()
  @IsInt()
  summary!: number;
}
