import { Layout } from "@/components/layout/Layout";

export default function MyListings() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Active Listings</h1>
        <div className="p-12 text-center border border-dashed text-muted-foreground rounded-lg">
          No active listings. To create one, go to your Portfolio and select an eWR to list on the spot market.
        </div>
      </div>
    </Layout>
  );
}