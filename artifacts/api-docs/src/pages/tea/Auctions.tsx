import { EndpointSection, EndpointTitle, RoleRequirement } from '@/components/ui/Endpoint';

export function TeaAuctions() {
  return (
    <div className="animate-in fade-in duration-500 xl:pr-64">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Tea Auctions</h1>
        <p className="text-lg text-muted-foreground">Schedule sessions, manage catalogues, and run live tea auctions. The endpoints mirror the coffee auction system exactly, with payloads and responses retaining the identical structure.</p>
      </div>

      <div className="space-y-0">
        <EndpointSection>
          <EndpointTitle id="list-auctions" method="GET" path="/api/tea/auctions" summary="List auction sessions" />
          <p className="text-muted-foreground text-sm">Query by <code className="font-mono text-xs bg-muted px-1 rounded text-foreground">status</code> (SCHEDULED, LIVE, CLOSED, COMPLETED).</p>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="create-auction" method="POST" path="/api/tea/auctions" summary="Create an auction session" />
          <RoleRequirement role="ADMIN only." />
          <p className="text-muted-foreground text-sm">Requires <code className="font-mono text-xs bg-muted px-1 rounded text-foreground">auctionDate</code> and optional <code className="font-mono text-xs bg-muted px-1 rounded text-foreground">startTime</code>.</p>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="submit-lots" method="POST" path="/api/tea/auctions/:sessionId/lots" summary="Submit lots to session" />
          <RoleRequirement role="Mandate broker or ADMIN." />
          <p className="text-muted-foreground text-sm">Pass an array of <code className="font-mono text-xs bg-muted px-1 rounded text-foreground">lotIds</code>. Target lots must be TEA commodity.</p>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="start-auction" method="POST" path="/api/tea/auctions/:sessionId/start" summary="Start a live auction" />
          <RoleRequirement role="ADMIN only." />
          <p className="text-muted-foreground text-sm">Moves the session to LIVE state. Provide <code className="font-mono text-xs bg-muted px-1 rounded text-foreground">durationMins</code>.</p>
        </EndpointSection>
      </div>
    </div>
  );
}
