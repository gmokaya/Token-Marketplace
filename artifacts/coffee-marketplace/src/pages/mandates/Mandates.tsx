export default function Mandates() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Broker Mandates</h1>
        <p className="text-muted-foreground mt-1">Authorize certified brokers to trade your lots.</p>
      </div>
      <div className="flex items-center justify-center h-64 border rounded-xl border-dashed border-border bg-card/50">
        <div className="text-center text-muted-foreground">
          <p className="font-medium">No active mandates.</p>
          <p className="text-sm mt-1">Grant mandates to brokers to allow them to list your lots in auctions.</p>
        </div>
      </div>
    </div>
  );
}
