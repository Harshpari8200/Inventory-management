import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./authGuard";

// ─── Dashboard KPI Queries ─────────────────────────────────────────────────────

/**
 * Returns all top-level dashboard KPIs in one round-trip.
 */
export const getDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        await requireAuth(ctx);
        const now = Date.now();

        // All products
        const products = await ctx.db.query("products").collect();
        const totalProducts = products.length;

        // Stock levels per product (sum across all locations)
        const allStock = await ctx.db.query("stock").collect();
        const stockByProduct: Record<string, number> = {};
        for (const s of allStock) {
            stockByProduct[s.productId] = (stockByProduct[s.productId] ?? 0) + s.quantity;
        }

        let lowStockCount = 0;
        let outOfStockCount = 0;
        for (const product of products) {
            const qty = stockByProduct[product._id] ?? 0;
            if (qty === 0) outOfStockCount++;
            else if (qty <= product.reorderLevel) lowStockCount++;
        }

        // Pending Receipts (status NOT in done/cancelled)
        const pendingReceipts = await ctx.db.query("receipts")
            .withIndex("by_status", (q) => q.eq("status", "waiting"))
            .collect();
        const draftReceipts = await ctx.db.query("receipts")
            .withIndex("by_status", (q) => q.eq("status", "draft"))
            .collect();
        const readyReceipts = await ctx.db.query("receipts")
            .withIndex("by_status", (q) => q.eq("status", "ready"))
            .collect();

        // Pending Deliveries
        const pendingDeliveries = await ctx.db.query("deliveries")
            .withIndex("by_status", (q) => q.eq("status", "waiting"))
            .collect();
        const readyDeliveries = await ctx.db.query("deliveries")
            .withIndex("by_status", (q) => q.eq("status", "ready"))
            .collect();

        // Internal Transfers (moves of type "transfer" created in last 30 days)
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        const recentTransfers = await ctx.db.query("moveHistory")
            .withIndex("by_type", (q) => q.eq("type", "transfer"))
            .filter((q) => q.gte(q.field("createdAt"), thirtyDaysAgo))
            .collect();

        return {
            totalProducts,
            lowStockCount,
            outOfStockCount,
            pendingReceipts: pendingReceipts.length + draftReceipts.length + readyReceipts.length,
            pendingDeliveries: pendingDeliveries.length + readyDeliveries.length,
            scheduledTransfers: recentTransfers.length,
        };
    },
});

/**
 * Returns the live inventory list with stock levels, status, and category.
 */
export const getInventoryList = query({
    args: {
        categoryId: v.optional(v.id("categories")),
        status: v.optional(v.union(
            v.literal("in_stock"),
            v.literal("low_stock"),
            v.literal("out_of_stock"),
        )),
        searchQuery: v.optional(v.string()),
    },
    handler: async (ctx, { categoryId, status, searchQuery }) => {
        let productsQuery = ctx.db.query("products");

        const products = categoryId
            ? await productsQuery.withIndex("by_category", (q) => q.eq("categoryId", categoryId)).collect()
            : await productsQuery.collect();

        const allStock = await ctx.db.query("stock").collect();
        const stockByProduct: Record<string, number> = {};
        for (const s of allStock) {
            stockByProduct[s.productId] = (stockByProduct[s.productId] ?? 0) + s.quantity;
        }

        const categories = await ctx.db.query("categories").collect();
        const categoryMap: Record<string, string> = {};
        for (const c of categories) {
            categoryMap[c._id] = c.name;
        }

        let rows = products.map((p) => {
            const qty = stockByProduct[p._id] ?? 0;
            let stockStatus: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
            if (qty === 0) stockStatus = "out_of_stock";
            else if (qty <= p.reorderLevel) stockStatus = "low_stock";

            return {
                _id: p._id,
                name: p.name,
                sku: p.sku,
                unit: p.unit,
                quantity: qty,
                reorderLevel: p.reorderLevel,
                stockStatus,
                category: p.categoryId ? categoryMap[p.categoryId] ?? "—" : "—",
            };
        });

        if (status) {
            rows = rows.filter((r) => r.stockStatus === status);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            rows = rows.filter((r) =>
                r.name.toLowerCase().includes(q) ||
                r.sku.toLowerCase().includes(q)
            );
        }

        return rows;
    },
});

