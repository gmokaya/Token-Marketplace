import { useState } from "react";
import {
  useListIntegrationCredentials,
  useCreateIntegrationCredential,
  useRevokeIntegrationCredential,
  type IntegrationCredential,
  type CreateIntegrationCredentialRequestScopesItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Key, Plus, Trash2, Copy, Check, ChevronDown, ChevronRight, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const AVAILABLE_SCOPES = [
  { value: "ewr:push",     label: "eWR Push",      description: "Submit electronic warehouse receipts via POST /ewrs" },
  { value: "wrsc:intake",  label: "WRSC Intake",   description: "Submit receipts through WRSC Central Registry via POST /wrsc/intake" },
] as const;

type Scope = CreateIntegrationCredentialRequestScopesItem;

function scopeBadge(scope: string) {
  const colors: Record<string, string> = {
    "ewr:push":    "bg-emerald-900/20 text-emerald-300 border-emerald-800/40",
    "wrsc:intake": "bg-teal-900/20   text-teal-300   border-teal-800/40",
  };
  return colors[scope] ?? "bg-muted text-muted-foreground";
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(enabled: boolean, expiresAt: string | null | undefined) {
  if (!enabled) return <span className="text-xs font-mono text-destructive">Revoked</span>;
  if (expiresAt && new Date(expiresAt) < new Date()) return <span className="text-xs font-mono text-muted-foreground">Expired</span>;
  return <span className="text-xs font-mono text-emerald-400">Active</span>;
}

// ── One-time key display ──────────────────────────────────────────────────────
function KeyRevealDialog({ apiKey, onClose }: { apiKey: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            API Key Generated
          </DialogTitle>
          <DialogDescription>
            Copy your key now — it will <strong>not</strong> be shown again.
          </DialogDescription>
        </DialogHeader>
        <Alert className="border-amber-800/40 bg-amber-900/10">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <AlertDescription className="text-amber-300 text-xs">
            Store this key securely. Anyone with this key can push eWRs on your behalf.
          </AlertDescription>
        </Alert>
        <div className="flex items-center gap-2 bg-muted/40 rounded border border-border px-3 py-2">
          <code className="flex-1 text-xs font-mono text-foreground break-all">{apiKey}</code>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={copy}>
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done — I've saved my key</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create credential dialog ──────────────────────────────────────────────────
function CreateCredentialDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string) => void }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Scope[]>(["ewr:push"]);
  const [expiresAt, setExpiresAt] = useState("");
  const { toast } = useToast();

  const create = useCreateIntegrationCredential();

  function toggleScope(s: Scope) {
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function submit() {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!scopes.length) { toast({ title: "Select at least one scope", variant: "destructive" }); return; }

    try {
      const body = {
        name: name.trim(),
        scopes: scopes as CreateIntegrationCredentialRequestScopesItem[],
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      };

      const result = await create.mutateAsync({ data: body });
      onCreated((result as any).key);
    } catch {
      toast({ title: "Failed to create credential", variant: "destructive" });
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New API Key</DialogTitle>
          <DialogDescription>
            Generate an integration key for a warehouse portal or producer system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="key-name">Key name</Label>
            <Input
              id="key-name"
              placeholder="e.g. Limuru Tea Portal"
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="mb-2 block">Scopes</Label>
            <div className="space-y-2">
              {AVAILABLE_SCOPES.map(s => (
                <div key={s.value} className="flex items-start gap-3 p-3 rounded border border-border bg-muted/20">
                  <Checkbox
                    id={s.value}
                    checked={scopes.includes(s.value)}
                    onCheckedChange={() => toggleScope(s.value)}
                    className="mt-0.5"
                  />
                  <label htmlFor={s.value} className="cursor-pointer">
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="expires">Expiry date (optional)</Label>
            <Input
              id="expires"
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Generating…" : "Generate Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Setup guide ───────────────────────────────────────────────────────────────
function SetupGuide() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

  const curlExample = `curl -X POST "${apiBase}/ewrs" \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: sk_live_<YOUR_KEY>" \\
  -d '{
    "commodityType": "TEA",
    "warehouseCode": "LMR-001",
    "quantityMt": 2.5,
    "grade": "AA",
    "moisture": 10.5,
    "foreignMatter": 0.2,
    "producerClerkId": "<PRODUCER_CLERK_ID>"
  }'`;

  const ewrPayload = `{
  "commodityType": "TEA",      // COFFEE | TEA | MAIZE | RICE | AVOCADO
  "warehouseCode": "LMR-001",  // Your WRSC-registered warehouse code
  "quantityMt": 2.5,
  "grade": "AA",               // AA | AB | PB | C | E | TT | T
  "moisture": 10.5,            // ≤ 12.0 % for TEA
  "foreignMatter": 0.2,
  "producerClerkId": "..."     // Required for ENABLER-tier callers
}`;

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-sm font-medium">How to connect an external portal</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm border-t border-border bg-muted/10">
          <div className="pt-3">
            <div className="text-xs font-mono text-muted-foreground mb-1">Base URL</div>
            <div className="flex items-center gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{apiBase}</code>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy(apiBase, "base")}>
                {copied === "base" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs font-mono text-muted-foreground mb-1">Authentication header</div>
            <div className="flex items-center gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">X-Api-Key: sk_live_&lt;YOUR_KEY&gt;</code>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy("X-Api-Key: sk_live_<YOUR_KEY>", "header")}>
                {copied === "header" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs font-mono text-muted-foreground mb-1">eWR push payload — POST {apiBase}/ewrs</div>
            <div className="relative">
              <pre className="bg-muted rounded text-xs p-3 overflow-x-auto leading-relaxed">{ewrPayload}</pre>
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => copy(ewrPayload, "payload")}>
                {copied === "payload" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs font-mono text-muted-foreground mb-1">Example curl</div>
            <div className="relative">
              <pre className="bg-muted rounded text-xs p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">{curlExample}</pre>
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => copy(curlExample, "curl")}>
                {copied === "curl" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The key authenticates as <strong>you</strong>. Ensure your account meets the tier requirements
            (PRODUCER or ENABLER) for the endpoints you need. ENABLER-tier callers must include
            <code className="mx-1 text-xs bg-muted px-1 rounded">producerClerkId</code> in every eWR push.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ApiAccess() {
  const { data: creds = [], isLoading } = useListIntegrationCredentials();
  const revokeCredential = useRevokeIntegrationCredential();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function revoke(id: number, name: string) {
    if (!confirm(`Revoke "${name}"? This cannot be undone.`)) return;
    try {
      await revokeCredential.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/integrations/credentials"] });
      toast({ title: "Credential revoked" });
    } catch {
      toast({ title: "Failed to revoke", variant: "destructive" });
    }
  }

  function handleCreated(key: string) {
    setShowCreate(false);
    setNewKey(key);
    queryClient.invalidateQueries({ queryKey: ["/integrations/credentials"] });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Key className="w-6 h-6 text-accent" />
            API Access
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate keys for warehouse portals or producer systems to push eWRs without a browser session.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          New API Key
        </Button>
      </div>

      {/* Credentials table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : creds.length === 0 ? (
          <div className="p-10 text-center">
            <Key className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No API keys yet. Generate one to connect an external system.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Key prefix</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Scopes</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Last used</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Expires</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {creds.map((c: IntegrationCredential) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="text-xs font-mono text-muted-foreground">{c.keyPrefix}…</code>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.scopes.map((s: string) => (
                        <span key={s} className={`text-xs font-mono px-1.5 py-0.5 rounded border ${scopeBadge(s)}`}>{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {c.lastUsedAt ? formatDate(c.lastUsedAt) : "Never"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{formatDate(c.expiresAt)}</span>
                  </td>
                  <td className="px-4 py-3">{statusBadge(c.enabled, c.expiresAt)}</td>
                  <td className="px-4 py-3">
                    {c.enabled && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        onClick={() => revoke(c.id, c.name)}
                        disabled={revokeCredential.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Setup guide */}
      <SetupGuide />

      {/* Dialogs */}
      {showCreate && (
        <CreateCredentialDialog
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {newKey && (
        <KeyRevealDialog
          apiKey={newKey}
          onClose={() => setNewKey(null)}
        />
      )}
    </div>
  );
}
