import { EndpointSection, EndpointTitle, RoleRequirement, DataTable, MethodBadge } from '@/components/ui/Endpoint';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { OnThisPage } from '@/components/ui/OnThisPage';

export function CoffeeLots() {
  const pageNav = [
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
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Coffee Lots</h1>
        <p className="text-lg text-muted-foreground">Manage the catalogue of coffee lots. Handle creation from electronic warehouse receipts (eWRs), updates, and dispatch documents.</p>
      </div>

      <OnThisPage items={pageNav} />

      <div className="space-y-0">
        <EndpointSection>
          <EndpointTitle id="list-lots" method="GET" path="/api/coffee/lots" summary="List coffee lots" />
          <p className="text-muted-foreground mb-6">Retrieve a list of coffee lots. No authentication is required for browsing.</p>
          
          <h4 className="font-semibold text-sm mb-2">Query Parameters</h4>
          <DataTable 
            columns={['Parameter', 'Type', 'Description']}
            data={[
              [<code className="text-xs text-foreground">grade</code>, 'string', 'Filter by coffee grade (e.g., AA, AB)'],
              [<code className="text-xs text-foreground">giOrigin</code>, 'string', 'Filter by GI origin region'],
              [<code className="text-xs text-foreground">certification</code>, 'string', 'Filter by certification (e.g., RainforestAlliance)'],
              [<code className="text-xs text-foreground">listingType</code>, 'string', 'AUCTION or FIXED_PRICE'],
              [<code className="text-xs text-foreground">status</code>, 'string', 'DRAFT, CATALOGUED, DISPATCHED, LIVE, SOLD, UNSOLD, WITHDRAWN, RESERVE_NOT_MET'],
              [<code className="text-xs text-foreground">brokerId</code>, 'integer', 'Filter by mandate broker ID'],
              [<code className="text-xs text-foreground">ownerId</code>, 'integer', 'Filter by eWR owner ID'],
            ]}
          />

          <h4 className="font-semibold text-sm mt-8 mb-2">Response Example</h4>
          <CodeBlock code={[
            {
              id: 42,
              ewrId: 18,
              ownerId: 7,
              brokerId: 12,
              grade: "AA",
              gradeMark: "Gakuyu Farmers Cooperative",
              giOrigin: "Nyeri",
              grossWeightKg: "6120",
              netWeightKg: "6000",
              tareWeightKg: "120",
              packageType: "60kg GrainPro Bags",
              processingMethod: "Washed",
              varietal: "SL28/SL34",
              altitude: 1750,
              cuppingRemarks: "Bright acidity, blackcurrant, bergamot. Score 87.",
              certifications: ["RainforestAlliance", "FairTrade"],
              listingType: "AUCTION",
              reservePriceUsd: "9.80",
              status: "CATALOGUED",
              warehouseCode: "NBO-001",
              coffeeBeanSize: "17/18",
              coffeeCuppingScore: "87",
              publishedAt: "2026-08-07T09:00:00.000Z"
            }
          ]} />
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="catalogue-lot" method="POST" path="/api/coffee/lots" summary="Catalogue a new coffee lot" />
          <RoleRequirement role="ENABLER with active COFFEE mandate, or PRODUCER owning the eWR." />
          
          <h4 className="font-semibold text-sm mt-8 mb-2">Request Body Schema</h4>
          <DataTable 
            columns={['Field', 'Type', 'Required', 'Description']}
            data={[
              [<code className="text-xs text-foreground">ewrId</code>, 'integer', 'Yes', 'COFFEE eWR ID. Must be in INGESTED state.'],
              [<code className="text-xs text-foreground">grade</code>, 'string', 'Yes', 'AA, AB, C, PB, E, TT, T, MH/ML'],
              [<code className="text-xs text-foreground">gradeMark</code>, 'string', 'Yes', 'Factory or cooperative name'],
              [<code className="text-xs text-foreground">giOrigin</code>, 'string', 'Yes', 'GI-registered region (e.g., Nyeri, Kirinyaga)'],
              [<code className="text-xs text-foreground">grossWeightKg</code>, 'number', 'Yes', 'Total gross weight including packaging'],
              [<code className="text-xs text-foreground">netWeightKg</code>, 'number', 'Yes', 'Net coffee weight after tare'],
              [<code className="text-xs text-foreground">tareWeightKg</code>, 'number', 'Yes', 'Weight of packaging'],
              [<code className="text-xs text-foreground">packageType</code>, 'string', 'Yes', 'e.g., 60kg GrainPro Bags'],
              [<code className="text-xs text-foreground">processingMethod</code>, 'string', 'No', 'Washed, Natural, Honey, Wet-hulled'],
              [<code className="text-xs text-foreground">varietal</code>, 'string', 'No', 'e.g., SL28/SL34, Bourbon, Geisha'],
              [<code className="text-xs text-foreground">altitude</code>, 'number', 'No', 'Growing altitude in masl'],
              [<code className="text-xs text-foreground">cuppingRemarks</code>, 'string', 'No', 'Tasting notes and subjective scores'],
              [<code className="text-xs text-foreground">certifications</code>, 'string[]', 'No', 'RainforestAlliance, FairTrade, Organic, UTZ'],
              [<code className="text-xs text-foreground">listingType</code>, 'string', 'No', 'AUCTION or FIXED_PRICE (default: AUCTION)'],
              [<code className="text-xs text-foreground">reservePriceUsd</code>, 'number', 'Conditional', 'Required if listingType=AUCTION'],
              [<code className="text-xs text-foreground">fixedPricePerKgUsd</code>, 'number', 'Conditional', 'Required if listingType=FIXED_PRICE'],
              [<code className="text-xs text-foreground">commissionRate</code>, 'number', 'No', '0.0 to 1.0 (default 0.01). Overridden by mandate.'],
              [<code className="text-xs text-foreground">bidSecurityPct</code>, 'number', 'No', 'Bid deposit fraction, 0.0 to 1.0 (default 0.10)'],
            ]}
          />

          <h4 className="font-semibold text-sm mt-8 mb-2">Errors</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-6">
            <li><span className="font-mono text-foreground">400 Bad Request</span>: Validation failed or eWR not in INGESTED state.</li>
            <li><span className="font-mono text-foreground">403 Forbidden</span>: Caller does not have a mandate or own the eWR.</li>
            <li><span className="font-mono text-foreground">404 Not Found</span>: eWR ID not found.</li>
            <li><span className="font-mono text-foreground">409 Conflict</span>: An active lot already exists for this eWR.</li>
          </ul>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="get-lot" method="GET" path="/api/coffee/lots/:id" summary="Get full lot details" />
          <p className="text-muted-foreground mb-6">Retrieves the complete profile for a single lot, including enriched data from the warehouse receipt and warehouse operator profile.</p>
          
          <h4 className="font-semibold text-sm mt-8 mb-2">Response Example</h4>
          <CodeBlock code={{
            id: 42,
            grade: "AA",
            status: "CATALOGUED",
            ownerName: "Jane Doe Farm",
            brokerName: "Nairobi Exchange Brokers",
            ewr: {
              ewrsReceiptId: "EWR-COF-9912",
              commodityType: "COFFEE",
              weightMt: 6.12,
              harvestSeason: "2025/2026",
              state: "INGESTED",
              coffeeBeanSize: "17/18",
              coffeeCuppingScore: "87",
              warehouseCode: "NBO-001"
            },
            warehouseProfile: {
              operatorName: "Kenya Warehouse Co.",
              wrscLicenseNumber: "LIC-WH-992",
              facilityType: "Bonded",
              capacityMt: 5000,
              warehouseInChargeName: "John Smith",
              handlesCoffee: true
            }
          }} />
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="update-lot" method="PATCH" path="/api/coffee/lots/:id" summary="Update a lot" />
          <RoleRequirement role="Mandate broker or eWR owner." />
          <p className="text-muted-foreground mb-6">Update fields on a DRAFT or CATALOGUED lot. Updating a DRAFT lot automatically transitions it to CATALOGUED.</p>
          <p className="text-sm text-muted-foreground">All fields from the POST request are accepted, except <code className="text-xs font-mono text-foreground bg-muted px-1 rounded">ewrId</code>.</p>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="attach-dispatch" method="POST" path="/api/coffee/lots/:id/dispatch" summary="Attach a dispatch document" />
          
          <h4 className="font-semibold text-sm mb-2">Request Body</h4>
          <CodeBlock code={{
            docType: "PRE_AUCTION_DISPATCH",
            docData: {
              driverName: "Kiprop",
              truckPlate: "KCC 123G",
              sealNumber: "S-99102"
            }
          }} />
          <p className="text-sm text-muted-foreground mt-4 mb-4">Supported <code className="font-mono text-xs text-foreground">docType</code> values:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-6">
            <li><code className="font-mono text-foreground">PRE_AUCTION_DISPATCH</code>: Farm to auction warehouse dispatch.</li>
            <li><code className="font-mono text-foreground">WEIGHMENT_REPORT</code>: Official weighment at receiving warehouse.</li>
            <li><code className="font-mono text-foreground">DELIVERY_ORDER</code>: Post-sale delivery authorization (only allowed on SOLD lots).</li>
          </ul>
        </EndpointSection>

        <EndpointSection>
          <EndpointTitle id="list-dispatch" method="GET" path="/api/coffee/lots/:id/dispatch" summary="List all dispatch documents" />
          <p className="text-muted-foreground">Retrieves an array of all dispatch records associated with the lot.</p>
        </EndpointSection>
      </div>
    </div>
  );
}
