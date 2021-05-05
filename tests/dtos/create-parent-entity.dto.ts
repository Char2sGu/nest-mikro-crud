import { IsInt, IsString } from "class-validator";

export class CreateParentEntityDto {
  @IsString()
  name!: string;

  @IsInt()
  child1!: number;

  @IsInt()
  child2!: number;
}
