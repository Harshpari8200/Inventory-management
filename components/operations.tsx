"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
    ArrowDownToLine, ArrowUpFromLine, ClipboardEdit,
    History, ArrowLeftRight, Plus, Check, X, Trash2,
    Package, MapPin, List, Grid3x3, AlertCircle, Printer,
    Search,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════════
// Receipts Page
// ═══════════════════════════════════════════════════════════════════════════════

export function ReceiptsView() {
    const { data: session } = authClient.useSession();
    const receipts = useQuery(api.operations.listReceipts, {});
    const products = useQuery(api.inventory.getInventoryList, {});
    const locations = useQuery(api.inventory.getLocations);
    const createReceipt = useMutation(api.operations.createReceipt);
    const validateReceipt = useMutation(api.operations.validateReceipt);

    const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
    const [searchQuery, setSearchQuery] = useState("");
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [locationId, setLocationId] = useState("");
    const [lines, setLines] = useState<{ productId: string; expectedQty: string }[]>([]);
    const [saving, setSaving] = useState(false);
    const [validating, setValidating] = useState<string | null>(null);
    const [receivedQtys, setReceivedQtys] = useState<Record<string, string>>({});

    const addLine = () => setLines([...lines, { productId: "", expectedQty: "" }]);
    const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
    const updateLine = (i: number, field: string, value: string) => {
        const copy = [...lines];
        (copy[i] as any)[field] = value;
        setLines(copy);
    };

    const filteredReceipts = useMemo(() => {
        if (!receipts) return [];
        return receipts.filter((r: any) => 
            r.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.locationName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [receipts, searchQuery]);

    const handleCreate = async () => {
        if (!locationId || lines.length === 0) return;
        setSaving(true);
        try {
            await createReceipt({
                locationId: locationId as Id<"locations">,
                createdBy: session?.user?.id || "SYSTEM",
                lines: lines.filter((l) => l.productId && l.expectedQty).map((l) => ({
                    productId: l.productId as Id<"products">,
                    expectedQty: Number(l.expectedQty),
                })),
            });
            setCreating(false);
            setLines([]);
            setLocationId("");
        } finally { setSaving(false); }
    };

    const handleValidate = async (receiptId: string, receiptLines: any[]) => {
        setValidating(receiptId);
        try {
            await validateReceipt({
                receiptId: receiptId as Id<"receipts">,
                receivedQuantities: receiptLines.map((ln: any) => ({
                    lineId: ln._id as Id<"receiptLines">,
                    receivedQty: Number(receivedQtys[ln._id] ?? ln.expectedQty),
                })),
            });
        } finally { setValidating(null); setReceivedQtys({}); }
    };

    const resetForm = () => {
        setCreating(false);
        setEditingId(null);
        setLines([]);
        setLocationId("");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black">Receipts</h1>
                    <p className="text-sm text-muted-foreground mt-1">Incoming stock from vendors. Validate to increase stock automatically.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-muted px-1 rounded-lg">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-background text-foreground" : "text-muted-foreground"}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`p-2 rounded-md transition-all ${viewMode === "kanban" ? "bg-background text-foreground" : "text-muted-foreground"}`}
                        >
                            <Grid3x3 className="w-4 h-4" />
                        </button>
                    </div>
                    <Button onClick={() => { setCreating(true); setLines([{ productId: "", expectedQty: "" }]); }} className="bg-primary hover:bg-emerald-600 rounded-xl gap-2 font-bold h-9 text-sm">
                        <Plus className="w-4 h-4" /> New Receipt
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-xl border border-border">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by reference or location..."
                    className="bg-transparent text-sm w-full outline-none"
                />
            </div>

            {/* Create/Edit Modal */}
            {(creating || editingId) && (
                <ModalOverlay onClose={resetForm}>
                    <h3 className="text-lg font-bold mb-4">{editingId ? "Edit Receipt" : "Create Receipt"}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Destination Warehouse</label>
                            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all">
                                <option value="">Select location…</option>
                                {locations?.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Products</label>
                            {lines.map((ln, i) => (
                                <div key={i} className="flex gap-2 mb-2 items-center">
                                    <select value={ln.productId} onChange={(e) => updateLine(i, "productId", e.target.value)} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all flex-1">
                                        <option value="">Select product…</option>
                                        {products?.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                                    </select>
                                    <Input type="number" min="1" placeholder="Qty" value={ln.expectedQty} onChange={(e) => updateLine(i, "expectedQty", e.target.value)} className="w-24 rounded-xl h-10" />
                                    <button onClick={() => removeLine(i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <button onClick={addLine} className="text-xs text-emerald-500 hover:underline mt-1">+ Add another product</button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={resetForm} className="rounded-xl h-9">Cancel</Button>
                        <Button onClick={handleCreate} disabled={saving} className="bg-primary hover:bg-emerald-600 rounded-xl h-9 font-bold">{saving ? "Saving…" : "Save Receipt"}</Button>
                    </div>
                </ModalOverlay>
            )}

            {/* List View */}
            {viewMode === "list" && (
                <div className="space-y-4">
                    {receipts === undefined && <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>}
                    {filteredReceipts.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">No receipts found.</div>}
                    {filteredReceipts.map((r: any) => (
                        <div key={r._id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-border/80 transition-colors cursor-pointer" onClick={() => setEditingId(r._id)}>
                            <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                                <div className="flex items-center gap-4 flex-1">
                                    <span className="font-mono font-bold text-sm text-emerald-500">{r.reference}</span>
                                    <StatusPill status={r.status} />
                                    <span className="text-xs text-muted-foreground">→ {r.locationName}</span>
                                </div>
                                {r.status !== "done" && r.status !== "cancelled" && (
                                    <Button size="sm" onClick={(e) => { e.stopPropagation(); handleValidate(r._id, r.lines); }} disabled={validating === r._id} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-8 text-xs font-bold gap-1">
                                        <Check className="w-3.5 h-3.5" /> {validating === r._id ? "Validating…" : "Validate"}
                                    </Button>
                                )}
                                {r.status === "done" && (
                                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }} className="rounded-xl h-8 text-xs gap-1">
                                        <Printer className="w-3.5 h-3.5" /> Print
                                    </Button>
                                )}
                            </div>
                            <div className="divide-y divide-border">
                                {r.lines.map((ln: any) => (
                                    <div key={ln._id} className="px-6 py-2.5 flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-3">
                                            <Package className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-medium">{ln.productName}</span>
                                            <span className="text-xs font-mono text-muted-foreground">{ln.productSku}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-muted-foreground">Expected: <strong>{ln.expectedQty}</strong></span>
                                            {r.status === "done" ? (
                                                <span className="text-xs text-emerald-500 font-bold">Received: {ln.receivedQty ?? ln.expectedQty}</span>
                                            ) : (
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    className="w-20 h-7 rounded-lg text-center text-xs"
                                                    placeholder={String(ln.expectedQty)}
                                                    value={receivedQtys[ln._id] ?? ""}
                                                    onChange={(e) => { e.stopPropagation(); setReceivedQtys({ ...receivedQtys, [ln._id]: e.target.value }); }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Kanban View */}
            {viewMode === "kanban" && (
                <div className="grid grid-cols-3 gap-6">
                    {["draft", "ready", "done"].map((status) => (
                        <div key={status} className="space-y-4">
                            <div className="flex items-center gap-2">
                                <StatusPill status={status} />
                                <span className="text-xs font-bold text-muted-foreground">({filteredReceipts.filter((r: any) => r.status === status).length})</span>
                            </div>
                            <div className="space-y-3">
                                {filteredReceipts.filter((r: any) => r.status === status).map((r: any) => (
                                    <div key={r._id} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setEditingId(r._id)}>
                                        <div className="text-sm font-mono font-bold text-emerald-500 mb-2">{r.reference}</div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div>→ {r.locationName}</div>
                                            <div>{r.lines?.length || 0} items</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Deliveries Page
// ═══════════════════════════════════════════════════════════════════════════════

export function DeliveriesView() {
    const { data: session } = authClient.useSession();
    const deliveries = useQuery(api.operations.listDeliveries, {});
    const products = useQuery(api.inventory.getInventoryList, {});
    const locations = useQuery(api.inventory.getLocations);
    const createDelivery = useMutation(api.operations.createDelivery);
    const validateDelivery = useMutation(api.operations.validateDelivery);

    const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
    const [searchQuery, setSearchQuery] = useState("");
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [locationId, setLocationId] = useState("");
    const [lines, setLines] = useState<{ productId: string; requestedQty: string }[]>([]);
    const [saving, setSaving] = useState(false);
    const [validating, setValidating] = useState<string | null>(null);
    const [dispatchedQtys, setDispatchedQtys] = useState<Record<string, string>>({});

    const addLine = () => setLines([...lines, { productId: "", requestedQty: "" }]);
    const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
    const updateLine = (i: number, field: string, value: string) => {
        const copy = [...lines];
        (copy[i] as any)[field] = value;
        setLines(copy);
    };

    const filteredDeliveries = useMemo(() => {
        if (!deliveries) return [];
        return deliveries.filter((d: any) =>
            d.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.locationName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [deliveries, searchQuery]);

    const handleCreate = async () => {
        if (!locationId || lines.length === 0) return;
        setSaving(true);
        try {
            await createDelivery({
                locationId: locationId as Id<"locations">,
                createdBy: session?.user?.id || "SYSTEM",
                lines: lines.filter((l) => l.productId && l.requestedQty).map((l) => ({
                    productId: l.productId as Id<"products">,
                    requestedQty: Number(l.requestedQty),
                })),
            });
            setCreating(false);
            setLines([]);
            setLocationId("");
        } finally { setSaving(false); }
    };

    const handleValidate = async (deliveryId: string, deliveryLines: any[]) => {
        setValidating(deliveryId);
        try {
            await validateDelivery({
                deliveryId: deliveryId as Id<"deliveries">,
                dispatchedQuantities: deliveryLines.map((ln: any) => ({
                    lineId: ln._id as Id<"deliveryLines">,
                    dispatchedQty: Number(dispatchedQtys[ln._id] ?? ln.requestedQty),
                })),
            });
        } finally { setValidating(null); setDispatchedQtys({}); }
    };

    const resetForm = () => {
        setCreating(false);
        setEditingId(null);
        setLines([]);
        setLocationId("");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black">Delivery Orders</h1>
                    <p className="text-sm text-muted-foreground mt-1">Outgoing stock for customer shipment. Validate to decrease stock automatically.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-muted px-1 rounded-lg">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-background text-foreground" : "text-muted-foreground"}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`p-2 rounded-md transition-all ${viewMode === "kanban" ? "bg-background text-foreground" : "text-muted-foreground"}`}
                        >
                            <Grid3x3 className="w-4 h-4" />
                        </button>
                    </div>
                    <Button onClick={() => { setCreating(true); setLines([{ productId: "", requestedQty: "" }]); }} className="bg-primary hover:bg-emerald-600 rounded-xl gap-2 font-bold h-9 text-sm">
                        <Plus className="w-4 h-4" /> New Delivery
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-xl border border-border">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by reference or location..."
                    className="bg-transparent text-sm w-full outline-none"
                />
            </div>

            {/* Create/Edit Modal */}
            {(creating || editingId) && (
                <ModalOverlay onClose={resetForm}>
                    <h3 className="text-lg font-bold mb-4">{editingId ? "Edit Delivery" : "Create Delivery Order"}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Source Warehouse</label>
                            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all">
                                <option value="">Select location…</option>
                                {locations?.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Products to Ship</label>
                            {lines.map((ln, i) => (
                                <div key={i} className="flex gap-2 mb-2 items-center">
                                    <select value={ln.productId} onChange={(e) => updateLine(i, "productId", e.target.value)} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all flex-1">
                                        <option value="">Select product…</option>
                                        {products?.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku}) — {p.quantity} avail</option>)}
                                    </select>
                                    <Input type="number" min="1" placeholder="Qty" value={ln.requestedQty} onChange={(e) => updateLine(i, "requestedQty", e.target.value)} className="w-24 rounded-xl h-10" />
                                    <button onClick={() => removeLine(i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <button onClick={addLine} className="text-xs text-emerald-500 hover:underline mt-1">+ Add another product</button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={resetForm} className="rounded-xl h-9">Cancel</Button>
                        <Button onClick={handleCreate} disabled={saving} className="bg-primary hover:bg-emerald-600 rounded-xl h-9 font-bold">{saving ? "Saving…" : "Save Delivery"}</Button>
                    </div>
                </ModalOverlay>
            )}

            {/* List View */}
            {viewMode === "list" && (
                <div className="space-y-4">
                    {deliveries === undefined && <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>}
                    {filteredDeliveries.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">No delivery orders found.</div>}
                    {filteredDeliveries.map((d: any) => {
                        const hasOutOfStock = d.lines?.some((ln: any) => ln.isOutOfStock);
                        return (
                            <div key={d._id} className={`bg-card border rounded-2xl overflow-hidden hover:border-border/80 transition-colors cursor-pointer ${hasOutOfStock ? "border-red-500/30" : "border-border"}`} onClick={() => setEditingId(d._id)}>
                                <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                                    <div className="flex items-center gap-4 flex-1">
                                        <span className="font-mono font-bold text-sm text-violet-500">{d.reference}</span>
                                        <StatusPill status={d.status} />
                                        <span className="text-xs text-muted-foreground">from {d.locationName}</span>
                                        {hasOutOfStock && (
                                            <div className="flex items-center gap-1 text-red-500 text-xs font-bold">
                                                <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                                            </div>
                                        )}
                                    </div>
                                    {d.status !== "done" && d.status !== "cancelled" && (
                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleValidate(d._id, d.lines); }} disabled={validating === d._id} className="bg-violet-600 hover:bg-violet-700 rounded-xl h-8 text-xs font-bold gap-1">
                                            <Check className="w-3.5 h-3.5" /> {validating === d._id ? "Validating…" : "Validate"}
                                        </Button>
                                    )}
                                    {d.status === "done" && (
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }} className="rounded-xl h-8 text-xs gap-1">
                                            <Printer className="w-3.5 h-3.5" /> Print
                                        </Button>
                                    )}
                                </div>
                                <div className="divide-y divide-border">
                                    {d.lines.map((ln: any) => (
                                        <div key={ln._id} className={`px-6 py-2.5 flex items-center justify-between text-sm ${ln.isOutOfStock ? "bg-red-500/5" : ""}`}>
                                            <div className="flex items-center gap-3">
                                                {ln.isOutOfStock && <AlertCircle className="w-4 h-4 text-red-500" />}
                                                <Package className={`w-4 h-4 ${ln.isOutOfStock ? "text-red-500" : "text-muted-foreground"}`} />
                                                <span className={`font-medium ${ln.isOutOfStock ? "text-red-500" : ""}`}>{ln.productName}</span>
                                                <span className="text-xs font-mono text-muted-foreground">{ln.productSku}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs text-muted-foreground">Requested: <strong>{ln.requestedQty}</strong></span>
                                                {d.status === "done" ? (
                                                    <span className="text-xs text-violet-500 font-bold">Dispatched: {ln.dispatchedQty ?? ln.requestedQty}</span>
                                                ) : (
                                                    <Input type="number" min="0" className="w-20 h-7 rounded-lg text-center text-xs" placeholder={String(ln.requestedQty)} value={dispatchedQtys[ln._id] ?? ""} onChange={(e) => { e.stopPropagation(); setDispatchedQtys({ ...dispatchedQtys, [ln._id]: e.target.value }); }} onClick={(e) => e.stopPropagation()} />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Kanban View */}
            {viewMode === "kanban" && (
                <div className="grid grid-cols-4 gap-6">
                    {["draft", "waiting", "ready", "done"].map((status) => (
                        <div key={status} className="space-y-4">
                            <div className="flex items-center gap-2">
                                <StatusPill status={status} />
                                <span className="text-xs font-bold text-muted-foreground">({filteredDeliveries.filter((d: any) => d.status === status).length})</span>
                            </div>
                            <div className="space-y-3">
                                {filteredDeliveries.filter((d: any) => d.status === status).map((d: any) => {
                                    const hasOutOfStock = d.lines?.some((ln: any) => ln.isOutOfStock);
                                    return (
                                        <div key={d._id} className={`bg-card border rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors ${hasOutOfStock ? "border-red-500/50" : "border-border"}`} onClick={() => setEditingId(d._id)}>
                                            <div className="text-sm font-mono font-bold text-violet-500 mb-2">{d.reference}</div>
                                            <div className="text-xs text-muted-foreground space-y-1">
                                                <div>from {d.locationName}</div>
                                                <div>{d.lines?.length || 0} items</div>
                                                {hasOutOfStock && <div className="text-red-500 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Out of Stock</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Adjustments Page
// ═══════════════════════════════════════════════════════════════════════════════

export function AdjustmentsView() {
    const adjustments = useQuery(api.operations.listAdjustments, {});
    const products = useQuery(api.inventory.getInventoryList, {});
    const locations = useQuery(api.inventory.getLocations);
    const createAdjustment = useMutation(api.operations.createAdjustment);

    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ productId: "", locationId: "", countedQty: "", reason: "" });
    const [saving, setSaving] = useState(false);

    const currentProduct = products?.find((p) => p._id === form.productId);

    const handleCreate = async () => {
        if (!form.productId || !form.locationId || !form.countedQty) return;
        setSaving(true);
        try {
            await createAdjustment({
                productId: form.productId as Id<"products">,
                locationId: form.locationId as Id<"locations">,
                countedQty: Number(form.countedQty),
                reason: form.reason || "Manual count adjustment",
                createdBy: "ADMIN01",
            });
            setCreating(false);
            setForm({ productId: "", locationId: "", countedQty: "", reason: "" });
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black">Inventory Adjustments</h1>
                    <p className="text-sm text-muted-foreground mt-1">Fix mismatches between recorded stock and physical count. Stock is auto-updated.</p>
                </div>
                <Button onClick={() => setCreating(true)} className="bg-primary hover:bg-emerald-600 rounded-xl gap-2 font-bold h-9 text-sm">
                    <Plus className="w-4 h-4" /> New Adjustment
                </Button>
            </div>

            {creating && (
                <ModalOverlay onClose={() => setCreating(false)}>
                    <h3 className="text-lg font-bold mb-4">Stock Adjustment</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Product</label>
                            <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all">
                                <option value="">Select product…</option>
                                {products?.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku}) — Current: {p.quantity}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Location</label>
                            <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all">
                                <option value="">Select location…</option>
                                {locations?.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Counted Quantity (physical count)</label>
                            <Input type="number" min="0" placeholder="Enter counted qty" value={form.countedQty} onChange={(e) => setForm({ ...form, countedQty: e.target.value })} className="rounded-xl h-10" />
                            {currentProduct && form.countedQty && (
                                <p className="text-xs mt-1.5">
                                    Delta: <span className={Number(form.countedQty) - currentProduct.quantity >= 0 ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                                        {Number(form.countedQty) - currentProduct.quantity >= 0 ? "+" : ""}{Number(form.countedQty) - currentProduct.quantity}
                                    </span>
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Reason</label>
                            <Input placeholder='e.g. "3 kg damaged"' value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="rounded-xl h-10" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setCreating(false)} className="rounded-xl h-9">Cancel</Button>
                        <Button onClick={handleCreate} disabled={saving} className="bg-primary hover:bg-emerald-600 rounded-xl h-9 font-bold">{saving ? "Saving…" : "Apply Adjustment"}</Button>
                    </div>
                </ModalOverlay>
            )}

            {/* Adjustments list */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-2 grid grid-cols-[1fr_1fr_1fr_80px_1fr_100px] gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                    <span>Reference</span><span>Product</span><span>Location</span><span className="text-center">Delta</span><span>Reason</span><span className="text-right">When</span>
                </div>
                <div className="divide-y divide-border">
                    {adjustments === undefined && <div className="px-6 py-8 text-center text-sm text-muted-foreground">Loading…</div>}
                    {adjustments?.length === 0 && <div className="px-6 py-8 text-center text-sm text-muted-foreground">No adjustments yet.</div>}
                    {adjustments?.map((a) => (
                        <div key={a._id} className="px-6 py-3 grid grid-cols-[1fr_1fr_1fr_80px_1fr_100px] gap-4 items-center text-sm hover:bg-muted/50 transition-colors">
                            <span className="font-mono text-xs text-amber-500 font-bold">{a.reference}</span>
                            <span className="font-medium">{a.productName}</span>
                            <span className="text-xs text-muted-foreground">{a.locationName}</span>
                            <span className={`text-center font-bold ${a.delta >= 0 ? "text-emerald-500" : "text-red-500"}`}>{a.delta >= 0 ? "+" : ""}{a.delta}</span>
                            <span className="text-xs text-muted-foreground truncate">{a.reason}</span>
                            <span className="text-right text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Move History + Internal Transfers Page
// ═══════════════════════════════════════════════════════════════════════════════

export function MoveHistoryView() {
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const moveHistory = useQuery(api.operations.listMoveHistory, {
        type: typeFilter !== "all" ? typeFilter as any : undefined,
        limit: 50,
    });
    const products = useQuery(api.inventory.getInventoryList, {});
    const locations = useQuery(api.inventory.getLocations);
    const createTransfer = useMutation(api.operations.createTransfer);

    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ productId: "", fromLocationId: "", toLocationId: "", quantity: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleTransfer = async () => {
        if (!form.productId || !form.fromLocationId || !form.toLocationId || !form.quantity) return;
        setSaving(true);
        setError("");
        try {
            await createTransfer({
                productId: form.productId as Id<"products">,
                fromLocationId: form.fromLocationId as Id<"locations">,
                toLocationId: form.toLocationId as Id<"locations">,
                quantity: Number(form.quantity),
                createdBy: "ADMIN01",
            });
            setCreating(false);
            setForm({ productId: "", fromLocationId: "", toLocationId: "", quantity: "" });
        } catch (e: any) {
            setError(e.message ?? "Transfer failed");
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black">Move History</h1>
                    <p className="text-sm text-muted-foreground mt-1">Full audit log of every stock movement. Create internal transfers between locations.</p>
                </div>
                <Button onClick={() => setCreating(true)} className="bg-primary hover:bg-emerald-600 rounded-xl gap-2 font-bold h-9 text-sm">
                    <ArrowLeftRight className="w-4 h-4" /> New Transfer
                </Button>
            </div>

            {creating && (
                <ModalOverlay onClose={() => setCreating(false)}>
                    <h3 className="text-lg font-bold mb-4">Internal Transfer</h3>
                    {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2 mb-4">{error}</p>}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Product</label>
                            <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all">
                                <option value="">Select product…</option>
                                {products?.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">From</label>
                                <select value={form.fromLocationId} onChange={(e) => setForm({ ...form, fromLocationId: e.target.value })} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all">
                                    <option value="">Source…</option>
                                    {locations?.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">To</label>
                                <select value={form.toLocationId} onChange={(e) => setForm({ ...form, toLocationId: e.target.value })} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all">
                                    <option value="">Destination…</option>
                                    {locations?.filter((l) => l._id !== form.fromLocationId).map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Quantity</label>
                            <Input type="number" min="1" placeholder="Qty to transfer" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-xl h-10" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setCreating(false)} className="rounded-xl h-9">Cancel</Button>
                        <Button onClick={handleTransfer} disabled={saving} className="bg-primary hover:bg-emerald-600 rounded-xl h-9 font-bold">{saving ? "Transferring…" : "Transfer Stock"}</Button>
                    </div>
                </ModalOverlay>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2">
                {(["all", "receipt", "delivery", "adjustment", "transfer"] as const).map((t) => (
                    <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${typeFilter === t ? "bg-primary/10 border-primary/30 text-foreground" : "border-transparent text-muted-foreground hover:bg-muted"}`}>
                        {t === "all" ? "All" : t}
                    </button>
                ))}
            </div>

            {/* Move History Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-2 grid grid-cols-[90px_1fr_1fr_1fr_80px_100px] gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                    <span>Type</span><span>Product</span><span>From</span><span>To</span><span className="text-center">Qty</span><span className="text-right">When</span>
                </div>
                <div className="divide-y divide-border">
                    {moveHistory === undefined && <div className="px-6 py-8 text-center text-sm text-muted-foreground">Loading…</div>}
                    {moveHistory?.length === 0 && <div className="px-6 py-8 text-center text-sm text-muted-foreground">No movements logged yet.</div>}
                    {moveHistory?.map((m) => (
                        <div key={m._id} className="px-6 py-3 grid grid-cols-[90px_1fr_1fr_1fr_80px_100px] gap-4 items-center text-sm hover:bg-muted/50 transition-colors">
                            <MoveTypeBadge type={m.type} />
                            <span className="font-medium truncate">{m.productName}</span>
                            <span className="text-xs text-muted-foreground">{m.fromLocationName}</span>
                            <span className="text-xs text-muted-foreground">{m.toLocationName}</span>
                            <span className="text-center font-bold">{m.quantity}</span>
                            <span className="text-right text-xs text-muted-foreground">{timeAgo(m.createdAt)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl z-50">
                {children}
            </div>
        </div>
    );
}

const statusPillColors: Record<string, string> = {
    draft: "bg-gray-500/10 text-gray-400",
    waiting: "bg-amber-500/10 text-amber-500",
    ready: "bg-sky-500/10 text-sky-500",
    done: "bg-emerald-500/10 text-emerald-500",
    cancelled: "bg-red-500/10 text-red-500",
};

function StatusPill({ status }: { status: string }) {
    const cls = statusPillColors[status] ?? "bg-muted text-muted-foreground";
    return <span className={`${cls} text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg`}>{status}</span>;
}

const moveTypeColors: Record<string, { cls: string; label: string }> = {
    receipt: { cls: "bg-emerald-500/10 text-emerald-500", label: "Receipt" },
    delivery: { cls: "bg-violet-500/10 text-violet-500", label: "Delivery" },
    adjustment: { cls: "bg-amber-500/10 text-amber-500", label: "Adjust" },
    transfer: { cls: "bg-sky-500/10 text-sky-500", label: "Transfer" },
};

function MoveTypeBadge({ type }: { type: string }) {
    const c = moveTypeColors[type] ?? { cls: "bg-muted text-muted-foreground", label: type };
    return <span className={`${c.cls} text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg text-center`}>{c.label}</span>;
}

function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
