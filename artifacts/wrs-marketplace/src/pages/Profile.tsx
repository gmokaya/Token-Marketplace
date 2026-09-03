import { Layout } from "@/components/layout/Layout";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState, useEffect } from "react";
import { customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, Phone, CreditCard, Shield, ClipboardList, ChevronDown, ChevronUp, Pencil, X, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const producerSchema = z.object({
  entityName: z.string().min(2, "Required"),
  registrationNumber: z.string().min(4, "Required"),
  kraPin: z.string().optional(),
  officeAddress: z.string().optional(),
  adminFirstName: z.string().optional(),
  adminLastName: z.string().optional(),
  adminPhone: z.string().optional(),
  adminEmail: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
});

const buyerSchema = z.object({
  companyLegalName: z.string().min(2, "Required"),
  registrationNumber: z.string().min(4, "Required"),
  kraPin: z.string().optional(),
  officeAddress: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  buyerPersonnelName: z.string().optional(),
  buyerPersonnelPhone: z.string().optional(),
  buyerPersonnelEmail: z.string().optional(),
  purchasingLimitUsd: z.string().optional(),
});

const warehouseSchema = z.object({
  operatorName: z.string().min(2, "Required"),
  wrscLicenseNumber: z.string().min(4, "Required"),
  capacityMt: z.string().optional(),
  warehouseInChargeName: z.string().optional(),
  warehouseInChargePhone: z.string().optional(),
  warehouseInChargeEmail: z.string().optional(),
  insurerName: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
});

const financierSchema = z.object({
  institutionName: z.string().min(2, "Required"),
  centralBankLicenseCode: z.string().min(4, "Required"),
  departmentDesignation: z.string().optional(),
  creditApproverName: z.string().optional(),
  creditApproverEmail: z.string().optional(),
  maxLiquidityPoolUsd: z.string().optional(),
});

const cooperativeSchema = z.object({
  entityName: z.string().min(2, "Required"),
  registrationNumber: z.string().min(4, "Required"),
  licenceNumber: z.string().optional(),
  kraPin: z.string().optional(),
  officeAddress: z.string().optional(),
  adminFirstName: z.string().optional(),
  adminLastName: z.string().optional(),
  adminPhone: z.string().optional(),
  adminEmail: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  mobileMoneyPaybill: z.string().optional(),
});

const identitySchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  company: z.string().min(2, "Company / entity name is required"),
  phone: z.string().min(8, "A valid phone number is required"),
  nationalId: z.string().min(4, "National ID or passport number is required"),
});

const socialProfileSchema = z.object({
  socialBio: z.string().max(500, "Keep your introduction under 500 characters").optional(),
  websiteUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  linkedinUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  instagramUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  xUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
});

const schemaForTier = (tier: string) => {
  switch (tier) {
    case "PRODUCER": return producerSchema;
    case "OFF_TAKER": return buyerSchema;
    case "ENABLER": return warehouseSchema;
    case "FINANCIER": return financierSchema;
    case "COOPERATIVE": return cooperativeSchema;
    default: return z.object({});
  }
};

