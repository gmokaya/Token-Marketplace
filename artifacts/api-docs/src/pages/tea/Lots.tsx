import { EndpointSection, EndpointTitle, RoleRequirement, DataTable } from '@/components/ui/Endpoint';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { OnThisPage } from '@/components/ui/OnThisPage';

export function TeaLots() {
  const pageNav = [
    { id: 'data-model', title: 'Data Model Difference' },
    { id: 'list-lots', title: 'List lots' },
    { id: 'catalogue-lot', title: 'Catalogue lot' },
    { id: 'get-lot', title: 'Get lot details' },
    { id: 'update-lot', title: 'Update lot' },
    { id: 'attach-dispatch', title: 'Attach dispatch' },
    { id: 'list-dispatch', title: 'List dispatches' },
  ];

  return (
    <div className="animate-in fade-in duration-500 xl:pr-64">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Tea Lots</h1>
        <p className="text-lg text-muted-foreground">Manage the catalogue of tea lots. Tea lots share an identical lifecycle and structure to coffee lots, with a minor data model substitution for sensory evaluation.</p>
      </div>

      <OnThisPage items={pageNav} />

      <div className="space-y-0">
        <EndpointSection>
          <div id="data-model" className="mb-6 mt-4 p-6 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-blue-400">Model Substitution</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Instead of <code className="font-mono text-xs text-foreground bg-muted px-1 rounded">processingMethod</code>, <code className="font-mono text-xs text-foreground bg-muted px-1 rounded">varietal</code>, <code className="font-mono text-xs text-foreground bg-muted px-1 rounded">altitude</code>, and <code className="font-mono text-xs text-foreground bg-muted px-1 rounded">cuppingRemarks</code>, tea lots use a single field:<br/>
              <code className="font-mono text-sm text-foreground bg-background border border-border px-1.5 py-0.5 rounded mt-3 inline-block">tasterRemarks (string)</code><br/>
              Used for liquor analysis, appearance notes, and overall taster evaluation.
            </p>
          </div>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="list-lots" method="GET" path="/api/tea/lots" summary="List tea lots" />
          <p className="text-muted-foreground mb-6">Supports the exact same query parameters as coffee lot listing.</p>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="catalogue-lot" method="POST" path="/api/tea/lots" summary="Catalogue a new tea lot" />
          <RoleRequirement role="ENABLER with active TEA mandate, or PRODUCER owning the TEA eWR." />
          
          <h4 className="font-semibold text-sm mt-8 mb-2">Request Body Example</h4>
          <CodeBlock code={{
            ewrId: 9,
            grade: "BOPF",
            gradeMark: "Kericho Gold Estate",
            giOrigin: "Kericho",
            grossWeightKg: 3120,
            netWeightKg: 3000,
            tareWeightKg: 120,
            packageType: "50kg Paper Sacks",
            tasterRemarks: "Bright liquor, medium body, floral.",
            certifications: ["RainforestAlliance"],
            listingType: "AUCTION",
            reservePriceUsd: 3.20,
            commissionRate: 0.01,
            bidSecurityPct: 0.1
          }} />
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="get-lot" method="GET" path="/api/tea/lots/:id" summary="Get full lot details" />
          <p className="text-muted-foreground">Retrieves the complete profile including the TEA eWR data and warehouse profile.</p>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="update-lot" method="PATCH" path="/api/tea/lots/:id" summary="Update a lot" />
          <RoleRequirement role="Mandate broker or eWR owner." />
          <p className="text-muted-foreground">Same rules apply as coffee lots.</p>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="attach-dispatch" method="POST" path="/api/tea/lots/:id/dispatch" summary="Attach a dispatch document" />
          <p className="text-muted-foreground">Accepts the exact same <code className="font-mono text-xs">docType</code> values and payload structure as coffee dispatch attachments.</p>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="list-dispatch" method="GET" path="/api/tea/lots/:id/dispatch" summary="List all dispatch documents" />
        </EndpointSection>
      </div>
    </div>
  );
}