/**
 * Returns recent operations (receipts, deliveries, adjustments) for the activity feed.
 * Optionally filter by document type and status.
 */
export const getRecentOperations = query({
    args: {
        docType: v.optional(v.union(
            v.literal("receipt"),
            v.literal("delivery"),
            v.literal("adjustment"),
            v.literal("transfer"),
        )),
        status: v.optional(v.string()),
        locationId: v.optional(v.id("locations")),
        searchQuery: v.optional(v.string()),
    },
    handler: async (ctx, { docType, status, locationId, searchQuery }) => {
        const limit = 20;

        // Pull recent move history entries sorted by createdAt desc
        const allMoves = await ctx.db.query("moveHistory")
            .withIndex("by_created")
            .order("desc")
            .take(limit * 5); // Take more to allow for filtering

        const filtered = allMoves.filter((m) => {
            if (docType && m.type !== docType) return false;
            return true;
        });

        // Enrich with product names
        const productIds = [...new Set(filtered.map((m) => m.productId))];
        const productDocs = await Promise.all(productIds.map((id) => ctx.db.get(id)));
        const productMap: Record<string, string> = {};
        for (const p of productDocs) {
            if (p) productMap[p._id] = p.name;
        }

        let enriched = filtered.map((m) => ({
            ...m,
            productName: productMap[m.productId] ?? "Unknown",
        }));

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            enriched = enriched.filter((m) =>
                m.referenceId?.toLowerCase().includes(q) ||
                m.productName.toLowerCase().includes(q)
            );
        }

        return enriched.slice(0, limit);
    },
});

/**
 * Returns all categories for filter dropdowns.
 */
export const getCategories = query({
    args: {},
    handler: async (ctx) => ctx.db.query("categories").collect(),
});

/**
 * Returns all locations for filter dropdowns.
 */
export const getLocations = query({
    args: {},
    handler: async (ctx) => ctx.db.query("locations").collect(),
});

// ─── Seed Data ────────────────────────────────────────────────────────────────

/**
 * Seeds the database with sample inventory data for demonstration.
 * Safe to call multiple times — checks if data already exists.
 */
