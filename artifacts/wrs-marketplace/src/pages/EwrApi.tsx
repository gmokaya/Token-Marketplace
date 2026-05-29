import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, CheckCircle, Terminal, Shield, Zap, Webhook } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "/api";

const METHOD_COLOR: Record<string, string> = {
  GET:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  POST:   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  PATCH:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  auth?: string;
  body?: string;
}

interface Group {
  title: string;
  icon: React.ReactNode;
  color: string;
  endpoints: Endpoint[];
}

const GROUPS: Group[] = [
  {
    title: "Authentication — OAuth2 Client Credentials",
    icon: <Shield className="h-4 w-4" />,
    color: "border-purple-200 dark:border-purple-800",
    endpoints: [
      {
        method: "POST",
        path: "/ewr/oauth2/token",
        description: "Obtain a Bearer token using client_credentials grant. Tokens are valid for 30 minutes.",
        auth: "None — public endpoint",
        body: JSON.stringify({ grant_type: "client_credentials", client_id: "fi-agrifinance-01", client_secret: "fi-secret-2025" }, null, 2),
      },
    ],
  },
  {
    title: "Registry-Sync Webhook  (§3.1)",
    icon: <Webhook className="h-4 w-4" />,
    color: "border-orange-200 dark:border-orange-800",
    endpoints: [
      {
        method: "POST",
        path: "/webhooks/registry-sync",
        description: "Accepts the §3.1 standardised JSON payload from the WRSC Central Registry. Optionally verified via X-WRSC-Signature HMAC-SHA256 header.",
        auth: "HMAC-SHA256 signature (X-WRSC-Signature header) — optional in dev",
        body: JSON.stringify({
          ewrs_receipt_id: "eWR-MZE-2026-88931",
          wrsc_registry_signature: "0x8f3c9a22e11b40d...",
          warehouse_code: "WH-NAKURU-04",
          commodity_metadata: {
            type: "MAIZE",
            grade: "EAS-GRADE-1",
            measured_weight_mt: 25.50,
            moisture_content_pct: 12.80,
            harvest_season: "2026S1",
          },
          encumbrance_status: { is_lien_active: false, lien_holder_id: null },
          depositor_email: "producer@example.com",
        }, null, 2),
      },
    ],
  },
  {
    title: "Master Data",
    icon: <Terminal className="h-4 w-4" />,
    color: "border-slate-200 dark:border-slate-700",
    endpoints: [
      { method: "GET", path: "/ewr/master/depositor-types",  description: "List depositor types (Entity / Individual)" },
      { method: "GET", path: "/ewr/master/entity-types",     description: "List entity types (Cooperative, Partnership, etc.)" },
      { method: "GET", path: "/ewr/master/commodity-types",  description: "List commodity type categories" },
      { method: "GET", path: "/ewr/master/commodity-names",  description: "List all commodity names with their type IDs" },
      { method: "GET", path: "/ewr/master/counties",         description: "List all Kenyan counties" },
      { method: "GET", path: "/ewr/master/seasons",          description: "List crop year / harvest seasons" },
      { method: "GET", path: "/ewr/master/charge-headers",   description: "List charge headers and fee schedule" },
      { method: "GET", path: "/ewr/master/unit-types",       description: "List commodity unit types (MT, KG, bags)" },
    ],
  },
  {
    title: "Warehouse Operator System",
    icon: <Zap className="h-4 w-4" />,
    color: "border-emerald-200 dark:border-emerald-800",
    endpoints: [
      {
        method: "GET",
        path: "/ewr/warehouse/depositors",
        description: "List all registered producers (depositors) on the platform",
      },
      {
        method: "GET",
        path: "/ewr/warehouse/depositor/by-email/:email",
        description: "Look up a depositor by email address",
      },
      {
        method: "GET",
        path: "/ewr/warehouse/issuance/:id",
        description: "Get full issuance (eWR) details by internal platform ID",
      },
      {
        method: "GET",
        path: "/ewr/getIssuanceDetailsById?wareHouseReciptNo=WR-124-2025",
        description: "Get issuance details by warehouse receipt number (FI doc §4.6 contract)",
      },
      {
        method: "POST",
        path: "/ewr/warehouse/register-receipt",
        description: "Register a new warehouse receipt using the §3.1 payload format. Returns the internal eWR ID.",
        body: JSON.stringify({
          ewrs_receipt_id: "eWR-MZE-2026-99001",
          wrsc_registry_signature: "0xABC123",
          warehouse_code: "WH-ELDORET-02",
          commodity_metadata: { type: "MAIZE", grade: "EAS-GRADE-2", measured_weight_mt: 10, moisture_content_pct: 13.5, harvest_season: "2026S1" },
          depositor_email: "producer@example.com",
        }, null, 2),
      },
      {
        method: "GET",
        path: "/ewr/warehouse/market-data",
        description: "Aggregated spot market prices per commodity and grade",
      },
      {
        method: "GET",
        path: "/ewr/warehouse/listing-price/:receiptId",
        description: "Get the active spot listing price and total valuation for a specific receipt",
      },
      {
        method: "POST",
        path: "/ewr/warehouse/pledge",
        description: "Apply a lien (pledge) on a warehouse receipt. Updates state to ENCUMBERED.",
        body: JSON.stringify({ financialInstitutionId: "1", issueId: 1, proposedLoanAmount: 95000 }, null, 2),
      },
      {
        method: "POST",
        path: "/ewr/warehouse/loan-sanction",
        description: "Sanction or reject a loan against a pledged receipt",
        body: JSON.stringify({ financialLoanId: 1, sanctionStatus: "SANCTIONED" }, null, 2),
      },
      {
        method: "POST",
        path: "/ewr/warehouse/transfer",
        description: "Transfer receipt ownership to a new depositor (only if no active lien)",
        body: JSON.stringify({ warehouseReceiptNumber: "eWR-MZE-2026-88931", newDepositorEmail: "new-producer@example.com" }, null, 2),
      },
      {
        method: "POST",
        path: "/ewr/warehouse/retire",
        description: "Retire a warehouse receipt — sets state to SETTLED",
        body: JSON.stringify({ warehouseReceiptNumber: "eWR-MZE-2026-88931", retirementReason: "Commodity collected by depositor" }, null, 2),
      },
    ],
  },
  {
    title: "Financial Institution",
    icon: <Shield className="h-4 w-4" />,
    color: "border-blue-200 dark:border-blue-800",
    endpoints: [
      {
        method: "GET",
        path: "/ewr/finance/institutions",
        description: "List all registered financial institutions on the platform",
      },
      {
        method: "POST",
        path: "/ewr/finance/pledge",
        description: "FI-initiated pledge request against a warehouse receipt",
        body: JSON.stringify({ financialInstitutionId: "1", issueId: 1, proposedLoanAmount: 90000 }, null, 2),
      },
      {
        method: "GET",
        path: "/ewr/finance/loan-details?wareHouseReciptNo=eWR-MZE-2026-88931",
        description: "Get loan details for a receipt — date of pledging, proposed amount, duration (FI doc §4.4)",
      },
      {
        method: "GET",
        path: "/ewr/finance/sanction-details?wareHouseReciptNo=eWR-MZE-2026-88931",
        description: "Get loan sanction status, approved amount, and interest rate (FI doc §4.5)",
      },
    ],
  },
  {
    title: "KOMEX Trading Platform",
    icon: <Zap className="h-4 w-4" />,
    color: "border-amber-200 dark:border-amber-800",
    endpoints: [
      {
        method: "POST",
        path: "/ewr/komex/submit",
        description: "Submit a warehouse receipt for commodity exchange trading. Computes disbursement breakdown: warehouse operator, council, FI, and depositor shares. Optionally retires the receipt.",
        body: JSON.stringify({
          issuanceWhId: 1,
          operationalCost: 500,
          councilCharge: 200,
          pledgedAmount: 80000,
          pledgedStatus: "Yes",
          retirementStatus: "Yes",
        }, null, 2),
      },
    ],
  },
];

