import { Layout } from "@/components/layout/Layout";
import MarketWorkspace from "@/components/market/MarketWorkspace";

export default function Market() {
  return (
    <Layout>
      <MarketWorkspace market="grain" />
    </Layout>
  );
}