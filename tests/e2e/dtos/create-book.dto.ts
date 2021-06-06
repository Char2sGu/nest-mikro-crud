import { Type } from "class-transformer";
import { IsArray, IsInt, IsString } from "class-validator";

export class CreateBookDto {
  @IsString()
  name!: string;

  @Type()
  @IsInt()
  price!: number;
}
