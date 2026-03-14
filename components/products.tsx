"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Package, Plus, Pencil, Trash2, X, ScanLine,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Create / Update Products View ────────────────────────────────────────────

export function ProductsCreateView() {
    const inventory = useQuery(api.inventory.getInventoryList, {});
    const categories = useQuery(api.inventory.getCategories);
    const createProduct = useMutation(api.products.createProduct);
    const updateProduct = useMutation(api.products.updateProduct);
    const deleteProduct = useMutation(api.products.deleteProduct);

    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<Id<"products"> | null>(null);
    const [form, setForm] = useState({ name: "", sku: "", categoryId: "", unit: "units", reorderLevel: "10" });
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const resetForm = () => {
        setForm({ name: "", sku: "", categoryId: "", unit: "units", reorderLevel: "10" });
        setEditId(null);
        setError("");
    };

    const openCreate = () => { resetForm(); setModalOpen(true); };
    const openEdit = (row: any) => {
        setForm({
            name: row.name,
            sku: row.sku,
            categoryId: row.categoryId ?? "",
            unit: row.unit,
            reorderLevel: String(row.reorderLevel),
        });
        setEditId(row._id);
        setModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const args = {
                name: form.name.trim(),
                sku: form.sku.trim().toUpperCase(),
                categoryId: form.categoryId ? form.categoryId as Id<"categories"> : undefined,
                unit: form.unit,
                reorderLevel: Number(form.reorderLevel) || 0,
            };
            if (!args.name || !args.sku) throw new Error("Name and SKU are required");

            if (editId) {
                await updateProduct({ id: editId, ...args });
            } else {
                await createProduct(args);
            }
            setModalOpen(false);
            resetForm();
        } catch (e: any) {
            setError(e.message ?? "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: Id<"products">) => {
        if (!confirm("Delete this product and all its stock records?")) return;
        await deleteProduct({ id });
    };

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Products</h2>
                    <p className="text-sm text-muted-foreground mt-1">Create, update, and manage your product catalogue.</p>
                </div>
                <Button onClick={openCreate} className="bg-primary hover:bg-emerald-600 gap-2 rounded-xl h-9 text-sm font-bold">
                    <Plus className="w-4 h-4" /> Add Product
                </Button>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-2 grid grid-cols-[2fr_1fr_1fr_1fr_80px_80px] gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                    <span>Product</span>
                    <span className="text-center">Category</span>
                    <span className="text-center">Unit</span>
                    <span className="text-center">Reorder At</span>
                    <span className="text-center">Stock</span>
                    <span className="text-center">Actions</span>
                </div>
                <div className="divide-y divide-border">
                    {inventory === undefined && <div className="px-6 py-8 text-center text-sm text-muted-foreground">Loading…</div>}
                    {inventory?.length === 0 && <div className="px-6 py-8 text-center text-sm text-muted-foreground">No products yet. Click "Add Product" to get started.</div>}
                    {inventory?.map((row) => (
                        <div key={row._id} className="px-6 py-3 grid grid-cols-[2fr_1fr_1fr_1fr_80px_80px] gap-4 items-center hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground border border-border shrink-0">
                                    <Package className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm leading-tight">{row.name}</p>
                                    <p className="text-[11px] font-mono text-muted-foreground">{row.sku}</p>
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground text-center">{row.category}</span>
                            <span className="text-xs text-center">{row.unit}</span>
                            <span className="text-xs text-center font-mono">{row.reorderLevel}</span>
                            <span className="text-sm font-bold text-center">{row.quantity.toLocaleString()}</span>
                            <div className="flex items-center justify-center gap-1">
                                <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(row._id as Id<"products">)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl z-50 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">{editId ? "Update Product" : "Create Product"}</h3>
                            <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
                        </div>

                        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Name</label>
                                <Input placeholder='e.g. "Steel Rod"' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl h-10" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">SKU / Code</label>
                                <div className="relative">
                                    <Input placeholder='e.g. "SR-001"' value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="rounded-xl h-10 pr-10 font-mono uppercase" />
                                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground" title="Scan barcode">
                                        <ScanLine className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Category</label>
                                    <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all">
                                        <option value="">None</option>
                                        {categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Unit of Measure</label>
                                    <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all">
                                        <option value="units">Units</option>
                                        <option value="kg">Kilograms (kg)</option>
                                        <option value="litres">Litres (L)</option>
                                        <option value="metres">Metres (m)</option>
                                        <option value="boxes">Boxes</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Reorder Level (Minimum Stock)</label>
                                <Input type="number" min="0" placeholder="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="rounded-xl h-10" />
                                <p className="text-[11px] text-muted-foreground mt-1.5">You'll be alerted when stock falls below this number.</p>
                            </div>
                            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-xl px-4 py-2.5 border border-border">
                                💡 Initial stock is <strong>0</strong> by default. Use a <strong>Receipt</strong> or <strong>Inventory Adjustment</strong> to add your first batch — this ensures every item is tracked in the stock ledger from day one.
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl h-9">Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-emerald-600 rounded-xl h-9 font-bold gap-2">
                                {saving ? "Saving…" : editId ? "Update Product" : "Create Product"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Stock by Location View ───────────────────────────────────────────────────

const locationStatusDot: Record<string, string> = {
    empty: "bg-gray-400",
    low: "bg-amber-500",
    ok: "bg-emerald-500",
    full: "bg-sky-500",
};

export function StockByLocationView() {
    const data = useQuery(api.products.getStockByLocation);

    return (
        <>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Stock by Location</h2>
                <p className="text-sm text-muted-foreground mt-1">See exactly what's stored where — colour-coded for quick scanning.</p>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-4">
                {[
                    { label: "Empty", color: "bg-gray-400" },
                    { label: "Low", color: "bg-amber-500" },
                    { label: "OK", color: "bg-emerald-500" },
                    { label: "Full", color: "bg-sky-500" },
                ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className={`w-2 h-2 rounded-full ${l.color}`} />
                        {l.label}
                    </div>
                ))}
            </div>

            {data === undefined && <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>}

            <div className="space-y-4">
                {data?.map((loc) => (
                    <div key={loc._id} className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 py-0.5 rounded bg-muted border border-border">{loc.type}</span>
                                <h4 className="font-bold text-sm">{loc.name}</h4>
                            </div>
                            <span className="text-xs text-muted-foreground">{loc.totalItems} product{loc.totalItems !== 1 ? "s" : ""}</span>
                        </div>
                        {loc.items.length === 0 && (
                            <div className="px-6 py-4 text-xs text-muted-foreground">No stock at this location.</div>
                        )}
                        <div className="divide-y divide-border">
                            {loc.items.map((item) => (
                                <div key={item.stockId} className="px-6 py-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${locationStatusDot[item.status] ?? "bg-gray-400"}`} />
                                        <span className="font-medium text-sm">{item.productName}</span>
                                        <span className="text-[11px] font-mono text-muted-foreground">{item.sku}</span>
                                    </div>
                                    <span className="text-sm font-bold">{item.quantity.toLocaleString()} <span className="font-normal text-muted-foreground text-xs">{item.unit}</span></span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

// ─── Categories View ──────────────────────────────────────────────────────────

export function CategoriesView() {
    const categories = useQuery(api.inventory.getCategories);
    const createCategory = useMutation(api.products.createCategory);
    const deleteCategory = useMutation(api.products.deleteCategory);
    const [newName, setNewName] = useState("");
    const [error, setError] = useState("");

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setError("");
        try {
            await createCategory({ name: newName.trim() });
            setNewName("");
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Product Categories</h2>
                <p className="text-sm text-muted-foreground mt-1">Group similar items together for faster filtering.</p>
            </div>

            {/* Add new */}
            <div className="flex gap-3 mb-6">
                <Input placeholder='e.g. "Raw Materials"' value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="rounded-xl h-10 max-w-sm" />
                <Button onClick={handleAdd} className="bg-primary hover:bg-emerald-600 rounded-xl h-10 gap-2 font-bold text-sm">
                    <Plus className="w-4 h-4" /> Add
                </Button>
            </div>
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="divide-y divide-border">
                    {categories === undefined && <div className="px-6 py-8 text-center text-sm text-muted-foreground">Loading…</div>}
                    {categories?.length === 0 && <div className="px-6 py-8 text-center text-sm text-muted-foreground">No categories yet.</div>}
                    {categories?.map((c) => (
                        <div key={c._id} className="px-6 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-emerald-500 border border-primary/20 text-xs font-black">
                                    {c.name.charAt(0)}
                                </div>
                                <span className="font-medium text-sm">{c.name}</span>
                            </div>
                            <button onClick={() => deleteCategory({ id: c._id })} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

// ─── Reordering Rules View ────────────────────────────────────────────────────

export function ReorderingRulesView() {
    const rules = useQuery(api.products.getReorderingRules);
    const updateReorderLevel = useMutation(api.products.updateReorderLevel);
    const [editing, setEditing] = useState<string | null>(null);
    const [tempValue, setTempValue] = useState("");

    const startEdit = (id: string, current: number) => {
        setEditing(id);
        setTempValue(String(current));
    };

    const saveEdit = async (id: Id<"products">) => {
        await updateReorderLevel({ productId: id, reorderLevel: Number(tempValue) || 0 });
        setEditing(null);
    };

    return (
        <>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Reordering Rules</h2>
                <p className="text-sm text-muted-foreground mt-1">Set minimum stock thresholds — the system alerts you when stock falls below.</p>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-2 grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                    <span>Product</span>
                    <span className="text-center">Category</span>
                    <span className="text-center">Current Stock</span>
                    <span className="text-center">Reorder Level</span>
                    <span className="text-center">Status</span>
                </div>
                <div className="divide-y divide-border">
                    {rules === undefined && <div className="px-6 py-8 text-center text-sm text-muted-foreground col-span-5">Loading…</div>}
                    {rules?.map((r) => (
                        <div key={r._id} className={`px-6 py-3 grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center transition-colors ${r.needsReorder ? "bg-amber-500/5" : "hover:bg-muted/50"}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground border border-border shrink-0">
                                    <Package className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm leading-tight">{r.name}</p>
                                    <p className="text-[11px] font-mono text-muted-foreground">{r.sku}</p>
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground text-center">{r.category}</span>
                            <span className="text-sm font-bold text-center">{r.currentStock.toLocaleString()} <span className="font-normal text-muted-foreground text-xs">{r.unit}</span></span>
                            <div className="flex justify-center">
                                {editing === r._id ? (
                                    <Input
                                        type="number"
                                        min="0"
                                        className="w-20 h-7 text-center rounded-lg text-sm"
                                        value={tempValue}
                                        onChange={(e) => setTempValue(e.target.value)}
                                        onBlur={() => saveEdit(r._id as Id<"products">)}
                                        onKeyDown={(e) => e.key === "Enter" && saveEdit(r._id as Id<"products">)}
                                        autoFocus
                                    />
                                ) : (
                                    <button onClick={() => startEdit(r._id, r.reorderLevel)} className="font-mono text-sm font-bold hover:bg-muted px-3 py-0.5 rounded-lg transition-colors cursor-pointer" title="Click to edit">
                                        {r.reorderLevel}
                                    </button>
                                )}
                            </div>
                            <div className="flex justify-center">
                                {r.needsReorder ? (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-[9px] font-black uppercase tracking-widest text-amber-500">
                                        ⚠ Reorder
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                                        ✓ OK
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