function KybForm({ tier, existingProfile, onSuccess }: { tier: string; existingProfile?: any; onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(schemaForTier(tier)),
    defaultValues: existingProfile ?? {},
  });

  async function onSubmit(profileValues: any) {
    setSubmitting(true);
    try {
      const res = await customFetch("/api/profiles/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: profileValues }),
      }) as Response;
      const data = await res.json() as { user: any; tierProfile: any };
      queryClient.setQueryData(getGetMeQueryKey(), data.user);
      toast({ title: "Profile saved!", description: "Your compliance profile has been submitted for KYB review." });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {tier === "PRODUCER" && (
          <>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required</div>
            <FormField control={form.control} name="entityName" render={({ field }) => (
              <FormItem><FormLabel>Registered Entity Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="Nyeri Coffee Farmers Co-op Ltd" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="registrationNumber" render={({ field }) => (
              <FormItem><FormLabel>Registration / Incorporation Number <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="C123456" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Optional</div>
            <FormField control={form.control} name="kraPin" render={({ field }) => (
              <FormItem><FormLabel>KRA PIN</FormLabel><FormControl><Input placeholder="A123456789B" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="officeAddress" render={({ field }) => (
              <FormItem><FormLabel>Registered Office Address</FormLabel><FormControl><Input placeholder="Nyeri County, Kenya" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="adminFirstName" render={({ field }) => (
              <FormItem><FormLabel>Admin First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="adminLastName" render={({ field }) => (
              <FormItem><FormLabel>Admin Last Name</FormLabel><FormControl><Input placeholder="Kamau" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="adminPhone" render={({ field }) => (
              <FormItem><FormLabel>Admin Phone</FormLabel><FormControl><Input placeholder="+254 712 345 678" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="adminEmail" render={({ field }) => (
              <FormItem><FormLabel>Admin Email</FormLabel><FormControl><Input placeholder="admin@coop.co.ke" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="bankName" render={({ field }) => (
              <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="Co-operative Bank" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="bankAccountNumber" render={({ field }) => (
              <FormItem><FormLabel>Bank Account Number</FormLabel><FormControl><Input placeholder="0123456789" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </>
        )}

        {tier === "OFF_TAKER" && (
          <>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required</div>
            <FormField control={form.control} name="companyLegalName" render={({ field }) => (
              <FormItem><FormLabel>Company Legal Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="Mombasa Tea Exporters Ltd" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="registrationNumber" render={({ field }) => (
              <FormItem><FormLabel>Registration Number <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="C987654" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Optional</div>
            <FormField control={form.control} name="kraPin" render={({ field }) => (
              <FormItem><FormLabel>KRA PIN</FormLabel><FormControl><Input placeholder="A987654321B" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="officeAddress" render={({ field }) => (
              <FormItem><FormLabel>Office Address</FormLabel><FormControl><Input placeholder="Mombasa, Kenya" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="bankName" render={({ field }) => (
              <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="Equity Bank" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="bankAccountNumber" render={({ field }) => (
              <FormItem><FormLabel>Bank Account Number</FormLabel><FormControl><Input placeholder="0123456789" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="buyerPersonnelName" render={({ field }) => (
              <FormItem><FormLabel>Authorized Buyer Name</FormLabel><FormControl><Input placeholder="Sarah Ochieng" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="buyerPersonnelPhone" render={({ field }) => (
              <FormItem><FormLabel>Authorized Buyer Phone</FormLabel><FormControl><Input placeholder="+254 722 345 678" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="buyerPersonnelEmail" render={({ field }) => (
              <FormItem><FormLabel>Authorized Buyer Email</FormLabel><FormControl><Input placeholder="buyer@exporter.co.ke" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="purchasingLimitUsd" render={({ field }) => (
              <FormItem><FormLabel>Purchasing Limit (USD)</FormLabel><FormControl><Input placeholder="50000" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </>
        )}

        {tier === "ENABLER" && (
          <>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required</div>
            <FormField control={form.control} name="operatorName" render={({ field }) => (
              <FormItem><FormLabel>Operator Company Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="AgriBora Certified Silos" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="wrscLicenseNumber" render={({ field }) => (
              <FormItem><FormLabel>WRSC Licence Number <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="WRSC-2024-001" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Optional</div>
            <FormField control={form.control} name="capacityMt" render={({ field }) => (
              <FormItem><FormLabel>Capacity (MT)</FormLabel><FormControl><Input placeholder="10,000" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="warehouseInChargeName" render={({ field }) => (
              <FormItem><FormLabel>Warehouse In-Charge Name</FormLabel><FormControl><Input placeholder="Peter Mwangi" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="warehouseInChargePhone" render={({ field }) => (
              <FormItem><FormLabel>Warehouse In-Charge Phone</FormLabel><FormControl><Input placeholder="+254 733 456 789" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="warehouseInChargeEmail" render={({ field }) => (
              <FormItem><FormLabel>Warehouse In-Charge Email</FormLabel><FormControl><Input placeholder="manager@agribora.co.ke" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="insurerName" render={({ field }) => (
              <FormItem><FormLabel>Insurer Name</FormLabel><FormControl><Input placeholder="Jubilee Insurance" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="insurancePolicyNumber" render={({ field }) => (
              <FormItem><FormLabel>Insurance Policy Number</FormLabel><FormControl><Input placeholder="POL-2024-ABC" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </>
        )}

        {tier === "FINANCIER" && (
          <>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required</div>
            <FormField control={form.control} name="institutionName" render={({ field }) => (
              <FormItem><FormLabel>Financial Institution Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="Equity Bank Kenya" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="centralBankLicenseCode" render={({ field }) => (
              <FormItem><FormLabel>Central Bank Licence Code <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="CBK-001" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Optional</div>
            <FormField control={form.control} name="departmentDesignation" render={({ field }) => (
              <FormItem><FormLabel>Department Designation</FormLabel><FormControl><Input placeholder="Agribusiness Trade Finance" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="creditApproverName" render={({ field }) => (
              <FormItem><FormLabel>Credit Approver Name</FormLabel><FormControl><Input placeholder="James Otieno" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="creditApproverEmail" render={({ field }) => (
              <FormItem><FormLabel>Credit Approver Email</FormLabel><FormControl><Input placeholder="approver@equity.co.ke" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="maxLiquidityPoolUsd" render={({ field }) => (
              <FormItem><FormLabel>Max Liquidity Pool (USD)</FormLabel><FormControl><Input placeholder="1,000,000" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </>
        )}

        {tier === "COOPERATIVE" && (
          <>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required</div>
            <FormField control={form.control} name="entityName" render={({ field }) => (
              <FormItem><FormLabel>Cooperative Entity Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="Nyeri Coffee Farmers Co-op Ltd" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="registrationNumber" render={({ field }) => (
              <FormItem><FormLabel>Registration / Incorporation Number <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="C123456" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Optional</div>
            <FormField control={form.control} name="licenceNumber" render={({ field }) => (
              <FormItem><FormLabel>Licence Number</FormLabel><FormControl><Input placeholder="LIC-2024-001" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="kraPin" render={({ field }) => (
              <FormItem><FormLabel>KRA PIN</FormLabel><FormControl><Input placeholder="A123456789B" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="officeAddress" render={({ field }) => (
              <FormItem><FormLabel>Office Address</FormLabel><FormControl><Input placeholder="Nyeri County, Kenya" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="adminFirstName" render={({ field }) => (
              <FormItem><FormLabel>Admin First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="adminLastName" render={({ field }) => (
              <FormItem><FormLabel>Admin Last Name</FormLabel><FormControl><Input placeholder="Kamau" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="adminPhone" render={({ field }) => (
              <FormItem><FormLabel>Admin Phone</FormLabel><FormControl><Input placeholder="+254 712 345 678" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="adminEmail" render={({ field }) => (
              <FormItem><FormLabel>Admin Email</FormLabel><FormControl><Input placeholder="admin@coop.co.ke" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="bankName" render={({ field }) => (
              <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="Co-operative Bank" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="bankBranch" render={({ field }) => (
              <FormItem><FormLabel>Bank Branch</FormLabel><FormControl><Input placeholder="Nyeri Branch" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="bankAccountNumber" render={({ field }) => (
              <FormItem><FormLabel>Bank Account Number</FormLabel><FormControl><Input placeholder="0123456789" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="mobileMoneyPaybill" render={({ field }) => (
              <FormItem><FormLabel>Mobile Money Paybill</FormLabel><FormControl><Input placeholder="522522" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </>
        )}

        <div className="pt-2">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : "Submit Compliance Profile"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Profile() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [kybOpen, setKybOpen] = useState(false);
  const [editIdentity, setEditIdentity] = useState(false);
  const [editSocial, setEditSocial] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const u = user as any;

  const identityForm = useForm<z.infer<typeof identitySchema>>({
    resolver: zodResolver(identitySchema),
    defaultValues: { name: "", company: "", phone: "", nationalId: "" },
  });

  const socialForm = useForm<z.infer<typeof socialProfileSchema>>({
    resolver: zodResolver(socialProfileSchema),
    defaultValues: {
      socialBio: "",
      websiteUrl: "",
      linkedinUrl: "",
      instagramUrl: "",
      xUrl: "",
    },
  });

  useEffect(() => {
    if (!u) return;
    identityForm.reset({
      name: u.name ?? "",
      company: u.company ?? "",
      phone: u.phone ?? "",
      nationalId: u.nationalId ?? "",
    });
  }, [u?.id]);

  useEffect(() => {
    if (!u) return;
    socialForm.reset({
      socialBio: u.socialBio ?? "",
      websiteUrl: u.websiteUrl ?? "",
      linkedinUrl: u.linkedinUrl ?? "",
      instagramUrl: u.instagramUrl ?? "",
      xUrl: u.xUrl ?? "",
    });
  }, [u?.id]);

  useEffect(() => {
    if (!user) return;
    customFetch("/api/profiles/me")
      .then((r) => (r as Response).json())
      .then((data) => {
        setProfile(data);
        setProfileLoading(false);
      })
      .catch(() => setProfileLoading(false));
  }, [user]);

  async function handleIdentitySubmit(values: z.infer<typeof identitySchema>) {
    setSavingIdentity(true);
    try {
      const res = await customFetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }) as Response;
      const data = await res.json();
      queryClient.setQueryData(getGetMeQueryKey(), data);
      toast({ title: "Details updated", description: "Your account details have been saved." });
      setEditIdentity(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSavingIdentity(false);
    }
  }

  async function handleSocialSubmit(values: z.infer<typeof socialProfileSchema>) {
    setSavingSocial(true);
    try {
      const res = await customFetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }) as Response;
      const data = await res.json();
      queryClient.setQueryData(getGetMeQueryKey(), data);
      toast({ title: "Social profile updated", description: "Your public profile details have been saved." });
      setEditSocial(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSavingSocial(false);
    }
  }

  const isLoading = userLoading || profileLoading;
  const tierProfile = profile?.tierProfile;

  function handleKybSuccess() {
    setKybOpen(false);
    setProfileLoading(true);
    if (!user) return;
    customFetch("/api/profiles/me")
      .then((r) => (r as Response).json())
      .then((data) => { setProfile(data); setProfileLoading(false); })
      .catch(() => setProfileLoading(false));
  }

  if (isLoading) {
    return (
      <Layout>
        <Skeleton className="h-96 max-w-3xl mx-auto" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 market-profile-page">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary" />
                General Identity
              </CardTitle>
              {!editIdentity ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2.5 gap-1.5"
                  onClick={() => setEditIdentity(true)}
                >
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2.5 gap-1.5 text-muted-foreground"
                  onClick={() => {
                    identityForm.reset({
                      name: u?.name ?? "",
                      company: u?.company ?? "",
                      phone: u?.phone ?? "",
                      nationalId: u?.nationalId ?? "",
                    });
                    setEditIdentity(false);
                  }}
                >
                  <X className="w-3 h-3" /> Cancel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editIdentity ? (
              <Form {...identityForm}>
                <form onSubmit={identityForm.handleSubmit(handleIdentitySubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={identityForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="e.g. Jane Kamau" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div>
                      <p className="text-sm font-medium leading-none mb-2">Email</p>
                      <p className="text-sm text-muted-foreground py-2">{u?.email}</p>
                    </div>
                    <FormField control={identityForm.control} name="company" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company / Entity Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="e.g. Nyeri Coffee Co-op" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div>
                      <p className="text-sm font-medium leading-none mb-2">Role</p>
                      <p className="text-sm text-muted-foreground py-2">{u?.tier} <span className="text-xs">(cannot be changed)</span></p>
                    </div>
                    <FormField control={identityForm.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="+254 712 345 678" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={identityForm.control} name="nationalId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entity ID / Registration No. <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="12345678" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button type="submit" size="sm" disabled={savingIdentity} className="gap-1.5">
                      {savingIdentity ? "Saving..." : "Save changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        identityForm.reset({
                          name: u?.name ?? "",
                          company: u?.company ?? "",
                          phone: u?.phone ?? "",
                          nationalId: u?.nationalId ?? "",
                        });
                        setEditIdentity(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium text-lg">{u?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-lg">{u?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium text-lg">{u?.company || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium text-lg">{u?.tier}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium text-lg">{u?.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entity ID / Registration No.</p>
                  <p className="font-medium text-lg">{u?.nationalId || "N/A"}</p>
                </div>
              </div>
            )}

            {/* Always-visible read-only fields */}
            <div className={`grid grid-cols-2 gap-y-4 gap-x-6 ${editIdentity ? "pt-2 border-t" : ""}`}>
              <div>
                <p className="text-sm text-muted-foreground">Reputation Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${
                    (user?.reputationScore ?? 0) >= 80 ? "bg-green-500" :
                    (user?.reputationScore ?? 0) >= 60 ? "bg-slate-500" : "bg-red-500"
                  }`} />
                  <p className="font-medium text-lg">{user?.reputationScore}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KYB Status</p>
                <p className="font-medium text-lg">{user?.kybStatus}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {(u?.tier === "PRODUCER" || u?.tier === "OFF_TAKER") && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Share2 className="w-4 h-4 text-primary" />
                  Social Profile
                </CardTitle>
                {!editSocial ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2.5 gap-1.5"
                    onClick={() => setEditSocial(true)}
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2.5 gap-1.5 text-muted-foreground"
                    onClick={() => {
                      socialForm.reset({
                        socialBio: u?.socialBio ?? "",
                        websiteUrl: u?.websiteUrl ?? "",
                        linkedinUrl: u?.linkedinUrl ?? "",
                        instagramUrl: u?.instagramUrl ?? "",
                        xUrl: u?.xUrl ?? "",
                      });
                      setEditSocial(false);
                    }}
                  >
                    <X className="w-3 h-3" /> Cancel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editSocial ? (
                <Form {...socialForm}>
                  <form onSubmit={socialForm.handleSubmit(handleSocialSubmit)} className="space-y-4">
                    <FormField control={socialForm.control} name="socialBio" render={({ field }) => (
                      <FormItem>
                        <FormLabel>About you</FormLabel>
                        <FormControl>
                          <Textarea rows={4} placeholder="Tell buyers and partners a little about your work..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={socialForm.control} name="websiteUrl" render={({ field }) => (
                        <FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://yourbusiness.com" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={socialForm.control} name="linkedinUrl" render={({ field }) => (
                        <FormItem><FormLabel>LinkedIn</FormLabel><FormControl><Input placeholder="https://linkedin.com/company/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={socialForm.control} name="instagramUrl" render={({ field }) => (
                        <FormItem><FormLabel>Instagram</FormLabel><FormControl><Input placeholder="https://instagram.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={socialForm.control} name="xUrl" render={({ field }) => (
                        <FormItem><FormLabel>X / Twitter</FormLabel><FormControl><Input placeholder="https://x.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <Button type="submit" size="sm" disabled={savingSocial}>
                        {savingSocial ? "Saving..." : "Save social profile"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditSocial(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">{u?.socialBio || "Add a short introduction so buyers and partners can learn more about you."}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {[
                      ["Website", u?.websiteUrl],
                      ["LinkedIn", u?.linkedinUrl],
                      ["Instagram", u?.instagramUrl],
                      ["X / Twitter", u?.xUrl],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <p className="text-muted-foreground">{label}</p>
                        {value ? (
                          <a href={value as string} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-2 break-all">
                            {value as string}
                          </a>
                        ) : (
                          <p className="font-medium">N/A</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!tierProfile && u?.tier && u.tier !== "ADMIN" && (
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ClipboardList className="w-4 h-4 text-slate-500" />
                  Compliance Profile: Incomplete
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setKybOpen((v) => !v)}
                  className="text-xs"
                >
                  {kybOpen ? (
                    <><ChevronUp className="w-3 h-3 mr-1" />Hide form</>
                  ) : (
                    <><ChevronDown className="w-3 h-3 mr-1" />Complete now</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Your KYB compliance profile is required before you can place bids, list eWRs, or access financing. It will be reviewed within 1–2 business days.
              </p>
              {kybOpen && (
                <KybForm
                  tier={u.tier}
                  onSuccess={handleKybSuccess}
                />
              )}
            </CardContent>
          </Card>
        )}

        {tierProfile && u?.tier === "PRODUCER" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-primary" />
                  Compliance Profile · Producer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div><p className="text-sm text-muted-foreground">Entity Name</p><p className="font-medium">{tierProfile.entityName}</p></div>
                <div><p className="text-sm text-muted-foreground">Registration Number</p><p className="font-medium">{tierProfile.registrationNumber}</p></div>
                <div><p className="text-sm text-muted-foreground">KRA PIN</p><p className="font-medium">{tierProfile.kraPin || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Office Address</p><p className="font-medium">{tierProfile.officeAddress || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Admin Name</p><p className="font-medium">{tierProfile.adminFirstName} {tierProfile.adminLastName}</p></div>
                <div><p className="text-sm text-muted-foreground">Admin Phone</p><p className="font-medium">{tierProfile.adminPhone || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Admin Email</p><p className="font-medium">{tierProfile.adminEmail || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Name</p><p className="font-medium">{tierProfile.bankName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Account</p><p className="font-medium">{tierProfile.bankAccountNumber || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Factory Marks</p><p className="font-medium">{tierProfile.factoryMarks || "N/A"}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {tierProfile && u?.tier === "OFF_TAKER" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-primary" />
                  Compliance Profile · Buyer / Trader
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div><p className="text-sm text-muted-foreground">Company Legal Name</p><p className="font-medium">{tierProfile.companyLegalName}</p></div>
                <div><p className="text-sm text-muted-foreground">Registration Number</p><p className="font-medium">{tierProfile.registrationNumber}</p></div>
                <div><p className="text-sm text-muted-foreground">KRA PIN</p><p className="font-medium">{tierProfile.kraPin || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Office Address</p><p className="font-medium">{tierProfile.officeAddress || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Name</p><p className="font-medium">{tierProfile.bankName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Account</p><p className="font-medium">{tierProfile.bankAccountNumber || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Authorized Buyer</p><p className="font-medium">{tierProfile.buyerPersonnelName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Buyer Phone</p><p className="font-medium">{tierProfile.buyerPersonnelPhone || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Buyer Email</p><p className="font-medium">{tierProfile.buyerPersonnelEmail || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Purchasing Limit (USD)</p><p className="font-medium">{tierProfile.purchasingLimitUsd || "N/A"}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {tierProfile && u?.tier === "ENABLER" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-primary" />
                Warehouse Operator Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div><p className="text-sm text-muted-foreground">Operator Name</p><p className="font-medium">{tierProfile.operatorName}</p></div>
                <div><p className="text-sm text-muted-foreground">WRSC License</p><p className="font-medium">{tierProfile.wrscLicenseNumber}</p></div>
                <div><p className="text-sm text-muted-foreground">Capacity</p><p className="font-medium">{tierProfile.capacityMt || "N/A"} MT</p></div>
                <div><p className="text-sm text-muted-foreground">In-Charge Name</p><p className="font-medium">{tierProfile.warehouseInChargeName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">In-Charge Phone</p><p className="font-medium">{tierProfile.warehouseInChargePhone || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">In-Charge Email</p><p className="font-medium">{tierProfile.warehouseInChargeEmail || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Insurer</p><p className="font-medium">{tierProfile.insurerName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Policy Number</p><p className="font-medium">{tierProfile.insurancePolicyNumber || "N/A"}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {tierProfile && u?.tier === "FINANCIER" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-primary" />
                Financier Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div><p className="text-sm text-muted-foreground">Institution</p><p className="font-medium">{tierProfile.institutionName}</p></div>
                <div><p className="text-sm text-muted-foreground">Central Bank License</p><p className="font-medium">{tierProfile.centralBankLicenseCode}</p></div>
                <div><p className="text-sm text-muted-foreground">Department</p><p className="font-medium">{tierProfile.departmentDesignation || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Credit Approver</p><p className="font-medium">{tierProfile.creditApproverName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Approver Email</p><p className="font-medium">{tierProfile.creditApproverEmail || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Max Liquidity Pool</p><p className="font-medium">{tierProfile.maxLiquidityPoolUsd ? `$${tierProfile.maxLiquidityPoolUsd}` : "N/A"}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {tierProfile && u?.tier === "COOPERATIVE" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-primary" />
                Cooperative Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div><p className="text-sm text-muted-foreground">Entity Name</p><p className="font-medium">{tierProfile.entityName}</p></div>
                <div><p className="text-sm text-muted-foreground">Registration Number</p><p className="font-medium">{tierProfile.registrationNumber}</p></div>
                <div><p className="text-sm text-muted-foreground">Licence Number</p><p className="font-medium">{tierProfile.licenceNumber || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">KRA PIN</p><p className="font-medium">{tierProfile.kraPin || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Office Address</p><p className="font-medium">{tierProfile.officeAddress || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Admin Name</p><p className="font-medium">{tierProfile.adminFirstName} {tierProfile.adminLastName}</p></div>
                <div><p className="text-sm text-muted-foreground">Admin Phone</p><p className="font-medium">{tierProfile.adminPhone || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Admin Email</p><p className="font-medium">{tierProfile.adminEmail || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Name</p><p className="font-medium">{tierProfile.bankName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Account</p><p className="font-medium">{tierProfile.bankAccountNumber || "N/A"}</p></div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
