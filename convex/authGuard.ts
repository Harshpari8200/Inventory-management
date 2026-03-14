/**
 * Shared auth helper for Convex queries and mutations.
 * Import and call `await requireAuth(ctx)` at the top of any handler
 * that should be protected.
 */
import { authComponent } from "./auth";

export async function requireAuth(ctx: any) {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
        throw new Error("Unauthenticated — please log in.");
    }
    return user;
}

export async function requireManager(ctx: any) {
    const user = await requireAuth(ctx);
    if (user.role !== "manager") {
        throw new Error("Unauthorized — manager access required.");
    }
    return user;
}
