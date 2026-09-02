import { ReactNode } from "react";
import { Layout as SharedLayout } from "../../../../wrs-marketplace/src/components/layout/Layout";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <SharedLayout market="tea" marketName="Tea Market">
      {children}
    </SharedLayout>
  );
}
