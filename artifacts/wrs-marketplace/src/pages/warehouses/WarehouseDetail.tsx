import { Link, useParams } from "wouter";
import { getGetWarehouseProfileByCodeQueryKey, useGetWarehouseProfileByCode, useListEwrs } from "@workspace/api-client-react";
import { ArrowLeft, CheckCircle2, Droplets, Mail, Package, Phone, UserRound, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function WarehouseDetail() {
  const { code } = useParams<{ code: string }>();
  const warehouseCode = decodeURIComponent(code ?? "");
  const profile = useGetWarehouseProfileByCode(warehouseCode, { query: { queryKey: getGetWarehouseProfileByCodeQueryKey(warehouseCode), enabled: !!warehouseCode } });
  const maize = useListEwrs({ commodityType: "MAIZE" });
  const rice = useListEwrs({ commodityType: "RICE" });
  const ewrs = [...(maize.data ?? []), ...(rice.data ?? [])].filter((ewr) => ewr.warehouseCode === warehouseCode);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex items-center gap-3"><Link href="/warehouses"><Button variant="ghost" size="icon" aria-label="Back to warehouses"><ArrowLeft className="h-4 w-4" /></Button></Link><div><h1 className="font-mono text-3xl font-bold tracking-tight">{warehouseCode}</h1><p className="mt-1 text-muted-foreground">Certified WRSC grain storage facility</p></div></div>
      {profile.isLoading ? <Skeleton className="h-44 w-full" /> : profile.data ? <Card><CardHeader className="pb-4"><div className="flex items-start justify-between gap-3"><div><CardTitle>{profile.data.operatorName}</CardTitle><CardDescription className="mt-1">WRSC licence <span className="font-mono font-medium">{profile.data.wrscLicenseNumber}</span></CardDescription></div><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Licensed</Badge></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{profile.data.facilityType && <Info icon={Warehouse} label="Facility" value={profile.data.facilityType} />}{profile.data.capacityMt && <Info icon={Package} label="Capacity" value={`${profile.data.capacityMt} MT`} />}{profile.data.warehouseInChargeName && <Info icon={UserRound} label="In charge" value={profile.data.warehouseInChargeName} />}{profile.data.warehouseInChargePhone && <Info icon={Phone} label="Phone" value={profile.data.warehouseInChargePhone} />}{profile.data.warehouseInChargeEmail && <Info icon={Mail} label="Email" value={profile.data.warehouseInChargeEmail} />}</CardContent></Card> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Warehouse profile is not available yet.</div>}
      <section><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">Grain eWRs on site</h2><p className="mt-1 text-sm text-muted-foreground">Electronic receipts currently recorded at this facility.</p></div>{!maize.isLoading && !rice.isLoading && <Badge variant="secondary">{ewrs.length} receipts</Badge>}</div>{maize.isLoading || rice.isLoading ? <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div> : ewrs.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center"><Package className="h-7 w-7 text-muted-foreground/40" /><p className="text-muted-foreground">No MAIZE or RICE eWRs at this location.</p></div> : <div className="space-y-3">{ewrs.map((ewr) => <Card key={ewr.id}><CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono font-semibold">{ewr.ewrsReceiptId}</span><Badge variant="outline">{ewr.commodityType}</Badge><Badge variant="secondary">{ewr.grade}</Badge><Badge variant="outline">{ewr.state}</Badge></div><div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"><span className="font-mono text-foreground">{ewr.weightMt} MT</span>{ewr.moisturePct != null && <span className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-blue-500" /> {ewr.moisturePct}% moisture</span>}<span>Harvest {ewr.harvestSeason}</span></div></div><div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Receipt verified</div></CardContent></Card>)}</div>}</section>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Warehouse; label: string; value: string }) { return <div className="flex items-center gap-2.5 text-sm"><Icon className="h-4 w-4 shrink-0 text-muted-foreground" /><span><span className="text-muted-foreground">{label}: </span>{value}</span></div>; }