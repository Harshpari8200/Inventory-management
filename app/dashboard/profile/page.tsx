"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    User, Mail, KeyRound, Shield, Calendar,
    Check, Pencil, Eye, EyeOff,
} from "lucide-react";

export default function ProfilePage() {
    const { data: session } = authClient.useSession();
    const user = session?.user;

    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    // Password change
    const [changingPw, setChangingPw] = useState(false);
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    const startEdit = () => {
        setEditName(user?.name ?? "");
        setEditing(true);
        setSuccess("");
        setError("");
    };

    const handleUpdateName = async () => {
        if (!editName.trim()) return;
        setSaving(true);
        setError("");
        try {
            await authClient.updateUser({ name: editName.trim() });
            setSuccess("Profile updated successfully.");
            setEditing(false);
        } catch (e: any) {
            setError(e.message ?? "Failed to update profile.");
        } finally { setSaving(false); }
    };

    const handleChangePw = async () => {
        if (newPw !== confirmPw) { setError("New passwords don't match."); return; }
        if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
        setSaving(true);
        setError("");
        try {
            await authClient.changePassword({ currentPassword: currentPw, newPassword: newPw });
            setSuccess("Password changed successfully.");
            setChangingPw(false);
            setCurrentPw("");
            setNewPw("");
            setConfirmPw("");
        } catch (e: any) {
            setError(e.message ?? "Failed to change password.");
        } finally { setSaving(false); }
    };

    const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black">My Profile</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your account details and security settings.</p>
            </div>

            {/* Feedback */}
            {success && <div className="bg-emerald-500/10 text-emerald-500 text-sm px-4 py-2.5 rounded-xl font-medium">{success}</div>}
            {error && <div className="bg-destructive/10 text-destructive text-sm px-4 py-2.5 rounded-xl font-medium">{error}</div>}

            {/* Avatar + Name Card */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-xl font-black shrink-0">
                        {(user?.name ?? "U").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        {editing ? (
                            <div className="flex items-center gap-3">
                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-xl h-10 max-w-xs" placeholder="Login ID" />
                                <Button size="sm" onClick={handleUpdateName} disabled={saving} className="bg-primary hover:bg-emerald-600 rounded-xl h-9 font-bold gap-1">
                                    <Check className="w-3.5 h-3.5" /> {saving ? "…" : "Save"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="rounded-xl h-9">Cancel</Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold">{user?.name ?? "—"}</h2>
                                <button onClick={startEdit} className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition"><Pencil className="w-3.5 h-3.5" /></button>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Login ID</p>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="bg-card border border-border rounded-2xl divide-y divide-border">
                <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={user?.email ?? "—"} />
                <DetailRow icon={<KeyRound className="w-4 h-4" />} label="User ID" value={user?.id ? user.id.slice(0, 16) + "…" : "—"} mono />
                <DetailRow icon={<Calendar className="w-4 h-4" />} label="Joined" value={joined} />
            </div>

            {/* Security */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-primary" />
                        <h3 className="font-bold">Security</h3>
                    </div>
                    {!changingPw && (
                        <Button variant="outline" size="sm" onClick={() => { setChangingPw(true); setSuccess(""); setError(""); }} className="rounded-xl h-8 text-xs font-bold">
                            Change Password
                        </Button>
                    )}
                </div>

                {changingPw && (
                    <div className="space-y-3 max-w-sm">
                        <div className="relative">
                            <Input type={showCurrentPw ? "text" : "password"} placeholder="Current password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="rounded-xl h-10 pr-10" />
                            <button onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="relative">
                            <Input type={showNewPw ? "text" : "password"} placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="rounded-xl h-10 pr-10" />
                            <button onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <Input type="password" placeholder="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="rounded-xl h-10" />
                        <div className="flex gap-2 pt-1">
                            <Button onClick={handleChangePw} disabled={saving} className="bg-primary hover:bg-emerald-600 rounded-xl h-9 font-bold">{saving ? "Saving…" : "Update Password"}</Button>
                            <Button variant="outline" onClick={() => { setChangingPw(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }} className="rounded-xl h-9">Cancel</Button>
                        </div>
                    </div>
                )}

                {!changingPw && (
                    <p className="text-xs text-muted-foreground">Your password was last updated at sign-up. We recommend changing it periodically.</p>
                )}
            </div>
        </div>
    );
}

function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
    return (
        <div className="px-6 py-3.5 flex items-center gap-4">
            <span className="text-muted-foreground">{icon}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-28">{label}</span>
            <span className={`text-sm font-medium flex-1 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
        </div>
    );
}
