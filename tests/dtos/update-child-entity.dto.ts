import { PartialType } from "@nestjs/mapped-types";
import { CreateChildEntityDto } from "./create-child-entity.dto";

export class UpdateChildEntityDto extends PartialType(CreateChildEntityDto) {}
