import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, ShieldCheck, RefreshCw } from "lucide-react";
import { formatTier } from "@/lib/formatTier";

const API = import.meta.env.VITE_API_URL ?? "";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  company: string | null;
  tier: "PRODUCER" | "OFF_TAKER" | "ENABLER" | "FINANCIER" | "COOPERATIVE" | "ADMIN";
  kybStatus: "PENDING" | "APPROVED" | "REJECTED";
  reputationScore: string | number | null;
  createdAt: string;
};

const TIER_OPTIONS = ["ALL", "PRODUCER", "OFF_TAKER", "ENABLER", "FINANCIER", "COOPERATIVE", "ADMIN"] as const;
const KYB_OPTIONS  = ["PENDING", "APPROVED", "REJECTED"] as const;

const TIER_COLORS: Record<string, string> = {
  PRODUCER:  "bg-green-100 text-green-800",
  OFF_TAKER: "bg-blue-100 text-blue-800",
  ENABLER:   "bg-purple-100 text-purple-800",
  FINANCIER: "bg-slate-100 text-slate-700",
  COOPERATIVE: "bg-cyan-100 text-cyan-800",
  ADMIN:     "bg-red-100 text-red-800",
};

const KYB_COLORS: Record<string, string> = {
  PENDING:  "bg-slate-100 text-slate-700",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

async function fetchAdminUsers(tier: string, search: string): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  if (tier && tier !== "ALL") params.set("tier", tier);
  if (search.trim()) params.set("search", search.trim());
  const res = await fetch(`${API}/api/admin/users?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function patchUser(id: number, data: { tier?: string; kybStatus?: string }): Promise<AdminUser> {
  const res = await fetch(`${API}/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTier, setEditTier] = useState("");
  const [editKyb, setEditKyb] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-users", tierFilter, search],
    queryFn: () => fetchAdminUsers(tierFilter, search),
  });

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { tier?: string; kybStatus?: string } }) =>
      patchUser(id, data),
    onSuccess: () => {
      toast({ title: "User updated" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingId(null);
    },
    onError: (e: any) => {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    },
  });

  function startEdit(u: AdminUser) {
    setEditingId(u.id);
    setEditTier(u.tier);
    setEditKyb(u.kybStatus);
  }

  function saveEdit(id: number) {
    mutation.mutate({ id, data: { tier: editTier, kybStatus: editKyb } });
  }

  const tierCounts = TIER_OPTIONS.filter(t => t !== "ALL").reduce<Record<string, number>>((acc, t) => {
    acc[t] = users.filter(u => u.tier === t).length;
    return acc;
  }, {});

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="w-7 h-7 text-primary" /> User Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage platform users, roles, and KYB status</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* tier summary cards */}
        <div className="grid grid-cols-6 gap-4">
          {(["PRODUCER","OFF_TAKER","ENABLER","FINANCIER","COOPERATIVE","ADMIN"] as const).map(t => (
            <Card key={t} className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setTierFilter(t === tierFilter as any ? "ALL" : t)}>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold">{tierCounts[t] ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatTier(t)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, email, company…" className="pl-9"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              {TIER_OPTIONS.map(t => <SelectItem key={t} value={t}>{t === "ALL" ? "All tiers" : formatTier(t)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              {isLoading ? "Loading…" : `${users.length} user${users.length !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">KYB</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rep.</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Loading users…</td></tr>
                  )}
                  {!isLoading && users.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No users found</td></tr>
                  )}
                  {users.map(u => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.company ?? "-"}</td>

                      {/* role cell */}
                      <td className="px-4 py-3">
                        {editingId === u.id ? (
                          <Select value={editTier} onValueChange={setEditTier}>
                            <SelectTrigger className="h-7 w-36 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIER_OPTIONS.filter(t => t !== "ALL").map(t =>
                                <SelectItem key={t} value={t} className="text-xs">{formatTier(t)}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[u.tier]}`}>
                            {formatTier(u.tier)}
                          </span>
                        )}
                      </td>

                      {/* kyb cell */}
                      <td className="px-4 py-3">
                        {editingId === u.id ? (
                          <Select value={editKyb} onValueChange={setEditKyb}>
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {KYB_OPTIONS.map(k =>
                                <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${KYB_COLORS[u.kybStatus]}`}>
                            {u.kybStatus}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 tabular-nums">{Number(u.reputationScore ?? 100).toFixed(0)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* actions */}
                      <td className="px-5 py-3 text-right">
                        {editingId === u.id ? (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" className="h-7 px-3 text-xs"
                              onClick={() => saveEdit(u.id)} disabled={mutation.isPending}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-3 text-xs"
                              onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 px-3 text-xs"
                            onClick={() => startEdit(u)}>
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
