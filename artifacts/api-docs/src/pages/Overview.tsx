import { CodeBlock } from '@/components/ui/CodeBlock';

export function Overview() {
  return (
    <div className="animate-in fade-in duration-500 xl:pr-64">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">TokenHarvest API</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Welcome to the TokenHarvest developer documentation. This API allows warehouse operators, commodity brokers, and exchange administrators to integrate with the digital agricultural commodity marketplace for Coffee and Tea in East Africa.
        </p>
      </div>

      <div className="space-y-12">
        <section id="base-url">
          <h2 className="text-2xl font-semibold mb-4">Base URL</h2>
          <p className="text-muted-foreground mb-4">All API requests should be prefixed with the following base URL:</p>
          <div className="bg-muted px-4 py-3 rounded-md font-mono text-sm border border-border flex items-center">
            https://<span className="text-muted-foreground mx-1">{"{your-domain}"}</span>/api
          </div>
        </section>

        <section id="authentication">
          <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
          <p className="text-muted-foreground mb-4">
            TokenHarvest uses Clerk for authentication. All endpoints require a valid Clerk Session Token passed in the Authorization header.
            Tokens can be obtained via the Clerk frontend SDK after a user signs in.
          </p>
          <div className="bg-muted px-4 py-3 rounded-md font-mono text-sm border border-border">
            <span className="text-blue-400">Authorization:</span> Bearer {'<clerk_session_token>'}
          </div>
        </section>

        <section id="roles">
          <h2 className="text-2xl font-semibold mb-4">User Roles</h2>
          <p className="text-muted-foreground mb-4">Users are assigned specific roles which dictate their permissions within the marketplace.</p>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-medium text-emerald-400">ADMIN</td>
                  <td className="px-4 py-3">Exchange administrator. Creates auction sessions, starts auctions, confirms payments.</td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-medium text-blue-400">ENABLER</td>
                  <td className="px-4 py-3">Commodity broker. Catalogues lots (requires active mandate), submits lots to sessions.</td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-medium text-amber-400">PRODUCER</td>
                  <td className="px-4 py-3">Warehouse receipt holder. Creates lots from their own eWRs directly. API-only role.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="lifecycle">
          <h2 className="text-2xl font-semibold mb-4">Lot Status Lifecycle</h2>
          <p className="text-muted-foreground mb-4">A lot progresses through several states from creation to final settlement.</p>
          <div className="flex flex-wrap items-center gap-2 p-6 bg-card border border-border rounded-lg">
            {['DRAFT', 'CATALOGUED', 'DISPATCHED', 'LIVE'].map((status, i) => (
              <div key={status} className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-muted font-mono text-xs text-foreground">{status}</span>
                <span className="text-muted-foreground">→</span>
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs border border-emerald-500/20">SOLD</span>
              <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-400 font-mono text-xs border border-rose-500/20">UNSOLD</span>
              <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 font-mono text-xs border border-amber-500/20">RESERVE_NOT_MET</span>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-muted-foreground">→</span>
              <span className="px-2 py-1 rounded bg-muted font-mono text-xs text-muted-foreground">(WITHDRAWN)</span>
            </div>
          </div>
        </section>

        <section id="errors">
          <h2 className="text-2xl font-semibold mb-4">Error Format</h2>
          <p className="text-muted-foreground mb-4">All endpoints return standardized JSON errors. The <code className="font-mono text-xs text-foreground bg-muted px-1 rounded">issues</code> array is only present on 400 Validation Failed responses.</p>
          <CodeBlock code={{
            error: "Human-readable message",
            issues: [
              { path: ["fieldName"], message: "Validation error detail" }
            ]
          }} />
        </section>
      </div>
    </div>
  );
}
