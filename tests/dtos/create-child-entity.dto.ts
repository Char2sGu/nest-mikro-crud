import { IsString } from "class-validator";

export class CreateChildEntityDto {
  @IsString()
  name!: string;
}
