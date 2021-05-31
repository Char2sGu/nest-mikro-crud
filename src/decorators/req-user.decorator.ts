import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Default decorator to get the user from the request
 */
export const ReqUser = createParamDecorator<unknown, ExecutionContext>(
  (_, context) => context.switchToHttp().getRequest().user
);
