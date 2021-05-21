import { Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsString } from "class-validator";

export class CreateParentEntityDto {
  @Type()
  @IsOptional()
  @IsInt()
  id?: number;

  @IsString()
  name!: string;

  @IsArray()
  @IsInt({ each: true })
  children!: number[];
}
