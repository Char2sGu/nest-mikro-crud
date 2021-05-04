import { PartialType } from "@nestjs/mapped-types";
import { CreateParentEntityDto } from "./create-parent-entity.dto";

export class UpdateParentEntityDto extends PartialType(CreateParentEntityDto) {}
