import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useListCoopMembers, useAddCoopMember, getListCoopMembersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Search, Lock, Eye } from "lucide-react";

const ACCENT = "hsl(180 62% 10%)";

export default function MemberLedger() {
  const { data: members, isLoading } = useListCoopMembers();
  const { mutateAsync: addMember, isPending } = useAddCoopMember();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", nationalId: "", farmLocation: "", gender: "", acreageMt: "" });

  const filtered = (members ?? []).filter(m =>
    m.memberRef.toLowerCase().includes(search.toLowerCase()) ||
    m.farmLocation?.toLowerCase().includes(search.toLowerCase()) ||
    m.gender?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit() {
    if (!form.fullName || !form.nationalId) {
      toast({ title: "Validation Error", description: "Full name and national ID are required.", variant: "destructive" });
      return;
    }
    try {
      await addMember({ data: {
        fullName: form.fullName,
        nationalId: form.nationalId,
        farmLocation: form.farmLocation || undefined,
        gender: form.gender || undefined,
        acreageMt: form.acreageMt ? parseFloat(form.acreageMt) : undefined,
      } as any });
      await qc.invalidateQueries({ queryKey: getListCoopMembersQueryKey() });
      toast({ title: "Member Added", description: "Member ref has been generated and saved." });
      setOpen(false);
      setForm({ fullName: "", nationalId: "", farmLocation: "", gender: "", acreageMt: "" });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Member Ledger</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Privacy-protected farmer roster. Individual identities are hashed into opaque member references.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} style={{ background: ACCENT }} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Add Member
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by location, gender…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Lock className="w-4 h-4" style={{ color: ACCENT }} />
            <CardTitle className="text-base">
              {(members ?? []).length} Members — Identities Privacy-Hashed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {(members ?? []).length === 0 ? "No members yet. Add the first member to build the roster." : "No results for this search."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="pb-2 pr-4">Member Reference</th>
                      <th className="pb-2 pr-4">Farm Location</th>
                      <th className="pb-2 pr-4">Gender</th>
                      <th className="pb-2 pr-4">Acreage (MT)</th>
                      <th className="pb-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(m => (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{m.memberRef}</code>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{m.farmLocation ?? "—"}</td>
                        <td className="py-2.5 pr-4">
                          {m.gender ? <Badge variant="outline" className="text-xs">{m.gender}</Badge> : "—"}
                        </td>
                        <td className="py-2.5 pr-4">{m.acreageMt ? `${parseFloat(String(m.acreageMt)).toFixed(2)}` : "—"}</td>
                        <td className="py-2.5 text-muted-foreground text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <Eye className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Full name and national ID are stored encrypted and are only used to generate the opaque <strong>MEMBER_REF</strong>. 
            They are never exposed outside this management interface.
          </span>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Cooperative Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="e.g. Jane Njeri Kamau" />
            </div>
            <div className="space-y-1.5">
              <Label>National ID *</Label>
              <Input value={form.nationalId} onChange={e => setForm(p => ({ ...p, nationalId: e.target.value }))} placeholder="e.g. 12345678" />
            </div>
            <div className="space-y-1.5">
              <Label>Farm Location</Label>
              <Input value={form.farmLocation} onChange={e => setForm(p => ({ ...p, farmLocation: e.target.value }))} placeholder="e.g. Meru County" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Input value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} placeholder="e.g. Female" />
              </div>
              <div className="space-y-1.5">
                <Label>Acreage (acres)</Label>
                <Input type="number" min="0" value={form.acreageMt} onChange={e => setForm(p => ({ ...p, acreageMt: e.target.value }))} placeholder="e.g. 2.5" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} style={{ background: ACCENT }}>
              {isPending ? "Adding…" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