export const seedInventory = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db.query("products").first();
        if (existing) return { seeded: false, message: "Data already exists" };

        const now = Date.now();

        // Create Location
        const warehouseId = await ctx.db.insert("locations", {
            name: "Warehouse A",
            type: "warehouse",
            createdAt: now,
        });
        const rackBId = await ctx.db.insert("locations", {
            name: "Rack B-12",
            type: "rack",
            parentId: warehouseId,
            createdAt: now,
        });
        const rackCId = await ctx.db.insert("locations", {
            name: "Rack C-04",
            type: "rack",
            parentId: warehouseId,
            createdAt: now,
        });

        // Create Categories
        const rawMatId = await ctx.db.insert("categories", { name: "Raw Materials", createdAt: now });
        const electronicsId = await ctx.db.insert("categories", { name: "Electronics", createdAt: now });
        const consumablesId = await ctx.db.insert("categories", { name: "Consumables", createdAt: now });

        // Create Products
        const steelId = await ctx.db.insert("products", {
            name: "Steel Plating",
            sku: "SP-104-XX",
            categoryId: rawMatId,
            unit: "kg",
            reorderLevel: 200,
            createdAt: now,
            updatedAt: now,
        });
        const wiringId = await ctx.db.insert("products", {
            name: "Wiring Harness",
            sku: "WH-992-AB",
            categoryId: electronicsId,
            unit: "units",
            reorderLevel: 80,
            createdAt: now,
            updatedAt: now,
        });
        const chipsId = await ctx.db.insert("products", {
            name: "Control Chips",
            sku: "CC-440-C1",
            categoryId: electronicsId,
            unit: "units",
            reorderLevel: 50,
            createdAt: now,
            updatedAt: now,
        });
        const coolantId = await ctx.db.insert("products", {
            name: "Coolant",
            sku: "CL-102-L",
            categoryId: consumablesId,
            unit: "litres",
            reorderLevel: 20,
            createdAt: now,
            updatedAt: now,
        });
        const boltId = await ctx.db.insert("products", {
            name: "M10 Bolts",
            sku: "BT-M10-SS",
            categoryId: rawMatId,
            unit: "units",
            reorderLevel: 500,
            createdAt: now,
            updatedAt: now,
        });

        // Create Stock
        await ctx.db.insert("stock", { productId: steelId, locationId: rackBId, quantity: 1200, updatedAt: now });
        await ctx.db.insert("stock", { productId: wiringId, locationId: rackBId, quantity: 42, updatedAt: now });
        await ctx.db.insert("stock", { productId: chipsId, locationId: rackCId, quantity: 204, updatedAt: now });
        await ctx.db.insert("stock", { productId: coolantId, locationId: rackCId, quantity: 12, updatedAt: now });
        await ctx.db.insert("stock", { productId: boltId, locationId: rackBId, quantity: 3200, updatedAt: now });

        // Create Receipts
        const rec1 = await ctx.db.insert("receipts", {
            reference: "REC-2026-001",
            locationId: warehouseId,
            status: "waiting",
            createdBy: "ADMIN01",
            scheduledAt: now + 2 * 24 * 60 * 60 * 1000,
            createdAt: now,
            updatedAt: now,
        });
        await ctx.db.insert("receiptLines", { receiptId: rec1, productId: steelId, expectedQty: 500 });
        await ctx.db.insert("receiptLines", { receiptId: rec1, productId: wiringId, expectedQty: 100 });

        const rec2 = await ctx.db.insert("receipts", {
            reference: "REC-2026-002",
            locationId: warehouseId,
            status: "ready",
            createdBy: "ADMIN01",
            createdAt: now,
            updatedAt: now,
        });
        await ctx.db.insert("receiptLines", { receiptId: rec2, productId: coolantId, expectedQty: 50 });

        // Create Deliveries
        const del1 = await ctx.db.insert("deliveries", {
            reference: "DEL-2026-001",
            locationId: warehouseId,
            status: "ready",
            createdBy: "ADMIN01",
            scheduledAt: now + 1 * 24 * 60 * 60 * 1000,
            createdAt: now,
            updatedAt: now,
        });
        await ctx.db.insert("deliveryLines", { deliveryId: del1, productId: chipsId, requestedQty: 50 });

        const del2 = await ctx.db.insert("deliveries", {
            reference: "DEL-2026-002",
            locationId: warehouseId,
            status: "waiting",
            createdBy: "ADMIN01",
            createdAt: now,
            updatedAt: now,
        });
        await ctx.db.insert("deliveryLines", { deliveryId: del2, productId: steelId, requestedQty: 200 });

        // Move History
        await ctx.db.insert("moveHistory", { type: "receipt", referenceId: rec1.toString(), productId: steelId, toLocationId: rackBId, quantity: 1200, createdBy: "ADMIN01", createdAt: now - 86400000 });
        await ctx.db.insert("moveHistory", { type: "receipt", referenceId: rec2.toString(), productId: coolantId, toLocationId: rackCId, quantity: 12, createdBy: "ADMIN01", createdAt: now - 172800000 });
        await ctx.db.insert("moveHistory", { type: "delivery", referenceId: del1.toString(), productId: chipsId, fromLocationId: rackCId, quantity: 50, createdBy: "ADMIN01", createdAt: now - 43200000 });
        await ctx.db.insert("moveHistory", { type: "transfer", referenceId: "TR-001", productId: boltId, fromLocationId: rackBId, toLocationId: rackCId, quantity: 300, createdBy: "ADMIN01", createdAt: now - 3600000 });

        return { seeded: true };
    },
});
