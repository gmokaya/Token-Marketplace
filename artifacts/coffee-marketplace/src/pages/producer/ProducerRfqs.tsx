export default function ProducerRfqs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">RFQ Inbox</h1>
        <p className="text-muted-foreground mt-1">Manage incoming requests for quotation from buyers.</p>
      </div>
      <div className="flex items-center justify-center h-64 border rounded-xl border-dashed border-border bg-card/50">
        <div className="text-center text-muted-foreground">
          <p className="font-medium">No RFQs currently active.</p>
          <p className="text-sm mt-1">When buyers request quotes on your lots, they will appear here.</p>
        </div>
      </div>
    </div>
  );
}
