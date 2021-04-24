import { BaseExceptionFilter } from "@nestjs/core";
import { Catch, NotFoundException } from "@nestjs/common";
import { EntityNotFoundError } from "typeorm";

/**
 * Handle `EntityNotFoundError` as `NotFoundException`
 */
@Catch(EntityNotFoundError)
export class EntityNotFoundErrorFilter extends BaseExceptionFilter {
  catch(
    ...[exception, ...args]: Parameters<
      BaseExceptionFilter<EntityNotFoundError>["catch"]
    >
  ) {
    super.catch(new NotFoundException(), ...args);
  }
}
