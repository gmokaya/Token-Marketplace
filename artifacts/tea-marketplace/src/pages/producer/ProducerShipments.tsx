import { useState } from "react";
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
import { Ship, PlusCircle, ChevronDown, ChevronUp, MapPin, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLOR: Record<string, string> = {
  PENDING:           "bg-muted text-muted-foreground",
  DISPATCHED:        "bg-blue-50 text-blue-700 border-blue-200",
  IN_TRANSIT:        "bg-amber-50 text-amber-700 border-amber-200",
  AT_PORT:           "bg-purple-50 text-purple-700 border-purple-200",
  CUSTOMS_CLEARANCE: "bg-orange-50 text-orange-700 border-orange-200",
  DELIVERED:         "bg-green-50 text-green-700 border-green-200",
  CANCELLED:         "bg-red-50 text-red-600 border-red-200",
};

const EMPTY = {
  shipmentRef: "", blNumber: "", containerNumber: "", vesselName: "",
  voyageNumber: "", shippingLine: "", portOfLoading: "", portOfDischarge: "",
  destinationPort: "", incoterms: "", buyerCompany: "", buyerCountry: "",
  etd: "", eta: "", notes: "",
};

export default function ProducerShipments() {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded]     = useState<number | null>(null);
  const [milestoneOpen, setMilestoneOpen] = useState<number | null>(null);
  const [docOpen, setDocOpen]        = useState<number | null>(null);
  const [form, setForm]              = useState(EMPTY);
  const [milestone, setMilestone]    = useState({ date: "", event: "", location: "", notes: "" });
  const [doc, setDoc]                = useState({ docType: "", docName: "", fileUrl: "", issuedAt: "", issuedBy: "", expiryDate: "" });

  const { data: shipments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tea/shipments"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/tea/shipments`, { credentials: "include", signal });
      if (!res.ok) throw new Error("Failed to load shipments");
      return res.json();
    },
    enabled: !!me,
  });

  const { data: detail } = useQuery<any>({
    queryKey: ["/api/tea/shipments", expanded],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/tea/shipments/${expanded}`, { credentials: "include", signal });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: expanded !== null,
  });

  const createShipment = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${BASE}/api/tea/shipments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tea/shipments"] });
      setCreateOpen(false);
      setForm(EMPTY);
      toast({ title: "Shipment created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addMilestone = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/api/tea/shipments/${id}/milestones`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(milestone),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["/api/tea/shipments", id] });
      qc.invalidateQueries({ queryKey: ["/api/tea/shipments"] });
      setMilestoneOpen(null);
      setMilestone({ date: "", event: "", location: "", notes: "" });
      toast({ title: "Milestone added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const attachDoc = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/api/tea/shipments/${id}/docs`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["/api/tea/shipments", id] });
      setDocOpen(null);
      setDoc({ docType: "", docName: "", fileUrl: "", issuedAt: "", issuedBy: "", expiryDate: "" });
      toast({ title: "Document attached" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fForm = (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Shipment Tracking"
        description="Track physical movement from factory to buyer. Record milestones and attach export documents."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="rounded-none h-10 px-5 gap-2">
            <PlusCircle className="w-4 h-4" /> New Shipment
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : shipments.length === 0 ? (
        <div className="border border-dashed border-border p-10 text-center">
          <Ship className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No shipments yet. Create one to start tracking export docs and milestones.</p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {shipments.map((s: any) => (
            <div key={s.id}>
              <div
                className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-muted/20 cursor-pointer transition-colors"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{s.shipmentRef}</p>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR[s.status] ?? ""}`}>{s.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.portOfLoading || "-"} → {s.portOfDischarge || "-"}
                    {s.vesselName ? ` · ${s.vesselName}` : ""}
                    {s.blNumber ? ` · BL: ${s.blNumber}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.buyerCompany || ""}{s.buyerCountry ? ` (${s.buyerCountry})` : ""}
                    {s.eta ? ` · ETA: ${new Date(s.eta).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="rounded-none h-7 px-2 text-xs"
                    onClick={(e) => { e.stopPropagation(); setMilestoneOpen(s.id); }}>
                    <MapPin className="w-3 h-3 mr-1" /> Milestone
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-none h-7 px-2 text-xs"
                    onClick={(e) => { e.stopPropagation(); setDocOpen(s.id); }}>
                    <FileText className="w-3 h-3 mr-1" /> Doc
                  </Button>
                  {expanded === s.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {expanded === s.id && detail?.id === s.id && (
                <div className="bg-muted/20 px-5 pb-5 border-t border-border grid md:grid-cols-2 gap-6 mt-0 pt-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Milestones</p>
                    {(detail.milestones ?? []).length === 0
                      ? <p className="text-xs text-muted-foreground">No milestones recorded.</p>
                      : (detail.milestones as any[]).map((m: any, i: number) => (
                          <div key={i} className="flex gap-2 mb-2 text-xs">
                            <span className="text-muted-foreground shrink-0">{m.date}</span>
                            <span className="font-medium">{m.event}</span>
                            {m.location && <span className="text-muted-foreground">· {m.location}</span>}
                          </div>
                        ))
                    }
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Export Documents</p>
                    {(detail.exportDocs ?? []).length === 0
                      ? <p className="text-xs text-muted-foreground">No documents attached.</p>
                      : (detail.exportDocs as any[]).map((d: any, i: number) => (
                          <div key={i} className="flex items-start justify-between mb-2 text-xs">
                            <div>
                              <p className="font-medium">{d.docType}</p>
                              <p className="text-muted-foreground">{d.docName}{d.issuedBy ? ` · ${d.issuedBy}` : ""}</p>
                            </div>
                            {d.fileUrl && (
                              <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">View</a>
                            )}
                          </div>
                        ))
                    }
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create shipment dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-none">
          <DialogHeader><DialogTitle>New Shipment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {([
              ["shipmentRef",     "Shipment Reference *"],
              ["blNumber",        "Bill of Lading"],
              ["containerNumber", "Container Number"],
              ["vesselName",      "Vessel Name"],
              ["voyageNumber",    "Voyage Number"],
              ["shippingLine",    "Shipping Line"],
              ["portOfLoading",   "Port of Loading"],
              ["portOfDischarge", "Port of Discharge"],
              ["destinationPort", "Destination Port"],
              ["incoterms",       "Incoterms"],
              ["buyerCompany",    "Buyer Company"],
              ["buyerCountry",    "Buyer Country"],
              ["etd",             "ETD"],
              ["eta",             "ETA"],
            ] as [keyof typeof EMPTY, string][]).map(([k, label]) => (
              <div key={k}>
                <Label className="text-xs mb-1 block">{label}</Label>
                <Input
                  value={form[k]}
                  onChange={fForm(k)}
                  type={k === "etd" || k === "eta" ? "date" : "text"}
                  className="h-8 text-sm rounded-none"
                />
              </div>
            ))}
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Notes</Label>
              <Textarea value={form.notes} onChange={fForm("notes")} rows={2} className="text-sm rounded-none resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="rounded-none" disabled={createShipment.isPending || !form.shipmentRef}
              onClick={() => createShipment.mutate(form)}>
              {createShipment.isPending ? "Creating…" : "Create Shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add milestone dialog */}
      <Dialog open={milestoneOpen !== null} onOpenChange={(o) => !o && setMilestoneOpen(null)}>
        <DialogContent className="max-w-sm rounded-none">
          <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {([["date","Date","date"],["event","Event *","text"],["location","Location","text"],["notes","Notes","text"]] as [keyof typeof milestone, string, string][]).map(([k, label, type]) => (
              <div key={k}>
                <Label className="text-xs mb-1 block">{label}</Label>
                <Input type={type} value={milestone[k]} onChange={(e) => setMilestone((p) => ({ ...p, [k]: e.target.value }))} className="h-8 text-sm rounded-none" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setMilestoneOpen(null)}>Cancel</Button>
            <Button className="rounded-none" disabled={!milestone.event || addMilestone.isPending}
              onClick={() => milestoneOpen !== null && addMilestone.mutate(milestoneOpen)}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attach doc dialog */}
      <Dialog open={docOpen !== null} onOpenChange={(o) => !o && setDocOpen(null)}>
        <DialogContent className="max-w-sm rounded-none">
          <DialogHeader><DialogTitle>Attach Export Document</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {([["docType","Document Type *"],["docName","Document Name *"],["fileUrl","File URL"],["issuedAt","Issued Date"],["issuedBy","Issued By"],["expiryDate","Expiry Date"]] as [keyof typeof doc, string][]).map(([k, label]) => (
              <div key={k}>
                <Label className="text-xs mb-1 block">{label}</Label>
                <Input value={doc[k]} onChange={(e) => setDoc((p) => ({ ...p, [k]: e.target.value }))} className="h-8 text-sm rounded-none" placeholder={k === "docType" ? "Bill of Lading, Phytosanitary Certificate…" : ""} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setDocOpen(null)}>Cancel</Button>
            <Button className="rounded-none" disabled={!doc.docType || !doc.docName || attachDoc.isPending}
              onClick={() => docOpen !== null && attachDoc.mutate(docOpen)}>
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
