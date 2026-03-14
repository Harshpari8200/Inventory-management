"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
    LayoutDashboard,
    Package,
    PackagePlus,
    MapPin,
    Tag,
    RotateCcw,
    Truck,
    ArrowDownToLine,
    ArrowUpFromLine,
    ClipboardEdit,
    History,
    Settings,
    Warehouse,
    User,
    LogOut,
    Search,
    ChevronDown,
    ChevronRight,
    Loader2,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
];

const productsSub = [
    { href: "/dashboard/products", icon: PackagePlus, label: "Create / Update" },
    { href: "/dashboard/products/stock-location", icon: MapPin, label: "Stock by Location" },
    { href: "/dashboard/products/categories", icon: Tag, label: "Categories" },
    { href: "/dashboard/products/reorder", icon: RotateCcw, label: "Reordering Rules" },
];

const operationsSub = [
    { href: "/dashboard/operations/receipts", icon: ArrowDownToLine, label: "Receipts" },
    { href: "/dashboard/operations/deliveries", icon: ArrowUpFromLine, label: "Delivery Orders" },
    { href: "/dashboard/operations/adjustments", icon: ClipboardEdit, label: "Inventory Adjustment" },
    { href: "/dashboard/operations/history", icon: History, label: "Move History" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();
    const [productsOpen, setProductsOpen] = useState(pathname.startsWith("/dashboard/products"));
    const [operationsOpen, setOperationsOpen] = useState(pathname.startsWith("/dashboard/operations"));
    const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/dashboard/settings"));

    // ── Auth Guard ──────────────────────────────────────────────
    useEffect(() => {
        if (!isPending && !session?.user) {
            router.replace("/login");
        }
    }, [isPending, session, router]);

    // Loading state while checking auth
    if (isPending) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Not authenticated — will redirect, show nothing
    if (!session?.user) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    const isActive = (href: string) => pathname === href;
    const isGroupActive = (prefix: string) => pathname.startsWith(prefix);
    const isManager = (session?.user as { role?: string })?.role === "manager";

    return (
        <div className="flex h-screen bg-background text-foreground font-sans selection:bg-emerald-500/30">
            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <aside className="w-72 border-r border-border bg-card flex flex-col shrink-0">
                <div className="p-6 border-b border-border"><AppLogo /></div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {/* Dashboard */}
                    <SidebarButton
                        icon={<LayoutDashboard className="w-4 h-4" />}
                        label="Dashboard"
                        active={pathname === "/dashboard"}
                        onClick={() => router.push("/dashboard")}
                    />

                    {/* Products (Manager Only) */}
                    {isManager && (
                        <div>
                            <SidebarButton
                                icon={<Package className="w-4 h-4" />}
                                label="Products"
                                active={isGroupActive("/dashboard/products") && !productsOpen}
                                onClick={() => setProductsOpen(!productsOpen)}
                                trailing={productsOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-50" /> : <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                            />
                            {productsOpen && (
                                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                                    {productsSub.map((item) => (
                                        <SidebarSubItem
                                            key={item.href}
                                            icon={<item.icon className="w-3.5 h-3.5" />}
                                            label={item.label}
                                            active={isActive(item.href)}
                                            onClick={() => router.push(item.href)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Operations */}
                    <div>
                        <SidebarButton
                            icon={<Truck className="w-4 h-4" />}
                            label="Operations"
                            active={isGroupActive("/dashboard/operations") && !operationsOpen}
                            onClick={() => setOperationsOpen(!operationsOpen)}
                            trailing={operationsOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-50" /> : <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                        />
                        {operationsOpen && (
                            <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                                {operationsSub.filter(item => isManager || !["Receipts", "Delivery Orders"].includes(item.label)).map((item) => (
                                    <SidebarSubItem
                                        key={item.href}
                                        icon={<item.icon className="w-3.5 h-3.5" />}
                                        label={item.label}
                                        active={isActive(item.href)}
                                        onClick={() => router.push(item.href)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Settings (Manager Only) */}
                    {isManager && (
                        <div>
                            <SidebarButton
                                icon={<Settings className="w-4 h-4" />}
                                label="Settings"
                                active={isGroupActive("/dashboard/settings") && !settingsOpen}
                                onClick={() => setSettingsOpen(!settingsOpen)}
                                trailing={settingsOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-50" /> : <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                            />
                            {settingsOpen && (
                                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                                    <SidebarSubItem
                                        icon={<Warehouse className="w-3.5 h-3.5" />}
                                        label="Warehouse"
                                        active={isActive("/dashboard/settings/warehouse")}
                                        onClick={() => router.push("/dashboard/settings/warehouse")}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                <div className="p-4 border-t border-border space-y-1">
                    <SidebarButton
                        icon={<User className="w-4 h-4" />}
                        label="My Profile"
                        active={isGroupActive("/dashboard/profile")}
                        onClick={() => router.push("/dashboard/profile")}
                    />
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" /><span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* ── Main Content ─────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 border-b border-border px-8 flex items-center justify-between bg-background/50 backdrop-blur-sm shrink-0">
                    <Suspense fallback={<div className="w-72 h-8 bg-muted rounded-xl animate-pulse" />}>
                        <GlobalSearch />
                    </Suspense>
                    <ThemeToggle />
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function GlobalSearch() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const q = searchParams.get("q") || "";

    return (
        <div className="flex items-center gap-3 bg-muted px-4 py-1.5 rounded-xl border border-border w-72">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
                value={q}
                onChange={(e) => {
                    const val = e.target.value;
                    const params = new URLSearchParams(searchParams);
                    if (val) {
                        params.set("q", val);
                    } else {
                        params.delete("q");
                    }
                    router.push(`${pathname}?${params.toString()}`);
                }}
                placeholder="Search SKUs, products..."
                className="bg-transparent text-sm w-full outline-none"
            />
        </div>
    );
}

function SidebarButton({ icon, label, active, onClick, trailing }: {
    icon: React.ReactNode; label: string; active?: boolean;
    onClick?: () => void; trailing?: React.ReactNode;
}) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all text-left text-sm border ${active ? "bg-primary/10 border-primary/20 text-foreground font-semibold" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            {icon}<span className="flex-1">{label}</span>{trailing}
        </button>
    );
}

function SidebarSubItem({ icon, label, active, onClick }: {
    icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void;
}) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${active ? "bg-primary/10 text-foreground font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            {icon}<span>{label}</span>
        </button>
    );
}
