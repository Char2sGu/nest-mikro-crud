import { IsArray, IsInt, IsString } from "class-validator";

export class CreateParentEntityDto {
  @IsString()
  name!: string;

  @IsString()
  secret!: string;
}
