"use client";

import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Sparkline } from "@/components/Sparkline";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
    Package, AlertTriangle, InboxIcon, SendHorizonal,
    ArrowLeftRight, Plus, Database,
} from "lucide-react";

const statusColors: Record<string, string> = {
    in_stock: "var(--success)",
    low_stock: "var(--warning)",
    out_of_stock: "var(--destructive)",
};

export default function DashboardPage() {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("q") || undefined;
    const { data: session, isPending } = authClient.useSession();
    const skip = (isPending || !session?.user) ? "skip" : undefined;

    const [stockStatusFilter, setStockStatusFilter] = useState<"in_stock" | "low_stock" | "out_of_stock" | undefined>(undefined);
    const [docTypeFilter, setDocTypeFilter] = useState<string>("all");
    const [opStatusFilter, setOpStatusFilter] = useState<string>("all");
    const [locationFilter, setLocationFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    const stats = useQuery(api.inventory.getDashboardStats, skip);
    const inventory = useQuery(api.inventory.getInventoryList, skip ? "skip" : {
        status: stockStatusFilter,
        categoryId: categoryFilter !== "all" ? categoryFilter as any : undefined,
        searchQuery,
    });
    const recentOps = useQuery(api.inventory.getRecentOperations, skip ? "skip" : {
        docType: docTypeFilter !== "all" ? docTypeFilter as any : undefined,
        status: opStatusFilter !== "all" ? opStatusFilter : undefined,
        locationId: locationFilter !== "all" ? locationFilter as any : undefined,
        searchQuery,
    });
    const categories = useQuery(api.inventory.getCategories, skip);
    const locations = useQuery(api.inventory.getLocations, skip);
    const seedInventory = useMutation(api.inventory.seedInventory);

    const isEmpty = inventory !== undefined && inventory.length === 0 && !stockStatusFilter && !categoryFilter && !searchQuery;

    return (
        <div className="space-y-6">
            {/* ── Header Row ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">Real-time snapshot of your inventory operations.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/*
                        isEmpty && (
                        <Button variant="outline" onClick={() => seedInventory({})} className="gap-2 h-8 px-4 text-xs rounded-xl border-dashed">
                            <Database className="w-3.5 h-3.5" /> Seed Demo Data
                        </Button>
                    )
                    */
                    }
                </div>
            </div>

            {/* ── 5 KPI Cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-5 gap-4">
                <KpiCard label="Total Products" value={stats?.totalProducts ?? "—"} icon={<Package className="w-4 h-4 text-emerald-500" />} trend={[5, 5, 6, 6, 7, 8, stats?.totalProducts ?? 8]} color="var(--success)" />
                <KpiCard label="Low / Out of Stock" value={`${stats?.lowStockCount ?? "—"} / ${stats?.outOfStockCount ?? "—"}`} icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} trend={[1, 2, 1, 3, 2, 2, (stats?.lowStockCount ?? 2) + (stats?.outOfStockCount ?? 0)]} color="var(--warning)" />
                <KpiCard label="Pending Receipts" value={stats?.pendingReceipts ?? "—"} icon={<InboxIcon className="w-4 h-4 text-sky-500" />} trend={[3, 2, 4, 3, 2, 3, stats?.pendingReceipts ?? 3]} color="oklch(0.65 0.15 230)" />
                <KpiCard label="Pending Deliveries" value={stats?.pendingDeliveries ?? "—"} icon={<SendHorizonal className="w-4 h-4 text-violet-500" />} trend={[1, 2, 2, 1, 3, 2, stats?.pendingDeliveries ?? 2]} color="oklch(0.65 0.18 295)" />
                <KpiCard label="Transfers Scheduled" value={stats?.scheduledTransfers ?? "—"} icon={<ArrowLeftRight className="w-4 h-4 text-teal-500" />} trend={[0, 1, 0, 2, 1, 1, stats?.scheduledTransfers ?? 1]} color="oklch(0.65 0.12 175)" />
            </div>

            {/* ── Dynamic Filters ─────────────────────────────────────── */}
            <div className="bg-card border border-border rounded-2xl px-5 py-3 flex items-center gap-4 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mr-1">Filters</span>
                <FilterSelect label="Doc Type" value={docTypeFilter} onChange={setDocTypeFilter} options={[{ value: "all", label: "All Types" }, { value: "receipt", label: "Receipts" }, { value: "delivery", label: "Delivery" }, { value: "transfer", label: "Internal" }, { value: "adjustment", label: "Adjustments" }]} />
                <FilterSelect label="Status" value={opStatusFilter} onChange={setOpStatusFilter} options={[{ value: "all", label: "All Statuses" }, { value: "draft", label: "Draft" }, { value: "waiting", label: "Waiting" }, { value: "ready", label: "Ready" }, { value: "done", label: "Done" }, { value: "cancelled", label: "Cancelled" }]} />
                <FilterSelect label="Location" value={locationFilter} onChange={setLocationFilter} options={[{ value: "all", label: "All Locations" }, ...(locations?.map((l) => ({ value: l._id, label: l.name })) ?? [])]} />
                <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={[{ value: "all", label: "All Categories" }, ...(categories?.map((c) => ({ value: c._id, label: c.name })) ?? [])]} />
            </div>

            {/* ── Live Inventory ───────────────────────────────────────── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-base font-bold tracking-tight text-emerald-500">Live Inventory</h3>
                    <div className="flex items-center gap-1.5">
                        {([undefined, "in_stock", "low_stock", "out_of_stock"] as const).map((s) => (
                            <button key={String(s)} onClick={() => setStockStatusFilter(s)} className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${stockStatusFilter === s ? "bg-primary/10 border-primary/30 text-foreground" : "border-transparent text-muted-foreground hover:bg-muted"}`}>
                                {s === undefined ? "All" : s.replace(/_/g, " ")}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="px-6 py-2 grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                    <span>Product</span><span className="text-center">Category</span><span className="text-center">Quantity</span><span className="text-center">Status</span><span className="text-right">Trend</span>
                </div>
                <div className="divide-y divide-border">
                    {inventory === undefined && <div className="px-6 py-8 text-center text-muted-foreground text-sm">Loading…</div>}
                    {inventory?.length === 0 && <div className="px-6 py-8 text-center text-muted-foreground text-sm">No products found. {isEmpty && <>Click <strong>Seed Demo Data</strong> to populate.</>}</div>}
                    {inventory?.map((row) => {
                        const color = statusColors[row.stockStatus] ?? "var(--muted-foreground)";
                        const label = row.stockStatus.replace(/_/g, " ");
                        return (
                            <div key={row._id} className="px-6 py-3 grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 items-center hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center text-muted-foreground border border-border shrink-0"><Package className="w-4 h-4" /></div>
                                    <div><h5 className="font-bold leading-tight text-sm">{row.name}</h5><p className="text-[11px] font-mono text-muted-foreground">{row.sku}</p></div>
                                </div>
                                <span className="text-xs text-muted-foreground text-center">{row.category}</span>
                                <span className="text-sm font-black text-center">{row.quantity.toLocaleString()} <span className="font-normal text-muted-foreground text-xs">{row.unit}</span></span>
                                <div className="flex justify-center">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-background">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                                    </div>
                                </div>
                                <div className="flex justify-end"><Sparkline data={[row.reorderLevel, row.quantity * 0.6, row.quantity * 0.8, row.quantity * 0.9, row.quantity]} color={color} /></div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Recent Operations ───────────────────────────────────── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                    <h3 className="text-base font-bold tracking-tight text-emerald-500">Recent Operations</h3>
                </div>
                <div className="px-6 py-2 grid grid-cols-[100px_1fr_1fr_80px_120px] gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                    <span>Type</span><span>Product</span><span>Ref</span><span className="text-center">Qty</span><span className="text-right">When</span>
                </div>
                <div className="divide-y divide-border">
                    {recentOps === undefined && <div className="px-6 py-8 text-center text-muted-foreground text-sm">Loading…</div>}
                    {recentOps?.length === 0 && <div className="px-6 py-8 text-center text-muted-foreground text-sm">No operations yet.</div>}
                    {recentOps?.map((op) => (
                        <div key={op._id} className="px-6 py-3 grid grid-cols-[100px_1fr_1fr_80px_120px] gap-4 text-sm hover:bg-muted/50 transition-colors items-center">
                            <OperationTypeBadge type={op.type} />
                            <span className="font-medium truncate">{op.productName}</span>
                            <span className="text-xs font-mono text-muted-foreground truncate">{op.referenceId}</span>
                            <span className="text-center font-bold">{op.quantity}</span>
                            <span className="text-right text-xs text-muted-foreground">{timeAgo(op.createdAt)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, trend, color }: { label: string; value: number | string; icon: React.ReactNode; trend: number[]; color: string }) {
    return (
        <div className="p-4 bg-card border border-border rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
                {icon}
            </div>
            <div className="flex items-end justify-between">
                <h4 className="text-2xl font-black">{value}</h4>
                <Sparkline data={trend} color={color} />
            </div>
        </div>
    );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}:</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs outline-none transition-all focus:border-emerald-500 cursor-pointer">
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

const opTypeColors: Record<string, { bg: string; text: string; label: string }> = {
    receipt: { bg: "bg-emerald-500/10", text: "text-emerald-500", label: "Receipt" },
    delivery: { bg: "bg-violet-500/10", text: "text-violet-500", label: "Delivery" },
    adjustment: { bg: "bg-amber-500/10", text: "text-amber-500", label: "Adjustment" },
    transfer: { bg: "bg-sky-500/10", text: "text-sky-500", label: "Transfer" },
};

function OperationTypeBadge({ type }: { type: string }) {
    const c = opTypeColors[type] ?? { bg: "bg-muted", text: "text-muted-foreground", label: type };
    return <span className={`${c.bg} ${c.text} text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg text-center`}>{c.label}</span>;
}

function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
