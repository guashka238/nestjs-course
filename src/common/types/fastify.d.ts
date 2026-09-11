import 'fastify';

import { AuthenticatedUser } from './authenticated-user';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
