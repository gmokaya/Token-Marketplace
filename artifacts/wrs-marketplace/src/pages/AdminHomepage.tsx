import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Globe, Save, ImageOff } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

type Partner = {
  id: string;
  name: string;
  logoUrl: string;
  website: string;
};

const DEFAULT_PARTNERS: Partner[] = [
  { id: "1", name: "Kenya Cereal Board", logoUrl: "", website: "https://kcb.go.ke" },
  { id: "2", name: "East African Community", logoUrl: "", website: "https://eac.int" },
  { id: "3", name: "African Development Bank", logoUrl: "", website: "https://afdb.org" },
  { id: "4", name: "Equity Bank Kenya", logoUrl: "", website: "https://equitybankgroup.com" },
  { id: "5", name: "Kilimo Trust", logoUrl: "", website: "https://kilimotrust.org" },
  { id: "6", name: "Kenya National Farmers Federation", logoUrl: "", website: "https://kenaff.org" },
];

function newPartner(): Partner {
  return { id: Date.now().toString(), name: "", logoUrl: "", website: "" };
}

function LogoPreview({ logoUrl, name }: { logoUrl: string; name: string }) {
  const [broken, setBroken] = useState(false);
  if (!logoUrl || broken) {
    return (
      <div className="w-14 h-10 bg-gray-100 rounded flex items-center justify-center">
        <ImageOff className="w-4 h-4 text-gray-400" />
      </div>
    );
  }
  return (
    <img
      src={logoUrl}
      alt={name}
      className="h-10 w-14 object-contain rounded"
      onError={() => setBroken(true)}
    />
  );
}

export default function AdminHomepage() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>(DEFAULT_PARTNERS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/content/partners`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.value?.partners?.length) setPartners(data.value.partners);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updatePartner = (id: string, field: keyof Partner, value: string) =>
    setPartners(ps => ps.map(p => p.id === id ? { ...p, [field]: value } : p));

  const removePartner = (id: string) =>
    setPartners(ps => ps.filter(p => p.id !== id));

  const movePartner = (id: string, dir: -1 | 1) => {
    setPartners(ps => {
      const i = ps.findIndex(p => p.id === id);
      if (i + dir < 0 || i + dir >= ps.length) return ps;
      const next = [...ps];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/content/partners`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: { partners } }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Saved", description: "Partner logos updated on the homepage." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Homepage Content</h1>
            <p className="text-muted-foreground mt-1">Manage partner logos shown on the public landing page.</p>
          </div>
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>

        {/* Partners section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Partner Logos
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setPartners(ps => [...ps, newPartner()])}
            >
              <Plus className="w-4 h-4" /> Add Partner
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>}
            {!loading && partners.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No partners yet. Click "Add Partner" to get started.</p>
            )}
            {partners.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                {/* Sort controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => movePartner(p.id, -1)}
                    disabled={i === 0}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-30 p-0.5"
                  >▲</button>
                  <GripVertical className="w-4 h-4 text-gray-300" />
                  <button
                    onClick={() => movePartner(p.id, 1)}
                    disabled={i === partners.length - 1}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-30 p-0.5"
                  >▼</button>
                </div>

                {/* Logo preview */}
                <LogoPreview logoUrl={p.logoUrl} name={p.name} />

                {/* Fields */}
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
                    <Input
                      value={p.name}
                      onChange={e => updatePartner(p.id, "name", e.target.value)}
                      placeholder="Partner name"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Logo URL</Label>
                    <Input
                      value={p.logoUrl}
                      onChange={e => updatePartner(p.id, "logoUrl", e.target.value)}
                      placeholder="https://…/logo.png"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Website</Label>
                    <Input
                      value={p.website}
                      onChange={e => updatePartner(p.id, "website", e.target.value)}
                      placeholder="https://…"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Remove */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-600 shrink-0"
                  onClick={() => removePartner(p.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live preview strip */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-[#f5f5f5] rounded-lg p-6 overflow-x-auto">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-5">Trusted Partners</p>
              <div className="flex flex-wrap justify-center items-center gap-8">
                {partners.filter(p => p.name).map(p => (
                  <div key={p.id} className="flex flex-col items-center gap-2 min-w-[80px]">
                    <LogoPreview logoUrl={p.logoUrl} name={p.name} />
                    <span className="text-xs text-gray-500 text-center leading-tight max-w-[80px]">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
