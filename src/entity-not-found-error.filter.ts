import { BaseExceptionFilter } from "@nestjs/core";
import { Catch, NotFoundException } from "@nestjs/common";
import { EntityNotFoundError } from "typeorm";

@Catch(EntityNotFoundError)
export class EntityNotFoundErrorFilter extends BaseExceptionFilter {
  catch(
    ...[exception, ...args]: Parameters<
      BaseExceptionFilter<EntityNotFoundErrorFilter>["catch"]
    >
  ) {
    super.catch(new NotFoundException(), ...args);
  }
}
