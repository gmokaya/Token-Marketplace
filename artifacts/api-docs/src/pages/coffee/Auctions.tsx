import { EndpointSection, EndpointTitle, RoleRequirement, DataTable } from '@/components/ui/Endpoint';
import { CodeBlock } from '@/components/ui/CodeBlock';

export function CoffeeAuctions() {
  return (
    <div className="animate-in fade-in duration-500 xl:pr-64">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Coffee Auctions</h1>
        <p className="text-lg text-muted-foreground">Schedule sessions, manage catalogues, and run live coffee auctions on the exchange.</p>
      </div>

      <div className="space-y-0">
        <EndpointSection>
          <EndpointTitle id="list-auctions" method="GET" path="/api/coffee/auctions" summary="List auction sessions" />
          
          <h4 className="font-semibold text-sm mb-2">Query Parameters</h4>
          <DataTable 
            columns={['Parameter', 'Type', 'Description']}
            data={[
              [<code className="text-xs text-foreground">status</code>, 'string', 'Filter by SCHEDULED, LIVE, CLOSED, or COMPLETED']
            ]}
          />

          <h4 className="font-semibold text-sm mt-8 mb-2">Response Example</h4>
          <CodeBlock code={[
            {
              id: 3,
              auctionDate: "2026-08-15",
              scheduledStartTime: "09:00",
              status: "SCHEDULED",
              catalogueOrder: [42, 43, 44],
              createdByBrokerId: 12
            }
          ]} />
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="create-auction" method="POST" path="/api/coffee/auctions" summary="Create an auction session" />
          <RoleRequirement role="ADMIN only." />
          
          <h4 className="font-semibold text-sm mt-8 mb-2">Request Body Schema</h4>
          <DataTable 
            columns={['Field', 'Type', 'Required', 'Description']}
            data={[
              [<code className="text-xs text-foreground">auctionDate</code>, 'string', 'Yes', 'Format: YYYY-MM-DD'],
              [<code className="text-xs text-foreground">startTime</code>, 'string', 'No', 'Format: HH:MM (24-hour time)']
            ]}
          />
          
          <h4 className="font-semibold text-sm mt-8 mb-2">Response</h4>
          <p className="text-muted-foreground text-sm mb-4">Returns a <code className="font-mono text-xs">CoffeeAuctionSession</code> object with status <code className="font-mono text-xs">SCHEDULED</code>.</p>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="submit-lots" method="POST" path="/api/coffee/auctions/:sessionId/lots" summary="Submit lots to session" />
          <RoleRequirement role="Mandate broker or ADMIN." />
          
          <p className="text-muted-foreground text-sm mb-6">
            The target session must be in the <code className="font-mono text-xs">SCHEDULED</code> state. 
            All submitted lot IDs must correspond to COFFEE commodity lots in <code className="font-mono text-xs">CATALOGUED</code> or <code className="font-mono text-xs">DISPATCHED</code> status.
          </p>

          <h4 className="font-semibold text-sm mb-2">Request Body</h4>
          <CodeBlock code={{
            lotIds: [42, 43, 44]
          }} />

          <h4 className="font-semibold text-sm mt-8 mb-2">Errors</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-6">
            <li><span className="font-mono text-foreground">400 Bad Request</span>: Session is not SCHEDULED, or lots are ineligible.</li>
            <li><span className="font-mono text-foreground">403 Forbidden</span>: Caller does not have rights to submit these lots.</li>
          </ul>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="start-auction" method="POST" path="/api/coffee/auctions/:sessionId/start" summary="Start a live auction" />
          <RoleRequirement role="ADMIN only." />
          
          <p className="text-muted-foreground text-sm mb-6">Moves a session from <code className="font-mono text-xs">SCHEDULED</code> to <code className="font-mono text-xs">LIVE</code> and begins the countdown for the first lot.</p>

          <h4 className="font-semibold text-sm mb-2">Request Body</h4>
          <CodeBlock code={{
            durationMins: 7
          }} />

          <h4 className="font-semibold text-sm mt-8 mb-2">Response Example</h4>
          <CodeBlock code={{
            sessionId: 3,
            currentLotId: 42,
            auctionEndAt: "2026-08-15T09:07:00.000Z"
          }} />
        </EndpointSection>
      </div>
    </div>
  );
}
