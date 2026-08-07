import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateTeaAuctionSession, useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const schema = z.object({
  auctionDate: z.string().min(1, "Date is required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time is required"),
});

export default function NewAuction() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me, isLoading: meLoading } = useGetMe();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      auctionDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
    },
  });

  const createSession = useCreateTeaAuctionSession({
    mutation: {
      onSuccess: () => {
        toast({ title: "Auction session created", description: "Brokers can now submit lots to this session." });
        queryClient.invalidateQueries({ queryKey: ["/api/tea/auctions"] });
        setLocation("/admin/auctions");
      },
      onError: (err: any) => {
        toast({ title: "Failed to create session", description: err.message, variant: "destructive" });
      },
    },
  });

  // Redirect non-admins
  if (!meLoading && me?.tier !== "ADMIN") {
    setLocation("/admin/auctions", { replace: true });
    return null;
  }

  if (meLoading) {
    return <Skeleton className="h-64 w-full max-w-2xl mx-auto" />;
  }

  const onSubmit = (data: z.infer<typeof schema>) => {
    createSession.mutate({ data: { auctionDate: data.auctionDate, startTime: data.startTime } });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title="Create Auction Session"
        description="Schedule a new tea auction. Brokers will submit their lots after the session is created."
      />

      <div className="flex items-start gap-3 p-5 border border-border bg-muted/5 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary/60" />
        <span>
          Once created, the session will appear as <strong className="text-foreground">SCHEDULED</strong> and brokers
          can submit their catalogued lots. When the catalogue is ready, use{" "}
          <strong className="text-foreground">Start Live</strong> to begin the auction.
        </span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border p-8 shadow-sm">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="auctionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest text-primary font-bold mb-2 block">
                      Auction Date
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="rounded-none h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-widest text-primary font-bold mb-2 block">
                      Start Time
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="rounded-none h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/admin/auctions")}
              className="rounded-none px-6 h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-none px-8 h-11 font-semibold"
              disabled={createSession.isPending}
            >
              Create Session
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
