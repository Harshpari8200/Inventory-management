import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireManager } from "./authGuard";

// ─── Product CRUD ──────────────────────────────────────────────────────────────

export const createProduct = mutation({
    args: {
        name: v.string(),
        sku: v.string(),
        categoryId: v.optional(v.id("categories")),
        unit: v.string(),
        reorderLevel: v.number(),
    },
    handler: async (ctx, args) => {
        await requireManager(ctx);
        const now = Date.now();
        // SKU uniqueness check
        const existing = await ctx.db.query("products")
            .withIndex("by_sku", (q) => q.eq("sku", args.sku))
            .first();
        if (existing) throw new Error("A product with this SKU already exists");

        return ctx.db.insert("products", {
            name: args.name,
            sku: args.sku,
            categoryId: args.categoryId,
            unit: args.unit,
            reorderLevel: args.reorderLevel,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const updateProduct = mutation({
    args: {
        id: v.id("products"),
        name: v.optional(v.string()),
        sku: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        unit: v.optional(v.string()),
        reorderLevel: v.optional(v.number()),
    },
    handler: async (ctx, { id, ...updates }) => {
        await requireManager(ctx);
        // If SKU is changing, check uniqueness
        if (updates.sku) {
            const existing = await ctx.db.query("products")
                .withIndex("by_sku", (q) => q.eq("sku", updates.sku!))
                .first();
            if (existing && existing._id !== id) throw new Error("A product with this SKU already exists");
        }

        const patch: Record<string, any> = { updatedAt: Date.now() };
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.sku !== undefined) patch.sku = updates.sku;
        if (updates.categoryId !== undefined) patch.categoryId = updates.categoryId;
        if (updates.unit !== undefined) patch.unit = updates.unit;
        if (updates.reorderLevel !== undefined) patch.reorderLevel = updates.reorderLevel;

        await ctx.db.patch(id, patch);
    },
});

export const deleteProduct = mutation({
    args: { id: v.id("products") },
    handler: async (ctx, { id }) => {
        await requireManager(ctx);
        // Remove associated stock
        const stocks = await ctx.db.query("stock")
            .withIndex("by_product", (q) => q.eq("productId", id))
            .collect();
        for (const s of stocks) await ctx.db.delete(s._id);
        await ctx.db.delete(id);
    },
});

// ─── Category CRUD ────────────────────────────────────────────────────────────

export const createCategory = mutation({
    args: { name: v.string(), description: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await requireManager(ctx);
        const existing = await ctx.db.query("categories")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .first();
        if (existing) throw new Error("Category already exists");
        return ctx.db.insert("categories", { ...args, createdAt: Date.now() });
    },
});

export const updateCategory = mutation({
    args: { id: v.id("categories"), name: v.optional(v.string()), description: v.optional(v.string()) },
    handler: async (ctx, { id, ...updates }) => {
        await requireManager(ctx);
        const patch: Record<string, any> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.description !== undefined) patch.description = updates.description;
        await ctx.db.patch(id, patch);
    },
});

export const deleteCategory = mutation({
    args: { id: v.id("categories") },
    handler: async (ctx, { id }) => {
        await requireManager(ctx);
        // Remove category from products
        const products = await ctx.db.query("products")
            .withIndex("by_category", (q) => q.eq("categoryId", id))
            .collect();
        for (const p of products) await ctx.db.patch(p._id, { categoryId: undefined });
        await ctx.db.delete(id);
    },
});

// ─── Stock by Location ────────────────────────────────────────────────────────

export const getStockByLocation = query({
    args: {},
    handler: async (ctx) => {
        await requireAuth(ctx);
        const locations = await ctx.db.query("locations").collect();
        const allStock = await ctx.db.query("stock").collect();
        const products = await ctx.db.query("products").collect();

        const productMap: Record<string, { name: string; sku: string; unit: string; reorderLevel: number }> = {};
        for (const p of products) {
            productMap[p._id] = { name: p.name, sku: p.sku, unit: p.unit, reorderLevel: p.reorderLevel };
        }

        return locations.map((loc) => {
            const stocks = allStock.filter((s) => s.locationId === loc._id);
            const items = stocks.map((s) => {
                const prod = productMap[s.productId];
                const status: "empty" | "low" | "ok" | "full" =
                    s.quantity === 0 ? "empty" :
                        prod && s.quantity <= prod.reorderLevel ? "low" :
                            prod && s.quantity >= prod.reorderLevel * 3 ? "full" : "ok";
                return {
                    stockId: s._id,
                    productId: s.productId,
                    productName: prod?.name ?? "Unknown",
                    sku: prod?.sku ?? "—",
                    unit: prod?.unit ?? "—",
                    quantity: s.quantity,
                    reorderLevel: prod?.reorderLevel ?? 0,
                    status,
                };
            });
            return {
                _id: loc._id,
                name: loc.name,
                type: loc.type,
                parentId: loc.parentId,
                totalItems: items.length,
                items,
            };
        });
    },
});

// ─── Reordering Rules ─────────────────────────────────────────────────────────

export const getReorderingRules = query({
    args: {},
    handler: async (ctx) => {
        await requireAuth(ctx);
        const products = await ctx.db.query("products").collect();
        const allStock = await ctx.db.query("stock").collect();
        const categories = await ctx.db.query("categories").collect();

        const stockByProduct: Record<string, number> = {};
        for (const s of allStock) {
            stockByProduct[s.productId] = (stockByProduct[s.productId] ?? 0) + s.quantity;
        }
        const categoryMap: Record<string, string> = {};
        for (const c of categories) categoryMap[c._id] = c.name;

        return products.map((p) => {
            const qty = stockByProduct[p._id] ?? 0;
            const needsReorder = qty <= p.reorderLevel;
            return {
                _id: p._id,
                name: p.name,
                sku: p.sku,
                category: p.categoryId ? categoryMap[p.categoryId] ?? "—" : "—",
                unit: p.unit,
                currentStock: qty,
                reorderLevel: p.reorderLevel,
                needsReorder,
            };
        });
    },
});

export const updateReorderLevel = mutation({
    args: { productId: v.id("products"), reorderLevel: v.number() },
    handler: async (ctx, { productId, reorderLevel }) => {
        await requireManager(ctx);
        await ctx.db.patch(productId, { reorderLevel, updatedAt: Date.now() });
    },
});

// ─── Location CRUD ────────────────────────────────────────────────────────────

export const createLocation = mutation({
    args: {
        name: v.string(),
        type: v.union(v.literal("warehouse"), v.literal("zone"), v.literal("rack")),
        parentId: v.optional(v.id("locations")),
    },
    handler: async (ctx, args) => {
        await requireManager(ctx);
        return ctx.db.insert("locations", { ...args, createdAt: Date.now() });
    },
});

export const updateLocation = mutation({
    args: {
        id: v.id("locations"),
        name: v.optional(v.string()),
        type: v.optional(v.union(v.literal("warehouse"), v.literal("zone"), v.literal("rack"))),
    },
    handler: async (ctx, { id, ...updates }) => {
        await requireManager(ctx);
        const patch: Record<string, any> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.type !== undefined) patch.type = updates.type;
        await ctx.db.patch(id, patch);
    },
});

export const deleteLocation = mutation({
    args: { id: v.id("locations") },
    handler: async (ctx, { id }) => {
        await requireManager(ctx);
        // Remove stock records at this location
        const stocks = await ctx.db.query("stock")
            .withIndex("by_location", (q) => q.eq("locationId", id))
            .collect();
        for (const s of stocks) await ctx.db.delete(s._id);
        // Remove child locations
        const children = await ctx.db.query("locations")
            .withIndex("by_parent", (q) => q.eq("parentId", id))
            .collect();
        for (const c of children) await ctx.db.patch(c._id, { parentId: undefined });
        await ctx.db.delete(id);
    },
});

