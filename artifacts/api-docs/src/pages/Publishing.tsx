import { EndpointSection, EndpointTitle, DataTable } from '@/components/ui/Endpoint';
import { CodeBlock } from '@/components/ui/CodeBlock';

export function Publishing() {
  return (
    <div className="animate-in fade-in duration-500 xl:pr-64">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Marketplace Publishing</h1>
        <p className="text-lg text-muted-foreground">Push catalogued commodity lots directly to the external TokenHarvest discovery marketplace. These endpoints handle the synchronous triggers and asynchronous state updates of the publishing pipeline.</p>
      </div>

      <div className="space-y-0">
        <EndpointSection>
          <EndpointTitle id="publish-lot" method="POST" path="/api/tea/lots/:id/publish" summary="Publish a lot to marketplace" />
          
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Triggers a publication workflow. This endpoint is concurrency-safe: DB-level deduplication ensures only one in-flight publication occurs per lot.<br/><br/>
            <strong>Eligibility:</strong> The lot must NOT be in DRAFT, SOLD, UNSOLD, WITHDRAWN, or RESERVE_NOT_MET status.
          </p>

          <h4 className="font-semibold text-sm mt-8 mb-2">Response 201 Created (or 200 OK on re-publish)</h4>
          <CodeBlock code={{
            id: 1,
            listingId: 42,
            factoryId: 12,
            marketplaceName: "tokenharvest",
            status: "live",
            externalListingId: "EXT-2026-0042",
            lastAttemptAt: "2026-08-07T10:00:00.000Z",
            lastSuccessAt: "2026-08-07T10:00:01.200Z",
            lastError: null
          }} />

          <h4 className="font-semibold text-sm mt-8 mb-2">Response 409 Conflict</h4>
          <p className="text-sm text-muted-foreground mb-2">Returned when the lot is already successfully published.</p>
          <CodeBlock code={{
            error: "Lot is already live on the marketplace.",
            publication: {
              id: 1,
              status: "live",
              externalListingId: "EXT-2026-0042"
            }
          }} />
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="retry-publish" method="POST" path="/api/tea/lots/:id/publish/retry" summary="Retry failed publication" />
          <p className="text-sm text-muted-foreground mb-6">
            Attempts to re-publish a lot where the initial publication failed (e.g. adapter timeout, external API failure).<br/>
            Only valid when the current publication record is in the <code className="font-mono text-xs bg-muted px-1 rounded text-foreground">failed</code> state.
          </p>

          <h4 className="font-semibold text-sm mt-8 mb-2">Errors</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-6">
            <li><span className="font-mono text-foreground">409 Conflict</span>: Publication is not in failed state.</li>
          </ul>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="list-publications" method="GET" path="/api/listing-publications" summary="List publication records" />
          <p className="text-sm text-muted-foreground mb-6">
            Retrieve status histories of external publications. Scoped strictly to lots the caller owns or brokers.
          </p>

          <h4 className="font-semibold text-sm mb-2">Query Parameters</h4>
          <DataTable 
            columns={['Parameter', 'Type', 'Description']}
            data={[
              [<code className="text-xs text-foreground">lotId</code>, 'integer', 'Filter by internal lot ID (ownership verified)'],
              [<code className="text-xs text-foreground">factoryId</code>, 'integer', 'Filter by factory (must match caller context)']
            ]}
          />
        </EndpointSection>
      </div>
    </div>
  );
}
