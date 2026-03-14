/**
 * Re-export the betterAuth adapter utilities so the client can call them
 * through `api.users.*`.
 *
 * The register page calls `api.users.findMany` to check Login ID uniqueness.
 */
export { findMany } from "./betterAuth/adapter";
