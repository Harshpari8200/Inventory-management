import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireManager } from "./authGuard";

// ─── Receipts (Incoming Stock) ────────────────────────────────────────────────

export const listReceipts = query({
    args: { status: v.optional(v.string()) },
    handler: async (ctx, { status }) => {
        const q = status
            ? ctx.db.query("receipts").withIndex("by_status", (q) => q.eq("status", status as any))
            : ctx.db.query("receipts");
        const receipts = await q.order("desc").collect();

        const locations = await ctx.db.query("locations").collect();
        const locMap: Record<string, string> = {};
        for (const l of locations) locMap[l._id] = l.name;

        return Promise.all(receipts.map(async (r) => {
            const lines = await ctx.db.query("receiptLines")
                .withIndex("by_receipt", (q) => q.eq("receiptId", r._id)).collect();

            const enrichedLines = await Promise.all(lines.map(async (ln) => {
                const p = await ctx.db.get(ln.productId);
                return { ...ln, productName: p?.name ?? "Unknown", productSku: p?.sku ?? "—", unit: p?.unit ?? "" };
            }));

            return { ...r, locationName: locMap[r.locationId] ?? "—", lines: enrichedLines };
        }));
    },
});

export const createReceipt = mutation({
    args: {
        locationId: v.id("locations"),
        createdBy: v.string(),
        contact: v.optional(v.string()),
        scheduledAt: v.optional(v.number()),
        lines: v.array(v.object({
            productId: v.id("products"),
            expectedQty: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        await requireManager(ctx);
        const now = Date.now();
        const count = (await ctx.db.query("receipts").collect()).length;
        const ref = `WH/IN/${String(count + 1).padStart(4, "0")}`;

        const receiptId = await ctx.db.insert("receipts", {
            reference: ref,
            locationId: args.locationId,
            contact: args.contact,
            status: "draft",
            createdBy: args.createdBy,
            scheduledAt: args.scheduledAt,
            createdAt: now,
            updatedAt: now,
        });

        for (const line of args.lines) {
            await ctx.db.insert("receiptLines", {
                receiptId,
                productId: line.productId,
                expectedQty: line.expectedQty,
            });
        }
        return receiptId;
    },
});

export const markReceiptReady = mutation({
    args: { receiptId: v.id("receipts") },
    handler: async (ctx, { receiptId }) => {
        await requireManager(ctx);
        const receipt = await ctx.db.get(receiptId);
        if (!receipt) throw new Error("Receipt not found");
        if (receipt.status !== "draft") throw new Error("Only draft receipts can be marked as ready");
        await ctx.db.patch(receiptId, { status: "ready", updatedAt: Date.now() });
    },
});

export const validateReceipt = mutation({
    args: {
        receiptId: v.id("receipts"),
        receivedQuantities: v.array(v.object({
            lineId: v.id("receiptLines"),
            receivedQty: v.number(),
        })),
    },
    handler: async (ctx, { receiptId, receivedQuantities }) => {
        await requireManager(ctx);
        const receipt = await ctx.db.get(receiptId);
        if (!receipt) throw new Error("Receipt not found");
        if (receipt.status !== "ready") throw new Error("Receipt must be in Ready state to validate");

        const now = Date.now();

        for (const { lineId, receivedQty } of receivedQuantities) {
            const line = await ctx.db.get(lineId);
            if (!line) continue;

            await ctx.db.patch(lineId, { receivedQty });

            const existingStock = await ctx.db.query("stock")
                .withIndex("by_product_location", (q) =>
                    q.eq("productId", line.productId).eq("locationId", receipt.locationId))
                .first();

            if (existingStock) {
                await ctx.db.patch(existingStock._id, {
                    quantity: existingStock.quantity + receivedQty,
                    updatedAt: now,
                });
            } else {
                await ctx.db.insert("stock", {
                    productId: line.productId,
                    locationId: receipt.locationId,
                    quantity: receivedQty,
                    updatedAt: now,
                });
            }

            await ctx.db.insert("moveHistory", {
                type: "receipt",
                referenceId: receiptId,
                productId: line.productId,
                toLocationId: receipt.locationId,
                quantity: receivedQty,
                createdBy: receipt.createdBy,
                createdAt: now,
            });
        }

        await ctx.db.patch(receiptId, { status: "done", completedAt: now, updatedAt: now });
    },
});

export const cancelReceipt = mutation({
    args: { receiptId: v.id("receipts") },
    handler: async (ctx, { receiptId }) => {
        await requireManager(ctx);
        const receipt = await ctx.db.get(receiptId);
        if (!receipt) throw new Error("Receipt not found");
        if (receipt.status === "done") throw new Error("Cannot cancel a completed receipt");
        await ctx.db.patch(receiptId, { status: "cancelled", updatedAt: Date.now() });
    },
});

export const addReceiptLine = mutation({
    args: {
        receiptId: v.id("receipts"),
        productId: v.id("products"),
        expectedQty: v.number(),
    },
    handler: async (ctx, args) => {
        await requireManager(ctx);
        const receipt = await ctx.db.get(args.receiptId);
        if (!receipt || receipt.status !== "draft") throw new Error("Can only edit draft receipts");
        return await ctx.db.insert("receiptLines", {
            receiptId: args.receiptId,
            productId: args.productId,
            expectedQty: args.expectedQty,
        });
    },
});

export const removeReceiptLine = mutation({
    args: { lineId: v.id("receiptLines") },
    handler: async (ctx, { lineId }) => {
        await requireManager(ctx);
        const line = await ctx.db.get(lineId);
        if (!line) throw new Error("Line not found");
        const receipt = await ctx.db.get(line.receiptId);
        if (!receipt || receipt.status !== "draft") throw new Error("Can only edit draft receipts");
        await ctx.db.delete(lineId);
    },
});

// ─── Deliveries (Outgoing Stock) ──────────────────────────────────────────────

export const listDeliveries = query({
    args: { status: v.optional(v.string()) },
    handler: async (ctx, { status }) => {
        const q = status
            ? ctx.db.query("deliveries").withIndex("by_status", (q) => q.eq("status", status as any))
            : ctx.db.query("deliveries");
        const deliveries = await q.order("desc").collect();

        const locations = await ctx.db.query("locations").collect();
        const locMap: Record<string, string> = {};
        for (const l of locations) locMap[l._id] = l.name;

        return Promise.all(deliveries.map(async (d) => {
            const lines = await ctx.db.query("deliveryLines")
                .withIndex("by_delivery", (q) => q.eq("deliveryId", d._id)).collect();

            const enrichedLines = await Promise.all(lines.map(async (ln) => {
                const p = await ctx.db.get(ln.productId);
                const stock = await ctx.db.query("stock")
                    .withIndex("by_product_location", (q) =>
                        q.eq("productId", ln.productId).eq("locationId", d.locationId))
                    .first();
                const availableQty = stock?.quantity ?? 0;
                const isOutOfStock = availableQty < ln.requestedQty;
                return {
                    ...ln,
                    productName: p?.name ?? "Unknown",
                    productSku: p?.sku ?? "—",
                    unit: p?.unit ?? "",
                    availableQty,
                    isOutOfStock,
                };
            }));

            return { ...d, locationName: locMap[d.locationId] ?? "—", lines: enrichedLines };
        }));
    },
});

export const createDelivery = mutation({
    args: {
        locationId: v.id("locations"),
        createdBy: v.string(),
        contact: v.optional(v.string()),
        operationType: v.optional(v.string()),
        scheduledAt: v.optional(v.number()),
        lines: v.array(v.object({
            productId: v.id("products"),
            requestedQty: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        await requireManager(ctx);
        const now = Date.now();
        const count = (await ctx.db.query("deliveries").collect()).length;
        const ref = `WH/OUT/${String(count + 1).padStart(4, "0")}`;

        const deliveryId = await ctx.db.insert("deliveries", {
            reference: ref,
            locationId: args.locationId,
            contact: args.contact,
            operationType: args.operationType,
            status: "draft",
            createdBy: args.createdBy,
            scheduledAt: args.scheduledAt,
            createdAt: now,
            updatedAt: now,
        });

        for (const line of args.lines) {
            await ctx.db.insert("deliveryLines", {
                deliveryId,
                productId: line.productId,
                requestedQty: line.requestedQty,
            });
        }
        return deliveryId;
    },
});

export const markDeliveryReady = mutation({
    args: { deliveryId: v.id("deliveries") },
    handler: async (ctx, { deliveryId }) => {
        await requireManager(ctx);
        const delivery = await ctx.db.get(deliveryId);
        if (!delivery) throw new Error("Delivery not found");
        if (!["draft", "waiting"].includes(delivery.status)) throw new Error("Invalid status for this action");

        const lines = await ctx.db.query("deliveryLines")
            .withIndex("by_delivery", (q) => q.eq("deliveryId", deliveryId))
            .collect();

        let allAvailable = true;
        for (const line of lines) {
            const stock = await ctx.db.query("stock")
                .withIndex("by_product_location", (q) =>
                    q.eq("productId", line.productId).eq("locationId", delivery.locationId))
                .first();
            if (!stock || stock.quantity < line.requestedQty) {
                allAvailable = false;
                break;
            }
        }

        const newStatus = allAvailable ? "ready" : "waiting";
        await ctx.db.patch(deliveryId, { status: newStatus, updatedAt: Date.now() });
        return { status: newStatus };
    },
});

export const validateDelivery = mutation({
    args: {
        deliveryId: v.id("deliveries"),
        dispatchedQuantities: v.array(v.object({
            lineId: v.id("deliveryLines"),
            dispatchedQty: v.number(),
        })),
    },
    handler: async (ctx, { deliveryId, dispatchedQuantities }) => {
        await requireManager(ctx);
        const delivery = await ctx.db.get(deliveryId);
        if (!delivery) throw new Error("Delivery not found");
        if (delivery.status !== "ready") throw new Error("Delivery must be in Ready state to validate");

        const now = Date.now();

        for (const { lineId, dispatchedQty } of dispatchedQuantities) {
            const line = await ctx.db.get(lineId);
            if (!line) continue;

            await ctx.db.patch(lineId, { dispatchedQty });

            const existingStock = await ctx.db.query("stock")
                .withIndex("by_product_location", (q) =>
                    q.eq("productId", line.productId).eq("locationId", delivery.locationId))
                .first();

            if (existingStock) {
                const newQty = Math.max(0, existingStock.quantity - dispatchedQty);
                await ctx.db.patch(existingStock._id, { quantity: newQty, updatedAt: now });
            }

            await ctx.db.insert("moveHistory", {
                type: "delivery",
                referenceId: deliveryId,
                productId: line.productId,
                fromLocationId: delivery.locationId,
                quantity: dispatchedQty,
                createdBy: delivery.createdBy,
                createdAt: now,
            });
        }

        await ctx.db.patch(deliveryId, { status: "done", completedAt: now, updatedAt: now });
    },
});

export const cancelDelivery = mutation({
    args: { deliveryId: v.id("deliveries") },
    handler: async (ctx, { deliveryId }) => {
        await requireManager(ctx);
        const delivery = await ctx.db.get(deliveryId);
        if (!delivery) throw new Error("Delivery not found");
        if (delivery.status === "done") throw new Error("Cannot cancel a completed delivery");
        await ctx.db.patch(deliveryId, { status: "cancelled", updatedAt: Date.now() });
    },
});

export const addDeliveryLine = mutation({
    args: {
        deliveryId: v.id("deliveries"),
        productId: v.id("products"),
        requestedQty: v.number(),
    },
    handler: async (ctx, args) => {
        await requireManager(ctx);
        const delivery = await ctx.db.get(args.deliveryId);
        if (!delivery || delivery.status !== "draft") throw new Error("Can only edit draft deliveries");
        return await ctx.db.insert("deliveryLines", {
            deliveryId: args.deliveryId,
            productId: args.productId,
            requestedQty: args.requestedQty,
        });
    },
});

export const removeDeliveryLine = mutation({
    args: { lineId: v.id("deliveryLines") },
    handler: async (ctx, { lineId }) => {
        await requireManager(ctx);
        const line = await ctx.db.get(lineId);
        if (!line) throw new Error("Line not found");
        const delivery = await ctx.db.get(line.deliveryId);
        if (!delivery || delivery.status !== "draft") throw new Error("Can only edit draft deliveries");
        await ctx.db.delete(lineId);
    },
});

// ─── Inventory Adjustments ────────────────────────────────────────────────────

export const listAdjustments = query({
    args: { status: v.optional(v.string()) },
    handler: async (ctx, { status }) => {
        const q = status
            ? ctx.db.query("adjustments").withIndex("by_status", (q) => q.eq("status", status as any))
            : ctx.db.query("adjustments");
        const adjustments = await q.order("desc").collect();

        const products = await ctx.db.query("products").collect();
        const prodMap: Record<string, { name: string; sku: string }> = {};
        for (const p of products) prodMap[p._id] = { name: p.name, sku: p.sku };

        const locations = await ctx.db.query("locations").collect();
        const locMap: Record<string, string> = {};
        for (const l of locations) locMap[l._id] = l.name;

        return adjustments.map((a) => ({
            ...a,
            productName: prodMap[a.productId]?.name ?? "Unknown",
            productSku: prodMap[a.productId]?.sku ?? "—",
            locationName: locMap[a.locationId] ?? "—",
        }));
    },
});

export const createAdjustment = mutation({
    args: {
        productId: v.id("products"),
        locationId: v.id("locations"),
        countedQty: v.number(),
        reason: v.string(),
        createdBy: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        const now = Date.now();

        const existingStock = await ctx.db.query("stock")
            .withIndex("by_product_location", (q) =>
                q.eq("productId", args.productId).eq("locationId", args.locationId))
            .first();

        const currentQty = existingStock?.quantity ?? 0;
        const delta = args.countedQty - currentQty;

        const count = (await ctx.db.query("adjustments").collect()).length;
        const ref = `ADJ-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

        const adjId = await ctx.db.insert("adjustments", {
            reference: ref,
            productId: args.productId,
            locationId: args.locationId,
            delta,
            reason: args.reason,
            createdBy: args.createdBy,
            status: "done",
            createdAt: now,
        });

        if (existingStock) {
            await ctx.db.patch(existingStock._id, { quantity: args.countedQty, updatedAt: now });
        } else {
            await ctx.db.insert("stock", {
                productId: args.productId,
                locationId: args.locationId,
                quantity: args.countedQty,
                updatedAt: now,
            });
        }

        await ctx.db.insert("moveHistory", {
            type: "adjustment",
            referenceId: adjId,
            productId: args.productId,
            toLocationId: args.locationId,
            quantity: delta,
            createdBy: args.createdBy,
            createdAt: now,
        });

        return { adjustmentId: adjId, delta };
    },
});

// ─── Internal Transfers ───────────────────────────────────────────────────────

export const createTransfer = mutation({
    args: {
        productId: v.id("products"),
        fromLocationId: v.id("locations"),
        toLocationId: v.id("locations"),
        quantity: v.number(),
        createdBy: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        if (args.fromLocationId === args.toLocationId) throw new Error("Source and destination must differ");
        if (args.quantity <= 0) throw new Error("Quantity must be positive");

        const now = Date.now();

        const srcStock = await ctx.db.query("stock")
            .withIndex("by_product_location", (q) =>
                q.eq("productId", args.productId).eq("locationId", args.fromLocationId))
            .first();

        if (!srcStock || srcStock.quantity < args.quantity) {
            throw new Error("Insufficient stock at source location");
        }
        await ctx.db.patch(srcStock._id, { quantity: srcStock.quantity - args.quantity, updatedAt: now });

        const dstStock = await ctx.db.query("stock")
            .withIndex("by_product_location", (q) =>
                q.eq("productId", args.productId).eq("locationId", args.toLocationId))
            .first();

        if (dstStock) {
            await ctx.db.patch(dstStock._id, { quantity: dstStock.quantity + args.quantity, updatedAt: now });
        } else {
            await ctx.db.insert("stock", {
                productId: args.productId,
                locationId: args.toLocationId,
                quantity: args.quantity,
                updatedAt: now,
            });
        }

        await ctx.db.insert("moveHistory", {
            type: "transfer",
            referenceId: `TR-${Date.now()}`,
            productId: args.productId,
            fromLocationId: args.fromLocationId,
            toLocationId: args.toLocationId,
            quantity: args.quantity,
            createdBy: args.createdBy,
            createdAt: now,
        });
    },
});

// ─── Move History ─────────────────────────────────────────────────────────────

export const listMoveHistory = query({
    args: {
        type: v.optional(v.union(
            v.literal("receipt"),
            v.literal("delivery"),
            v.literal("adjustment"),
            v.literal("transfer"),
        )),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { type, limit }) => {
        await requireAuth(ctx);
        const cap = limit ?? 50;
        const moves = type
            ? await ctx.db.query("moveHistory").withIndex("by_type", (q) => q.eq("type", type)).order("desc").take(cap)
            : await ctx.db.query("moveHistory").withIndex("by_created").order("desc").take(cap);

        const productIds = [...new Set(moves.map((m) => m.productId))];
        const productDocs = await Promise.all(productIds.map((id) => ctx.db.get(id)));
        const prodMap: Record<string, string> = {};
        for (const p of productDocs) if (p) prodMap[p._id] = p.name;

        const locationIds = [...new Set(moves.flatMap((m) => [m.fromLocationId, m.toLocationId].filter(Boolean)))];
        const locationDocs = await Promise.all(locationIds.map((id) => ctx.db.get(id!)));
        const locMap: Record<string, string> = {};
        for (const l of locationDocs) if (l) locMap[l._id] = l.name;

        return moves.map((m) => ({
            ...m,
            productName: prodMap[m.productId] ?? "Unknown",
            fromLocationName: m.fromLocationId ? locMap[m.fromLocationId] ?? "—" : "—",
            toLocationName: m.toLocationId ? locMap[m.toLocationId] ?? "—" : "—",
        }));
    },
});
