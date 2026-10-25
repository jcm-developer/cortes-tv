/** HTTP routes: the Convex Auth endpoints (JWKS and OpenID configuration). */
import { httpRouter } from 'convex/server';
import { auth } from './auth';

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
