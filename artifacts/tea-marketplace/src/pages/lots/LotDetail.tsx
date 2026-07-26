import { useParams, Link } from "wouter";
import {
  useGetTeaLot,
  useGetTeaLotSettlement,
  useGetTeaLotDispatchDocs,
  getGetTeaLotQueryKey,
  getGetTeaLotSettlementQueryKey,
  getGetTeaLotDispatchDocsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  FileText, Download, Scale, MapPin, Package, ArrowRight,
  Warehouse, Phone, Mail, User2, ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const FACILITY_LABELS: Record<string, string> = {
  DRY_GRAIN_SILO:                    "Dry Grain Silo",
  CONTROLLED_ATMOSPHERE_COLD_STORAGE: "Controlled Atmosphere / Cold Storage",
  WAREHOUSE:                         "General Warehouse",
  DEPOT:                             "Depot",
  OTHER:                             "Other",
};

export default function LotDetail() {
  const params = useParams();
  const lotId = Number(params.lotId);

  const { data: lot, isLoading: lotLoading, isError: lotError } = useGetTeaLot(lotId, {
    query: { enabled: !!lotId, queryKey: getGetTeaLotQueryKey(lotId) },
  });

  const { data: settlement } = useGetTeaLotSettlement(lotId, {
    query: { enabled: !!lotId, queryKey: getGetTeaLotSettlementQueryKey(lotId) },
  });

  const { data: docs, isError: docsError } = useGetTeaLotDispatchDocs(lotId, {
    query: { enabled: !!lotId, queryKey: getGetTeaLotDispatchDocsQueryKey(lotId) },
  });

  if (lotLoading) return <Skeleton className="h-[600px] w-full" />;
  if (lotError || !lot) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground border border-border">
      Lot not found or failed to load.
    </div>
  );

  const warehouseCode    = (lot as any).warehouseCode as string | null;
  const warehouseProfile = (lot as any).warehouseProfile as {
    operatorName: string;
    wrscLicenseNumber: string;
    facilityType: string | null;
    capacityMt: string | null;
    warehouseInChargeName: string | null;
    warehouseInChargePhone: string | null;
    warehouseInChargeEmail: string | null;
    handlesTea: string | null;
    insurerName: string | null;
  } | null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            Lot #{lot.id}
            <Badge variant="outline" className="rounded-none text-xs tracking-wider px-3 py-1 uppercase bg-muted/5">
              {lot.status}
            </Badge>
            <Badge className="rounded-none text-xs tracking-wider px-3 py-1 uppercase">
              {lot.listingType}
            </Badge>
          </span>
        }
        description={`${lot.grade} • ${lot.gradeMark}`}
        actions={
          settlement && (
            <Link href={`/lots/${lot.id}/settlement`}>
              <Button className="rounded-none gap-2 h-11 font-semibold">
                View Settlement <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">

          {/* Catalogue details */}
          <Card className="rounded-none shadow-sm border border-border">
            <CardHeader className="bg-muted/5 border-b border-border p-5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" /> Catalogue Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-6">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> Net Weight
                  </div>
                  <div className="font-mono text-xl">{lot.netWeightKg} kg</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Gross Weight</div>
                  <div className="font-mono text-xl">{lot.grossWeightKg} kg</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Tare Weight</div>
                  <div className="font-mono text-xl">{lot.tareWeightKg} kg</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> GI Origin
                  </div>
                  <div className="text-lg font-medium">{lot.giOrigin}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Package
                  </div>
                  <div className="text-lg font-medium">{lot.packageType}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Harvest Season</div>
                  <div className="text-lg font-medium">{(lot as any).ewr?.harvestSeason ?? "—"}</div>
                </div>
                {(lot as any).ewr?.teaProcessingType && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Processing</div>
                    <div className="text-lg font-medium">{(lot as any).ewr.teaProcessingType}</div>
                  </div>
                )}
                {(lot as any).ewr?.teaLeafGrade && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Leaf Grade</div>
                    <div className="text-lg font-medium">{(lot as any).ewr.teaLeafGrade}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Certifications</div>
                  <div className="flex gap-2 flex-wrap">
                    {lot.certifications?.length
                      ? lot.certifications.map((c) => (
                          <Badge key={c} variant="secondary" className="rounded-none text-[10px] tracking-wider">{c}</Badge>
                        ))
                      : <span className="text-muted-foreground text-sm">None</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warehouse / Storage location */}
          <Card className="rounded-none shadow-sm border border-border">
            <CardHeader className="bg-muted/5 border-b border-border p-5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-muted-foreground" /> Warehouse & Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {!warehouseCode ? (
                <p className="text-sm text-muted-foreground">No warehouse information available for this lot.</p>
              ) : (
                <div className="space-y-6">
                  {/* Always-visible: warehouse code from eWR */}
                  <div className="flex items-start gap-4 bg-primary/5 border border-primary/15 p-4">
                    <Warehouse className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">WRSC Warehouse Code</p>
                      <p className="font-mono text-lg font-bold mt-0.5">{warehouseCode}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This code is assigned by the Warehouse Receipt System Controller and appears on the eWR.
                      </p>
                    </div>
                  </div>

                  {/* Enriched operator profile — when a registered warehouse matches */}
                  {warehouseProfile ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-6">
                      <div className="col-span-2 md:col-span-3 flex items-center gap-2 text-xs text-primary/70 border-b border-border pb-3">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Registered operator found for this warehouse code
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Operator</p>
                        <p className="font-semibold">{warehouseProfile.operatorName}</p>
                      </div>

                      {warehouseProfile.facilityType && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Facility Type</p>
                          <p className="font-medium">{FACILITY_LABELS[warehouseProfile.facilityType] ?? warehouseProfile.facilityType}</p>
                        </div>
                      )}

                      {warehouseProfile.capacityMt && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Capacity</p>
                          <p className="font-mono font-medium">{parseFloat(warehouseProfile.capacityMt).toLocaleString()} MT</p>
                        </div>
                      )}

                      {warehouseProfile.warehouseInChargeName && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
                            <User2 className="w-3 h-3" /> In-Charge
                          </p>
                          <p className="font-medium">{warehouseProfile.warehouseInChargeName}</p>
                        </div>
                      )}

                      {warehouseProfile.warehouseInChargePhone && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> Phone
                          </p>
                          <a
                            href={`tel:${warehouseProfile.warehouseInChargePhone}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {warehouseProfile.warehouseInChargePhone}
                          </a>
                        </div>
                      )}

                      {warehouseProfile.warehouseInChargeEmail && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email
                          </p>
                          <a
                            href={`mailto:${warehouseProfile.warehouseInChargeEmail}`}
                            className="font-medium text-primary hover:underline text-sm break-all"
                          >
                            {warehouseProfile.warehouseInChargeEmail}
                          </a>
                        </div>
                      )}

                      {warehouseProfile.insurerName && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Insurer</p>
                          <p className="font-medium">{warehouseProfile.insurerName}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No registered operator profile found for this warehouse code. Contact the exchange to verify storage details.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Taster remarks */}
          {lot.tasterRemarks && (
            <Card className="rounded-none shadow-sm border border-border">
              <CardHeader className="bg-muted/5 border-b border-border p-5">
                <CardTitle className="text-lg font-bold">Taster Remarks</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-lg italic text-foreground border-l-4 border-primary pl-6 py-2 leading-relaxed">
                  "{lot.tasterRemarks}"
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-8">
          <Card className="rounded-none shadow-sm border border-border bg-card">
            <CardHeader className="p-5 border-b border-border bg-primary text-primary-foreground">
              <CardTitle className="text-lg font-bold">Valuation</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {lot.fixedPricePerKgUsd != null ? (
                <div>
                  <div className="text-xs text-primary-foreground/70 uppercase tracking-wider mb-2 font-semibold">Fixed Price</div>
                  <div className="text-4xl font-black font-mono tracking-tight">
                    ${parseFloat(String(lot.fixedPricePerKgUsd)).toFixed(2)}
                    <span className="text-base font-normal text-muted-foreground tracking-normal">/kg</span>
                  </div>
                </div>
              ) : lot.reservePriceUsd != null ? (
                <div>
                  <div className="text-xs uppercase tracking-wider mb-2 font-semibold opacity-70">Reserve Price</div>
                  <div className="text-4xl font-black font-mono tracking-tight">
                    ${parseFloat(String(lot.reservePriceUsd)).toFixed(2)}
                    <span className="text-base font-normal text-muted-foreground tracking-normal">/kg</span>
                  </div>
                </div>
              ) : null}

              {lot.brokerValuationUsd != null && (
                <div className="pt-4 border-t border-border/30">
                  <div className="text-xs uppercase tracking-wider mb-2 font-semibold opacity-70">Broker Valuation</div>
                  <div className="text-2xl font-bold font-mono tracking-tight">
                    ${parseFloat(String(lot.brokerValuationUsd)).toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground tracking-normal">/kg</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compact warehouse chip — repeated here for easy reference */}
          {warehouseCode && (
            <div className="border border-border p-4 bg-card flex items-center gap-3">
              <Warehouse className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Stored At</p>
                <p className="font-mono font-bold text-sm mt-0.5">{warehouseCode}</p>
                {warehouseProfile?.operatorName && (
                  <p className="text-xs text-muted-foreground mt-0.5">{warehouseProfile.operatorName}</p>
                )}
              </div>
            </div>
          )}

          <Card className="rounded-none shadow-sm border border-border">
            <CardHeader className="bg-muted/5 border-b border-border p-5">
              <CardTitle className="text-lg font-bold">Dispatch Documents</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {docsError ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Failed to load documents.</div>
                ) : docs?.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No documents attached.</div>
                ) : (
                  docs?.map((doc, idx) => (
                    <div key={idx} className="p-5 flex items-center justify-between hover:bg-muted/5 transition-colors">
                      <div>
                        <div className="font-semibold text-sm uppercase tracking-wider">{doc.docType.replace(/_/g, " ")}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {doc.docData && (doc.docData as any).fileUrl && (
                        <Button variant="ghost" size="icon" className="rounded-none" asChild>
                          <a href={(doc.docData as any).fileUrl} target="_blank" rel="noreferrer">
                            <Download className="w-4 h-4" />
                          </a>
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
