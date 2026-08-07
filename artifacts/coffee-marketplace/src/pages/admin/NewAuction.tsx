import { useState } from "react";
import { useCreateCoffeeAuctionSession, useGetMe, getListCoffeeAuctionSessionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CalendarPlus, Loader2, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewAuction() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me, isLoading: meLoading } = useGetMe();

  // Default to 7 days from now
  const defaultDate = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const [auctionDate, setAuctionDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [submitted, setSubmitted] = useState(false);

  const create = useCreateCoffeeAuctionSession();

  // Redirect non-admins
  if (!meLoading && me?.tier !== "ADMIN") {
    setLocation("/admin/auctions", { replace: true });
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auctionDate) {
      toast({ title: "Date required", description: "Please select a date for the auction session.", variant: "destructive" });
      return;
    }
    const combined = new Date(`${auctionDate}T${startTime}:00`);
    if (combined <= new Date()) {
      toast({ title: "Invalid date/time", description: "Auction must be scheduled in the future.", variant: "destructive" });
      return;
    }

    create.mutate(
      { data: { auctionDate, startTime } },
      {
        onSuccess: (session: any) => {
          toast({ title: "Session scheduled", description: `Session #${session.id} created for ${format(new Date(auctionDate + "T12:00:00"), "MMMM d, yyyy")} at ${startTime}.` });
          queryClient.invalidateQueries({ queryKey: getListCoffeeAuctionSessionsQueryKey() });
          setSubmitted(true);
        },
        onError: (err: any) => {
          toast({ title: "Failed to schedule", description: err?.error ?? "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  if (meLoading) {
    return <Skeleton className="h-64 w-full max-w-xl mx-auto" />;
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
            <div>
              <h2 className="text-xl font-bold tracking-tight text-green-900">Session Scheduled</h2>
              <p className="text-sm text-green-700 mt-1.5">
                Your auction session for <strong>{format(new Date(auctionDate + "T12:00:00"), "MMMM d, yyyy")}</strong> at{" "}
                <strong>{startTime}</strong> has been created. Brokers can now submit lots to the catalogue.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Link href="/admin/auctions">
                <Button variant="outline">View All Sessions</Button>
              </Link>
              <Button onClick={() => { setSubmitted(false); setAuctionDate(defaultDate); setStartTime("09:00"); }}>
                Schedule Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/admin/auctions">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Auction Session</h1>
          <p className="text-muted-foreground mt-1">Create a new live coffee auction event.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarPlus className="w-4 h-4" /> Session Details
            </CardTitle>
            <CardDescription>
              Set the date and start time for this auction. Brokers can submit lots once the session is created.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auctionDate">Auction Date</Label>
                <Input
                  id="auctionDate"
                  type="date"
                  value={auctionDate}
                  onChange={e => setAuctionDate(e.target.value)}
                  min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The planned date and time when the live auction will begin. You control the exact start using <em>Go Live</em> from the sessions list.
            </p>
          </CardContent>
          <CardFooter className="bg-muted/50 border-t px-6 py-4">
            <Button type="submit" className="ml-auto gap-2" disabled={create.isPending}>
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Session
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Next steps:</strong> After creating, brokers submit their catalogued lots from the Auction Sessions page.
            When the catalogue is finalised, click <em>Start Live</em> to open bidding.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
