export default function NewBrokeredLot() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Brokered Lot</h1>
        <p className="text-muted-foreground mt-1">Create a lot on behalf of a mandated producer.</p>
      </div>
      <div className="p-8 text-center border rounded-xl border-dashed bg-card/50 text-muted-foreground">
        <p>Form to create lots for clients you hold a mandate for.</p>
      </div>
    </div>
  );
}
