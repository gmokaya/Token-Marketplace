import { useParams, Link } from "wouter";
import { 
  useGetTeaLot, 
  useGetTeaLotSettlement, 
  useGetTeaLotDispatchDocs,
  getGetTeaLotQueryKey,
  getGetTeaLotSettlementQueryKey,
  getGetTeaLotDispatchDocsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, Download, Scale, MapPin, Package, ArrowRight } from "lucide-react";

export default function LotDetail() {
  const params = useParams();
  const lotId = Number(params.lotId);

  const { data: lot, isLoading: lotLoading, isError: lotError } = useGetTeaLot(lotId, {
    query: { enabled: !!lotId, queryKey: getGetTeaLotQueryKey(lotId) }
  });

  const { data: settlement, isError: settlementError } = useGetTeaLotSettlement(lotId, {
    query: { enabled: !!lotId, queryKey: getGetTeaLotSettlementQueryKey(lotId) }
  });

  const { data: docs, isError: docsError } = useGetTeaLotDispatchDocs(lotId, {
    query: { enabled: !!lotId, queryKey: getGetTeaLotDispatchDocsQueryKey(lotId) }
  });

  if (lotLoading) return <Skeleton className="h-[600px] w-full" />;
  if (lotError || !lot) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <span>Lot not found or failed to load.</span>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Lot #{lot.id}</h1>
            <Badge variant="outline" className="rounded-none text-sm px-3 py-1 uppercase">{lot.status}</Badge>
            <Badge className="rounded-none text-sm px-3 py-1 uppercase">{lot.listingType}</Badge>
          </div>
          <p className="text-muted-foreground">{lot.grade} • {lot.gradeMark}</p>
        </div>
        {settlement && (
          <Link href={`/lots/${lot.id}/settlement`}>
            <Button className="rounded-none gap-2">View Settlement <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="rounded-none shadow-none border-border">
            <CardHeader className="bg-muted/10 border-b p-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" /> Catalogue Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold flex items-center gap-1"><Scale className="w-3 h-3" /> Net Weight</div>
                  <div className="font-mono text-xl">{lot.netWeightKg} kg</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Gross Weight</div>
                  <div className="font-mono text-xl">{lot.grossWeightKg} kg</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Tare Weight</div>
                  <div className="font-mono text-xl">{lot.tareWeightKg} kg</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold flex items-center gap-1"><MapPin className="w-3 h-3" /> Origin</div>
                  <div className="text-lg font-medium">{lot.giOrigin}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold flex items-center gap-1"><Package className="w-3 h-3" /> Package</div>
                  <div className="text-lg font-medium">{lot.packageType}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Certifications</div>
                  <div className="flex gap-1 flex-wrap">
                    {lot.certifications?.length ? lot.certifications.map(c => (
                      <Badge key={c} variant="secondary" className="rounded-none text-[10px]">{c}</Badge>
                    )) : 'None'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {lot.tasterRemarks && (
            <Card className="rounded-none shadow-none border-border">
              <CardHeader className="bg-muted/10 border-b p-4">
                <CardTitle className="text-lg">Taster Remarks</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-lg italic text-muted-foreground border-l-4 border-primary pl-4">
                  "{lot.tasterRemarks}"
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-none shadow-none border-border bg-primary/5">
            <CardHeader className="p-4 border-b border-primary/10">
              <CardTitle className="text-lg">Valuation</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Reserve Price</div>
                <div className="text-3xl font-bold font-mono">${lot.reservePriceUsd?.toFixed(2)}<span className="text-sm text-muted-foreground">/kg</span></div>
              </div>
              {lot.brokerValuationUsd && (
                <div>
                  <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Broker Valuation</div>
                  <div className="text-xl font-semibold font-mono">${lot.brokerValuationUsd.toFixed(2)}<span className="text-sm text-muted-foreground">/kg</span></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-none shadow-none border-border">
            <CardHeader className="bg-muted/10 border-b p-4">
              <CardTitle className="text-lg">Dispatch Documents</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {docsError ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Failed to load documents.</div>
                ) : docs?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No documents attached.</div>
                ) : (
                  docs?.map(doc => (
                    <div className="p-4 flex items-center justify-between hover:bg-muted/5">
                      <div>
                        <div className="font-medium text-sm">{doc.docType.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</div>
                      </div>
                      {doc.docData && (doc.docData as any).fileUrl && (
                        <Button variant="ghost" size="icon" className="rounded-none" asChild>
                          <a href={(doc.docData as any).fileUrl} target="_blank" rel="noreferrer"><Download className="w-4 h-4" /></a>
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}