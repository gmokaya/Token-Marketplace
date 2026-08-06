import { useState } from "react";
import { useListEwrs, useCreateEwr } from "@workspace/api-client-react";
import { Ewr } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListEwrsQueryKey } from "@workspace/api-client-react";
import { Plus, FileText, ArrowRightLeft, SplitSquareHorizontal, ShieldOff } from "lucide-react";
import { format } from "date-fns";

const ewrSchema = z.object({
  ewrsReceiptId: z.string().min(1, "Receipt ID is required"),
  wrscSignature: z.string().min(1, "Signature is required"),
  warehouseCode: z.string().min(1, "Warehouse Code is required"),
  coffeeBeanSize: z.enum(["AA", "AB", "PB", "C"]),
  grade: z.string().min(1, "Grade is required"),
  weightMt: z.coerce.number().positive(),
  harvestSeason: z.string().min(1, "Harvest season is required"),
  moisturePct: z.coerce.number().min(0).max(100),
  coffeeCuppingScore: z.coerce.number().min(0).max(100),
});

type EwrFormValues = z.infer<typeof ewrSchema>;

export default function ProducerEwrs() {
  const { data: ewrs, isLoading } = useListEwrs({ commodityType: "COFFEE" } as any);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My eWRs</h1>
          <p className="text-muted-foreground mt-1">Manage your Electronic Warehouse Receipts.</p>
        </div>
        <NewEwrDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Warehouse Inventory</CardTitle>
          <CardDescription>All your digitized coffee inventory currently in certified warehouses.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !ewrs || ewrs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No eWRs found</h3>
              <p className="text-muted-foreground text-sm mt-1">You haven't digitized any coffee yet.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <div className="grid grid-cols-6 gap-4 p-4 border-b border-border bg-muted/50 font-medium text-sm text-muted-foreground">
                <div className="col-span-2">Receipt & Details</div>
                <div>Status</div>
                <div>Weight</div>
                <div>Quality</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="divide-y divide-border">
                {ewrs.map((ewr) => (
                  <EwrRow key={ewr.id} ewr={ewr} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EwrRow({ ewr }: { ewr: Ewr }) {
  const isLocked = ewr.state !== "INGESTED";
  
  return (
    <div className="grid grid-cols-6 gap-4 p-4 items-center text-sm">
      <div className="col-span-2">
        <div className="font-mono font-medium text-foreground">{ewr.ewrsReceiptId}</div>
        <div className="text-xs text-muted-foreground mt-0.5">Whs: {ewr.warehouseCode} &bull; {ewr.harvestSeason}</div>
      </div>
      <div>
        <Badge variant={ewr.state === "INGESTED" ? "default" : "secondary"}>
          {ewr.state.replace("_", " ")}
        </Badge>
        {ewr.isLienActive && <Badge variant="destructive" className="ml-2 text-[10px]">LIEN</Badge>}
      </div>
      <div className="font-mono">{ewr.weightMt} MT</div>
      <div>
        {ewr.coffeeCuppingScore ? (
          <Badge variant="outline" className={
            ewr.coffeeCuppingScore >= 85 ? "border-amber-500/50 text-amber-600 bg-amber-500/10" : 
            ewr.coffeeCuppingScore >= 80 ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10" : ""
          }>
            {ewr.coffeeCuppingScore} pts
          </Badge>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
        <span className="ml-2 font-mono text-xs">{ewr.coffeeBeanSize || ewr.grade}</span>
      </div>
      <div className="text-right flex justify-end gap-2">
        <Button size="icon" variant="ghost" disabled={isLocked} title="Split eWR">
          <SplitSquareHorizontal className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" disabled={isLocked} title="Transfer eWR">
          <ArrowRightLeft className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isLocked} title="Retire eWR">
          <ShieldOff className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function NewEwrDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createEwr = useCreateEwr();

  const form = useForm<EwrFormValues>({
    resolver: zodResolver(ewrSchema),
    defaultValues: {
      ewrsReceiptId: "",
      wrscSignature: "signature_placeholder",
      warehouseCode: "",
      grade: "",
      weightMt: 0,
      harvestSeason: "2024/25",
      moisturePct: 11.5,
      coffeeCuppingScore: 82,
    },
  });

  const onSubmit = (data: EwrFormValues) => {
    createEwr.mutate(
      { 
        data: {
          ...data,
          commodityType: "COFFEE",
        } as any
      },
      {
        onSuccess: () => {
          toast({ title: "eWR Created", description: "Your warehouse receipt has been digitized." });
          queryClient.invalidateQueries({ queryKey: getListEwrsQueryKey() });
          setOpen(false);
          form.reset();
        },
        onError: (err) => {
          toast({ title: "Error", description: err.error || "Failed to create eWR", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Ingest eWR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Ingest Coffee eWR</DialogTitle>
          <DialogDescription>
            Digitize a physical warehouse receipt for green coffee.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="ewrsReceiptId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt ID</FormLabel>
                  <FormControl><Input {...field} placeholder="WR-12345" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="warehouseCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Warehouse Code</FormLabel>
                  <FormControl><Input {...field} placeholder="WH-NBO-01" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="coffeeBeanSize" render={({ field }) => (
                <FormItem>
                  <FormLabel>Screen Size</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AA">AA (Screen 17/18)</SelectItem>
                      <SelectItem value="AB">AB (Screen 15/16)</SelectItem>
                      <SelectItem value="PB">Peaberry (PB)</SelectItem>
                      <SelectItem value="C">C (Screen 14)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="grade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade Description</FormLabel>
                  <FormControl><Input {...field} placeholder="FAQ" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="weightMt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (MT)</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="moisturePct" render={({ field }) => (
                <FormItem>
                  <FormLabel>Moisture %</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="coffeeCuppingScore" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cupping Score</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="harvestSeason" render={({ field }) => (
              <FormItem>
                <FormLabel>Crop Year</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createEwr.isPending}>
                {createEwr.isPending ? "Ingesting..." : "Ingest eWR"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
