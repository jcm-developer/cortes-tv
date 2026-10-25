/** Trusts the JWTs this deployment issues through Convex Auth. */
export default {
  providers: [{ domain: process.env.CONVEX_SITE_URL, applicationID: 'convex' }],
};
