import { useState } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  PlusCircle, Leaf, ExternalLink, Edit2, Archive, QrCode, ChevronRight,
  Radio, Clock, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLOR: Record<string, string> = {
  draft:    "bg-muted text-muted-foreground",
  active:   "bg-green-50 text-green-700 border-green-200",
  archived: "bg-red-50 text-red-600 border-red-200",
};

const PUB_STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  live:          { label: "Live",          className: "bg-green-50 text-green-700 border-green-200", icon: Radio },
  pending:       { label: "Pending",       className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  update_pending:{ label: "Update Pending",className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  failed:        { label: "Failed",        className: "bg-red-50 text-red-600 border-red-200",       icon: AlertCircle },
  not_published: { label: "Not Published", className: "bg-muted text-muted-foreground",              icon: Leaf },
  unpublished:   { label: "Unpublished",   className: "bg-muted text-muted-foreground",              icon: Leaf },
};

const EMPTY_FORM = {
  name: "", grade: "", region: "", altitude: "", cultivar: "",
  harvestDate: "", processingMethod: "", tastingNotes: "",
  packageType: "", batchInfo: "", availableQuantityKg: "",
  certifications: "", factoryName: "", originCountry: "Kenya", originRegion: "",
  status: "draft",
};

export default function ProducerProducts() {
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: products = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tea/products"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/tea/products`, { credentials: "include", signal });
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
    enabled: !!me,
  });

  // Fetch all lots owned by this producer so we can join publication status
  const { data: myLots = [] } = useQuery<any[]>({
    queryKey: ["/api/tea/lots", "owner", me?.id],
    queryFn: async ({ signal }) => {
      if (!me?.id) return [];
      const res = await fetch(`${BASE}/api/tea/lots?ownerId=${me.id}`, { credentials: "include", signal });
      if (!res.ok) throw new Error("Failed to load lots");
      return res.json();
    },
    enabled: !!me?.id,
  });

  // Fetch all publications for this producer
  const { data: publications = [] } = useQuery<any[]>({
    queryKey: ["/api/listing-publications", "factory", me?.id],
    queryFn: async ({ signal }) => {
      if (!me?.id) return [];
      const res = await fetch(`${BASE}/api/listing-publications?factoryId=${me.id}`, { credentials: "include", signal });
      if (!res.ok) throw new Error("Failed to load publications");
      return res.json();
    },
    enabled: !!me?.id,
  });

  // Summarise marketplace publication state
  const pubCounts = {
    live:    publications.filter((p: any) => p.status === "live").length,
    pending: publications.filter((p: any) => ["pending", "update_pending"].includes(p.status)).length,
    failed:  publications.filter((p: any) => p.status === "failed").length,
  };
  const totalLots = myLots.length;

  const upsert = useMutation({
    mutationFn: async (data: any) => {
      const url  = editId ? `${BASE}/api/tea/products/${editId}` : `${BASE}/api/tea/products`;
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tea/products"] });
      setDialogOpen(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      toast({ title: editId ? "Product updated" : "Product created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const archive = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/api/tea/products/${id}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tea/products"] });
      toast({ title: "Product archived" });
    },
  });

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(p: any) {
    setEditId(p.id);
    setForm({
      name: p.name ?? "", grade: p.grade ?? "", region: p.region ?? "",
      altitude: p.altitude ?? "", cultivar: p.cultivar ?? "",
      harvestDate: p.harvestDate ?? "", processingMethod: p.processingMethod ?? "",
      tastingNotes: p.tastingNotes ?? "", packageType: p.packageType ?? "",
      batchInfo: p.batchInfo ?? "",
      availableQuantityKg: p.availableQuantityKg ?? "",
      certifications: (p.certifications ?? []).join(", "),
      factoryName: p.factoryName ?? "", originCountry: p.originCountry ?? "Kenya",
      originRegion: p.originRegion ?? "", status: p.status ?? "draft",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const data = {
      ...form,
      availableQuantityKg: form.availableQuantityKg ? parseFloat(form.availableQuantityKg) : undefined,
      certifications: form.certifications
        ? form.certifications.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };
    upsert.mutate(data);
  }

  function f(k: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tea Product Catalogue"
        description="Manage your product records. Each product gets a stable Digital e-Passport ID for buyer due diligence."
        actions={
          <Button onClick={openCreate} className="rounded-none h-10 px-5 gap-2">
            <PlusCircle className="w-4 h-4" /> New Product
          </Button>
        }
      />

      {/* Marketplace Publication Summary */}
      {totalLots > 0 && (
        <div className="border border-border p-4 bg-muted/5 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Marketplace Sync</p>
            <p className="text-xs text-muted-foreground">{totalLots} lot{totalLots !== 1 ? "s" : ""} total</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-green-600" />
            <span className="text-sm font-semibold text-green-700">{pubCounts.live}</span>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">{pubCounts.pending}</span>
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
          {pubCounts.failed > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-sm font-semibold text-red-600">{pubCounts.failed}</span>
              <span className="text-xs text-muted-foreground">Failed</span>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="rounded-none h-7 text-xs ml-auto"
            onClick={() => setLocation("/producer")}
          >
            View Lots &amp; Sync Status
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : products.length === 0 ? (
        <div className="border border-dashed border-border p-10 text-center space-y-3">
          <Leaf className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No products yet. Create your first tea product to generate a Digital e-Passport.</p>
          <Button onClick={openCreate} variant="outline" className="rounded-none">
            <PlusCircle className="w-4 h-4 mr-2" /> Create Product
          </Button>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {products.map((p: any) => (
            <div key={p.id} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{p.name}</p>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR[p.status] ?? ""}`}>
                    {p.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.grade} · {p.region}{p.altitude ? ` · ${p.altitude}` : ""}{p.processingMethod ? ` · ${p.processingMethod}` : ""}
                </p>
                {p.availableQuantityKg && (
                  <p className="text-xs text-muted-foreground mt-0.5">{parseFloat(p.availableQuantityKg).toLocaleString()} kg available</p>
                )}
                {(p.certifications ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(p.certifications as string[]).map((c) => (
                      <span key={c} className="text-[10px] bg-primary/8 text-primary px-1.5 py-0.5 border border-primary/20">{c}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-2">
                  <QrCode className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-mono text-muted-foreground">{p.passportId}</span>
                  <button
                    onClick={() => setLocation(`/producer/passports/${p.passportId}`)}
                    className="text-[10px] text-primary flex items-center gap-0.5 hover:underline ml-1"
                  >
                    View passport <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="rounded-none h-8 px-2 text-xs" onClick={() => openEdit(p)}>
                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                </Button>
                {p.status !== "archived" && (
                  <Button
                    size="sm" variant="ghost"
                    className="rounded-none h-8 px-2 text-xs text-red-600 hover:text-red-700"
                    onClick={() => archive.mutate(p.id)}
                  >
                    <Archive className="w-3 h-3 mr-1" /> Archive
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="rounded-none h-8 w-8 p-0"
                  onClick={() => setLocation(`/producer/products/${p.id}`)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-none">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Product" : "New Tea Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {([
              ["name",             "Product Name *"],
              ["grade",            "Grade *"],
              ["region",           "Region *"],
              ["altitude",         "Altitude"],
              ["cultivar",         "Cultivar"],
              ["harvestDate",      "Harvest Date"],
              ["processingMethod", "Processing Method"],
              ["packageType",      "Package Type"],
              ["batchInfo",        "Batch Reference"],
              ["availableQuantityKg", "Available Qty (kg)"],
              ["factoryName",      "Factory Name"],
              ["originCountry",    "Origin Country"],
              ["originRegion",     "Origin Region"],
            ] as [keyof typeof EMPTY_FORM, string][]).map(([key, label]) => (
              <div key={key} className={key === "name" ? "col-span-2" : ""}>
                <Label className="text-xs mb-1 block">{label}</Label>
                <Input value={form[key]} onChange={f(key)} className="h-8 text-sm rounded-none" />
              </div>
            ))}

            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Tasting Notes</Label>
              <Textarea value={form.tastingNotes} onChange={f("tastingNotes")} rows={2} className="text-sm rounded-none resize-none" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Certifications (comma-separated)</Label>
              <Input value={form.certifications} onChange={f("certifications")} placeholder="Rainforest Alliance, UTZ, Fairtrade" className="h-8 text-sm rounded-none" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status</Label>
              <select value={form.status} onChange={f("status")} className="w-full h-8 text-sm border border-input bg-background px-2 rounded-none">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-none" onClick={handleSubmit} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : editId ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
