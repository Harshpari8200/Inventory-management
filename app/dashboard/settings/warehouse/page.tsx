"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Warehouse, MapPin, Layers, Plus, Pencil,
    Trash2, Check, X, Package,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

const typeIcons: Record<string, React.ReactNode> = {
    warehouse: <Warehouse className="w-4 h-4 text-emerald-500" />,
    zone: <Layers className="w-4 h-4 text-sky-500" />,
    rack: <MapPin className="w-4 h-4 text-amber-500" />,
};

const typeLabels: Record<string, string> = {
    warehouse: "Warehouse",
    zone: "Zone",
    rack: "Rack",
};

export default function WarehouseSettingsPage() {
    const locations = useQuery(api.inventory.getLocations);
    const createLocation = useMutation(api.products.createLocation);
    const updateLocation = useMutation(api.products.updateLocation);
    const deleteLocation = useMutation(api.products.deleteLocation);

    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState<"warehouse" | "zone" | "rack">("warehouse");
    const [newParent, setNewParent] = useState("");
    const [saving, setSaving] = useState(false);

    // Inline editing
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState<"warehouse" | "zone" | "rack">("warehouse");

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            await createLocation({
                name: newName.trim(),
                type: newType,
                parentId: newParent ? (newParent as Id<"locations">) : undefined,
            });
            setNewName("");
            setNewType("warehouse");
            setNewParent("");
            setCreating(false);
        } finally { setSaving(false); }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;
        await updateLocation({
            id: id as Id<"locations">,
            name: editName.trim(),
            type: editType,
        });
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        await deleteLocation({ id: id as Id<"locations"> });
    };

    const startEdit = (loc: any) => {
        setEditingId(loc._id);
        setEditName(loc.name);
        setEditType(loc.type);
    };

    // Group locations by type
    const warehouses = locations?.filter((l) => l.type === "warehouse") ?? [];
    const zones = locations?.filter((l) => l.type === "zone") ?? [];
    const racks = locations?.filter((l) => l.type === "rack") ?? [];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black">Warehouse Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage warehouses, zones, and racks. All stock is linked to these locations.</p>
                </div>
                <Button onClick={() => setCreating(true)} className="bg-primary hover:bg-emerald-600 rounded-xl gap-2 font-bold h-9 text-sm">
                    <Plus className="w-4 h-4" /> Add Location
                </Button>
            </div>

            {/* Create Form */}
            {creating && (
                <div className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="text-sm font-bold mb-4">New Location</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <Input placeholder="Location name" value={newName} onChange={(e) => setNewName(e.target.value)} className="rounded-xl h-10" />
                        <select value={newType} onChange={(e) => setNewType(e.target.value as any)} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all">
                            <option value="warehouse">Warehouse</option>
                            <option value="zone">Zone</option>
                            <option value="rack">Rack</option>
                        </select>
                        <select value={newParent} onChange={(e) => setNewParent(e.target.value)} className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm outline-none focus:border-emerald-500 transition-all">
                            <option value="">No parent</option>
                            {locations?.filter((l) => l.type === "warehouse" || l.type === "zone").map((l) => (
                                <option key={l._id} value={l._id}>{l.name}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <Button onClick={handleCreate} disabled={saving} className="bg-primary hover:bg-emerald-600 rounded-xl h-10 font-bold flex-1">{saving ? "…" : "Add"}</Button>
                            <Button variant="outline" onClick={() => setCreating(false)} className="rounded-xl h-10">Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                {([
                    { type: "warehouse", count: warehouses.length, icon: <Warehouse className="w-5 h-5" />, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { type: "zone", count: zones.length, icon: <Layers className="w-5 h-5" />, color: "text-sky-500", bg: "bg-sky-500/10" },
                    { type: "rack", count: racks.length, icon: <MapPin className="w-5 h-5" />, color: "text-amber-500", bg: "bg-amber-500/10" },
                ] as const).map((card) => (
                    <div key={card.type} className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center ${card.color}`}>{card.icon}</div>
                        <div>
                            <p className="text-2xl font-black">{card.count}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{card.type}s</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Location List */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-2 grid grid-cols-[40px_1fr_120px_1fr_100px] gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                    <span></span><span>Name</span><span>Type</span><span>Parent</span><span className="text-right">Actions</span>
                </div>
                <div className="divide-y divide-border">
                    {locations === undefined && <div className="px-6 py-8 text-center text-sm text-muted-foreground">Loading…</div>}
                    {locations?.length === 0 && <div className="px-6 py-8 text-center text-sm text-muted-foreground">No locations configured yet.</div>}
                    {locations?.map((loc) => (
                        <div key={loc._id} className="px-6 py-3 grid grid-cols-[40px_1fr_120px_1fr_100px] gap-4 items-center text-sm hover:bg-muted/50 transition-colors">
                            <span>{typeIcons[loc.type]}</span>
                            {editingId === loc._id ? (
                                <>
                                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-lg h-8 text-sm" />
                                    <select value={editType} onChange={(e) => setEditType(e.target.value as any)} className="bg-background border border-border rounded-lg h-8 px-2 text-xs outline-none">
                                        <option value="warehouse">Warehouse</option>
                                        <option value="zone">Zone</option>
                                        <option value="rack">Rack</option>
                                    </select>
                                    <span className="text-xs text-muted-foreground">—</span>
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => handleUpdate(loc._id)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg"><Check className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span className="font-medium">{loc.name}</span>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${loc.type === "warehouse" ? "text-emerald-500" : loc.type === "zone" ? "text-sky-500" : "text-amber-500"}`}>{typeLabels[loc.type]}</span>
                                    <span className="text-xs text-muted-foreground">{loc.parentId ? locations.find((l) => l._id === loc.parentId)?.name ?? "—" : "—"}</span>
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => startEdit(loc)} className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDelete(loc._id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
