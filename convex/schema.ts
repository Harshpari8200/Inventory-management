import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { tables as authTables } from "./betterAuth/schema";

/**
 * Inventory Management Schema
 * 
 * Key tables:
 * - locations: Warehouses and rack locations
 * - categories: Product categories
 * - products: Product catalogue
 * - stock: Stock levels per product per location
 * - receipts: Incoming stock (purchase orders)
 * - deliveries: Outgoing stock (delivery orders)
 * - adjustments: Manual inventory corrections
 * - moves: Internal transfers and full audit history
 */
export default defineSchema({
    ...authTables,
    // ─── Locations ───────────────────────────────────────────────────────────
    locations: defineTable({
        name: v.string(),           // e.g. "Warehouse A", "Rack B-14"
        type: v.union(
            v.literal("warehouse"),
            v.literal("zone"),
            v.literal("rack"),
        ),
        parentId: v.optional(v.id("locations")), // for hierarchy
        createdAt: v.number(),
    })
        .index("by_type", ["type"])
        .index("by_parent", ["parentId"]),

    // ─── Product Categories ───────────────────────────────────────────────────
    categories: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_name", ["name"]),

    // ─── Products ─────────────────────────────────────────────────────────────
    products: defineTable({
        name: v.string(),
        sku: v.string(),            // unique stock-keeping unit code
        categoryId: v.optional(v.id("categories")),
        unit: v.string(),           // e.g. "kg", "units", "litres"
        reorderLevel: v.number(),   // trigger Low Stock when stock <= this
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_sku", ["sku"])
        .index("by_category", ["categoryId"]),

    // ─── Stock Levels (per product per location) ──────────────────────────────
    stock: defineTable({
        productId: v.id("products"),
        locationId: v.id("locations"),
        quantity: v.number(),
        updatedAt: v.number(),
    })
        .index("by_product", ["productId"])
        .index("by_location", ["locationId"])
        .index("by_product_location", ["productId", "locationId"]),

    // ─── Receipts (Incoming Stock) ────────────────────────────────────────────
    receipts: defineTable({
        reference: v.string(),      // e.g. "WH/IN/0001"
        locationId: v.id("locations"),
        contact: v.optional(v.string()),   // vendor / supplier name
        status: v.union(
            v.literal("draft"),
            v.literal("waiting"),
            v.literal("ready"),
            v.literal("done"),
            v.literal("cancelled"),
        ),
        createdBy: v.string(),      // loginId of the user
        scheduledAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_location", ["locationId"]),

    // ─── Receipt Lines ────────────────────────────────────────────────────────
    receiptLines: defineTable({
        receiptId: v.id("receipts"),
        productId: v.id("products"),
        expectedQty: v.number(),
        receivedQty: v.optional(v.number()),
    })
        .index("by_receipt", ["receiptId"])
        .index("by_product", ["productId"]),

    // ─── Deliveries (Outgoing Stock) ──────────────────────────────────────────
    deliveries: defineTable({
        reference: v.string(),      // e.g. "WH/OUT/0001"
        locationId: v.id("locations"),
        contact: v.optional(v.string()),         // customer / delivery address
        operationType: v.optional(v.string()),   // e.g. "Pick", "Pack", "Ship"
        status: v.union(
            v.literal("draft"),
            v.literal("waiting"),
            v.literal("ready"),
            v.literal("done"),
            v.literal("cancelled"),
        ),
        createdBy: v.string(),
        scheduledAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_location", ["locationId"]),

    // ─── Delivery Lines ───────────────────────────────────────────────────────
    deliveryLines: defineTable({
        deliveryId: v.id("deliveries"),
        productId: v.id("products"),
        requestedQty: v.number(),
        dispatchedQty: v.optional(v.number()),
    })
        .index("by_delivery", ["deliveryId"])
        .index("by_product", ["productId"]),

    // ─── Inventory Adjustments ────────────────────────────────────────────────
    adjustments: defineTable({
        reference: v.string(),
        productId: v.id("products"),
        locationId: v.id("locations"),
        delta: v.number(),          // positive = add, negative = remove
        reason: v.string(),
        createdBy: v.string(),
        status: v.union(
            v.literal("draft"),
            v.literal("waiting"),
            v.literal("done"),
            v.literal("cancelled"),
        ),
        createdAt: v.number(),
    })
        .index("by_product", ["productId"])
        .index("by_status", ["status"]),

    // ─── Move History (complete audit log) ────────────────────────────────────
    moveHistory: defineTable({
        type: v.union(
            v.literal("receipt"),
            v.literal("delivery"),
            v.literal("adjustment"),
            v.literal("transfer"),
        ),
        referenceId: v.string(),    // the ID of the parent doc as string
        productId: v.id("products"),
        fromLocationId: v.optional(v.id("locations")),
        toLocationId: v.optional(v.id("locations")),
        quantity: v.number(),
        createdBy: v.string(),
        createdAt: v.number(),
    })
        .index("by_product", ["productId"])
        .index("by_type", ["type"])
        .index("by_created", ["createdAt"]),
});
