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
import { MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLOR: Record<string, string> = {
  open:        "bg-blue-50 text-blue-700 border-blue-200",
  quoted:      "bg-amber-50 text-amber-700 border-amber-200",
  negotiating: "bg-purple-50 text-purple-700 border-purple-200",
  accepted:    "bg-green-50 text-green-700 border-green-200",
  rejected:    "bg-red-50 text-red-600 border-red-200",
  expired:     "bg-muted text-muted-foreground",
  converted:   "bg-primary/10 text-primary border-primary/20",
};

export default function ProducerRfqs() {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [expanded, setExpanded] = useState<number | null>(null);
  const [quoteDialog, setQuoteDialog] = useState<number | null>(null);
  const [quote, setQuote] = useState({ offerPriceUsdPerKg: "", offerQuantityKg: "", incoterms: "", leadTimeDays: "", validUntil: "", notes: "", commercialPitch: "" });
  const [msgText, setMsgText] = useState<Record<number, string>>({});

  const { data: rfqs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tea/rfqs"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/tea/rfqs`, { credentials: "include", signal });
      if (!res.ok) throw new Error("Failed to load RFQs");
      return res.json();
    },
    enabled: !!me,
  });

  const { data: detail } = useQuery<any>({
    queryKey: ["/api/tea/rfqs", expanded],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/tea/rfqs/${expanded}`, { credentials: "include", signal });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: expanded !== null,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ rfqId, content }: { rfqId: number; content: string }) => {
      const res = await fetch(`${BASE}/api/tea/rfqs/${rfqId}/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, senderRole: "factory" }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: (_, { rfqId }) => {
      qc.invalidateQueries({ queryKey: ["/api/tea/rfqs", rfqId] });
      setMsgText((prev) => ({ ...prev, [rfqId]: "" }));
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submitQuote = useMutation({
    mutationFn: async (rfqId: number) => {
      const res = await fetch(`${BASE}/api/tea/rfqs/${rfqId}/quotations`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerPriceUsdPerKg: parseFloat(quote.offerPriceUsdPerKg),
          offerQuantityKg:    parseFloat(quote.offerQuantityKg),
          incoterms:          quote.incoterms || undefined,
          leadTimeDays:       quote.leadTimeDays ? parseInt(quote.leadTimeDays) : undefined,
          validUntil:         quote.validUntil || undefined,
          notes:              quote.notes || undefined,
          commercialPitch:    quote.commercialPitch || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: (_, rfqId) => {
      qc.invalidateQueries({ queryKey: ["/api/tea/rfqs"] });
      qc.invalidateQueries({ queryKey: ["/api/tea/rfqs", rfqId] });
      setQuoteDialog(null);
      setQuote({ offerPriceUsdPerKg: "", offerQuantityKg: "", incoterms: "", leadTimeDays: "", validUntil: "", notes: "", commercialPitch: "" });
      toast({ title: "Quotation submitted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="RFQ Inbox"
        description="Requests for Quotation from buyers. Respond with a quotation and negotiate terms."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rfqs.length === 0 ? (
        <div className="border border-dashed border-border p-10 text-center">
          <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No RFQs yet. Buyers will appear here when they enquire on your listings.</p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {rfqs.map((rfq: any) => (
            <div key={rfq.id}>
              <div
                className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-muted/20 cursor-pointer transition-colors"
                onClick={() => setExpanded(expanded === rfq.id ? null : rfq.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{rfq.buyerCompany || `RFQ #${rfq.id}`}</p>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR[rfq.status] ?? ""}`}>
                      {rfq.status}
                    </Badge>
                    {rfq.externalRfqId && (
                      <span className="text-[10px] text-muted-foreground">ext: {rfq.externalRfqId}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rfq.requestedQuantityKg ? `${parseFloat(rfq.requestedQuantityKg).toLocaleString()} kg` : "Qty TBD"}
                    {rfq.requestedPriceUsdPerKg ? ` · $${parseFloat(rfq.requestedPriceUsdPerKg).toFixed(2)}/kg requested` : ""}
                    {rfq.preferredIncoterms ? ` · ${rfq.preferredIncoterms}` : ""}
                  </p>
                  {rfq.message && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{rfq.message}"</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {rfq.status === "open" && (
                    <Button
                      size="sm" variant="outline" className="rounded-none h-7 px-3 text-xs"
                      onClick={(e) => { e.stopPropagation(); setQuoteDialog(rfq.id); }}
                    >
                      Quote
                    </Button>
                  )}
                  {expanded === rfq.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {expanded === rfq.id && detail && detail.id === rfq.id && (
                <div className="bg-muted/20 px-5 pb-5 border-t border-border">
                  {/* Quotations */}
                  {detail.quotations?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Quotations Sent</p>
                      {detail.quotations.map((q: any) => (
                        <div key={q.id} className="bg-card border border-border p-3 mb-2 text-xs">
                          <div className="flex justify-between">
                            <span className="font-semibold">${parseFloat(q.offerPriceUsdPerKg).toFixed(2)}/kg · {parseFloat(q.offerQuantityKg).toLocaleString()} kg</span>
                            <Badge variant="outline" className="text-[10px]">{q.status}</Badge>
                          </div>
                          {q.incoterms && <p className="text-muted-foreground mt-1">{q.incoterms} · {q.leadTimeDays}d lead time</p>}
                          {q.notes && <p className="text-muted-foreground mt-1">{q.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Messages */}
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Negotiation Thread</p>
                    {detail.messages?.length === 0 && (
                      <p className="text-xs text-muted-foreground mb-2">No messages yet.</p>
                    )}
                    <div className="space-y-2 mb-3">
                      {detail.messages?.map((m: any) => (
                        <div key={m.id} className={`max-w-[80%] p-2.5 text-xs ${m.senderRole === "factory" ? "ml-auto bg-primary/10 text-primary" : "bg-card border border-border"}`}>
                          <p className="font-medium text-[10px] mb-0.5 opacity-60">{m.senderRole === "factory" ? "You" : rfq.buyerCompany || "Buyer"}</p>
                          {m.content}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={msgText[rfq.id] ?? ""}
                        onChange={(e) => setMsgText((prev) => ({ ...prev, [rfq.id]: e.target.value }))}
                        placeholder="Type a reply…"
                        className="h-8 text-sm rounded-none flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && msgText[rfq.id]?.trim()) {
                            sendMessage.mutate({ rfqId: rfq.id, content: msgText[rfq.id] });
                          }
                        }}
                      />
                      <Button
                        size="sm" className="rounded-none h-8"
                        disabled={!msgText[rfq.id]?.trim() || sendMessage.isPending}
                        onClick={() => sendMessage.mutate({ rfqId: rfq.id, content: msgText[rfq.id] })}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quote dialog */}
      <Dialog open={quoteDialog !== null} onOpenChange={(o) => !o && setQuoteDialog(null)}>
        <DialogContent className="max-w-lg rounded-none">
          <DialogHeader><DialogTitle>Submit Quotation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {([
              ["offerPriceUsdPerKg", "Price (USD/kg) *", "number"],
              ["offerQuantityKg",    "Quantity (kg) *",  "number"],
              ["incoterms",         "Incoterms",         "text"],
              ["leadTimeDays",      "Lead Time (days)",  "number"],
              ["validUntil",        "Valid Until",       "date"],
            ] as [keyof typeof quote, string, string][]).map(([k, label, type]) => (
              <div key={k}>
                <Label className="text-xs mb-1 block">{label}</Label>
                <Input type={type} value={quote[k]} onChange={(e) => setQuote((p) => ({ ...p, [k]: e.target.value }))} className="h-8 text-sm rounded-none" />
              </div>
            ))}
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Commercial Pitch</Label>
              <Textarea value={quote.commercialPitch} onChange={(e) => setQuote((p) => ({ ...p, commercialPitch: e.target.value }))} rows={2} className="text-sm rounded-none resize-none" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Internal Notes</Label>
              <Textarea value={quote.notes} onChange={(e) => setQuote((p) => ({ ...p, notes: e.target.value }))} rows={2} className="text-sm rounded-none resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setQuoteDialog(null)}>Cancel</Button>
            <Button className="rounded-none" disabled={submitQuote.isPending || !quote.offerPriceUsdPerKg || !quote.offerQuantityKg}
              onClick={() => quoteDialog !== null && submitQuote.mutate(quoteDialog)}>
              {submitQuote.isPending ? "Submitting…" : "Submit Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
