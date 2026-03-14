import { query } from "./_generated/server";

export const getVerifications = query({
    handler: async (ctx) => {
        const items = await ctx.db.query("verification").order("desc").take(5);
        return items.map(i => ({
            id: i._id,
            identifier: i.identifier,
            value: i.value,
            expiresAt: i.expiresAt,
            createdAt: i.createdAt
        }));
    },
});