const TEST_CLIENTS = [
  { clientId: "fi-agrifinance-01", secret: "fi-secret-2025",    label: "AgriFinance Bank Kenya" },
  { clientId: "fi-equity-02",      secret: "equity-secret-2025", label: "Equity Agrovet Finance" },
  { clientId: "wo-nakuru-01",      secret: "wo-secret-2025",    label: "Nakuru Warehouse Services" },
  { clientId: "komex-platform-01", secret: "komex-secret-2025", label: "KOMEX Trading Platform" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-6 w-6 shrink-0"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast({ description: "Copied to clipboard" });
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function EndpointRow({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`mt-0.5 text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${METHOD_COLOR[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <div className="min-w-0">
          <code className="text-sm font-mono break-all">{endpoint.path}</code>
          <p className="text-xs text-muted-foreground mt-0.5">{endpoint.description}</p>
        </div>
      </button>
      {open && (
        <div className="border-t px-4 py-3 bg-muted/20 space-y-3 text-sm">
          {endpoint.auth && (
            <div>
              <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Auth</span>
              <p className="mt-0.5 text-muted-foreground">{endpoint.auth}</p>
            </div>
          )}
          {endpoint.body && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Request Body</span>
                <CopyButton text={endpoint.body} />
              </div>
              <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">{endpoint.body}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EwrApi() {
  const { toast } = useToast();
  const [clientId, setClientId]     = useState(TEST_CLIENTS[0].clientId);
  const [clientSecret, setSecret]   = useState(TEST_CLIENTS[0].secret);
  const [token, setToken]           = useState("");
  const [loading, setLoading]       = useState(false);

  async function fetchToken() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ewr/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
      });
      const data = await res.json() as { access_token?: string; error?: string };
      if (data.access_token) {
        setToken(data.access_token);
        toast({ description: "Token obtained — valid 30 minutes" });
      } else {
        toast({ variant: "destructive", description: data.error ?? "Failed to obtain token" });
      }
    } catch {
      toast({ variant: "destructive", description: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">eWRS API Integration</h1>
          <p className="text-muted-foreground mt-1">
            External compatibility layer implementing the CSM Technologies eWRS API contract —
            OAuth2 client credentials, §3.1 registry-sync webhook, warehouse operator, financial institution,
            and KOMEX trading platform endpoints.
          </p>
        </div>

        <Tabs defaultValue="endpoints">
          <TabsList>
            <TabsTrigger value="endpoints">API Reference</TabsTrigger>
            <TabsTrigger value="credentials">Client Credentials</TabsTrigger>
            <TabsTrigger value="token">Get Token</TabsTrigger>
          </TabsList>

          {/* ── API Reference ─────────────────────────────────────────────── */}
          <TabsContent value="endpoints" className="space-y-6 mt-4">
            {GROUPS.map((group) => (
              <Card key={group.title} className={`border-l-4 ${group.color}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {group.icon}
                    {group.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.endpoints.map((ep) => (
                    <EndpointRow key={ep.method + ep.path} endpoint={ep} />
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Client Credentials ────────────────────────────────────────── */}
          <TabsContent value="credentials" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Registered OAuth2 Clients</CardTitle>
                <CardDescription>
                  Use these client_id / client_secret pairs to obtain Bearer tokens via{" "}
                  <code className="text-xs bg-muted px-1 rounded">POST /ewr/oauth2/token</code>.
                  These are development credentials — rotate before production deployment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {TEST_CLIENTS.map((c) => (
                    <div key={c.clientId} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{c.label}</span>
                        <Badge variant="outline" className="text-xs">client_credentials</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="space-y-1">
                          <p className="text-muted-foreground uppercase tracking-wide text-[10px]">client_id</p>
                          <div className="flex items-center gap-1 bg-muted rounded px-2 py-1">
                            <span className="flex-1 truncate">{c.clientId}</span>
                            <CopyButton text={c.clientId} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground uppercase tracking-wide text-[10px]">client_secret</p>
                          <div className="flex items-center gap-1 bg-muted rounded px-2 py-1">
                            <span className="flex-1 truncate">{c.secret}</span>
                            <CopyButton text={c.secret} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Webhook URL</CardTitle>
                <CardDescription>
                  Register this URL in the WRSC Central Registry to receive automatic eWR data pushes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 bg-muted rounded p-3 font-mono text-sm">
                  <span className="flex-1 break-all">{window.location.origin}{API_BASE}/webhooks/registry-sync</span>
                  <CopyButton text={`${window.location.origin}${API_BASE}/webhooks/registry-sync`} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Sign the JSON body with <code className="bg-muted px-1 rounded">HMAC-SHA256</code> using the
                  shared <code className="bg-muted px-1 rounded">WRSC_SECRET</code> and pass the hex digest
                  in the <code className="bg-muted px-1 rounded">X-WRSC-Signature</code> header.
                  Signature verification is optional in development but enforced in production.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Get Token ─────────────────────────────────────────────────── */}
          <TabsContent value="token" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live OAuth2 Token Test</CardTitle>
                <CardDescription>
                  Obtain a real Bearer token from the running API server to test authenticated endpoints.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="preset">Quick-fill client</Label>
                    <select
                      id="preset"
                      className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                      onChange={(e) => {
                        const c = TEST_CLIENTS[parseInt(e.target.value)];
                        if (c) { setClientId(c.clientId); setSecret(c.secret); }
                      }}
                    >
                      {TEST_CLIENTS.map((c, i) => (
                        <option key={c.clientId} value={i}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cid">client_id</Label>
                    <Input id="cid" value={clientId} onChange={(e) => setClientId(e.target.value)} className="font-mono text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="csecret">client_secret</Label>
                    <Input id="csecret" value={clientSecret} onChange={(e) => setSecret(e.target.value)} className="font-mono text-sm" />
                  </div>
                </div>

                <Button onClick={fetchToken} disabled={loading} className="w-full">
                  {loading ? "Fetching…" : "POST /ewr/oauth2/token"}
                </Button>

                {token && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label>access_token (HS256 JWT)</Label>
                      <CopyButton text={`Bearer ${token}`} />
                    </div>
                    <pre className="bg-muted rounded p-3 text-[11px] font-mono break-all whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {token}
                    </pre>
                    <p className="text-xs text-muted-foreground">
                      Use as <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;token&gt;</code> on all <code className="bg-muted px-1 rounded">/ewr/*</code> endpoints.
                      Expires in 30 minutes.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
