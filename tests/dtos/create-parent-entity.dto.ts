import { IsInt, IsString } from "class-validator";

export class CreateParentEntityDto {
  @IsString()
  name!: string;

  @IsInt()
  child!: number;
}
