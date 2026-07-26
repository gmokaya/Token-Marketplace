import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateTeaAuctionSession } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Info } from "lucide-react";

const schema = z.object({
  auctionDate: z.string().min(1, "Date is required"),
});

export default function NewAuction() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      auctionDate: format(new Date(), "yyyy-MM-dd"),
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

  const onSubmit = (data: z.infer<typeof schema>) => {
    createSession.mutate({ data });
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
            <FormField
              control={form.control}
              name="auctionDate"
              render={({ field }) => (
                <FormItem className="max-w-sm">
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
