export default function BrokerMandates() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mandate Holders</h1>
        <p className="text-muted-foreground mt-1">Manage producer cooperatives that have authorized you to trade on their behalf.</p>
      </div>
      <div className="flex items-center justify-center h-64 border rounded-xl border-dashed border-border bg-card/50">
        <div className="text-center text-muted-foreground">
          <p className="font-medium">No active mandates.</p>
        </div>
      </div>
    </div>
  );
}
