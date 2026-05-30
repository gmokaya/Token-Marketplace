import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUpdateMe, UserUpdateTier } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().min(2, "Company name is required"),
  phone: z.string().min(8, "Valid phone number required"),
  nationalId: z.string().min(4, "National ID / Passport required"),
  tier: z.nativeEnum(UserUpdateTier),
});

const producerSchema = z.object({
  entityName: z.string().min(2),
  registrationNumber: z.string().min(4),
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
  companyLegalName: z.string().min(2),
  registrationNumber: z.string().min(4),
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
  operatorName: z.string().min(2),
  wrscLicenseNumber: z.string().min(4),
  capacityMt: z.string().optional(),
  warehouseInChargeName: z.string().optional(),
  warehouseInChargePhone: z.string().optional(),
  warehouseInChargeEmail: z.string().optional(),
  insurerName: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
});

const financierSchema = z.object({
  institutionName: z.string().min(2),
  centralBankLicenseCode: z.string().min(4),
  departmentDesignation: z.string().optional(),
  creditApproverName: z.string().optional(),
  creditApproverEmail: z.string().optional(),
  maxLiquidityPoolUsd: z.string().optional(),
});

type Step = "tier" | "user" | "profile" | "done";

export function Onboarding() {
  const [step, setStep] = useState<Step>("tier");
  const [tier, setTier] = useState<UserUpdateTier | null>(null);
  const [userData, setUserData] = useState<z.infer<typeof userSchema> | null>(null);
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", company: "", phone: "", nationalId: "", tier: UserUpdateTier.PRODUCER },
  });

  const profileSchemas: Record<UserUpdateTier, z.ZodTypeAny> = {
    [UserUpdateTier.PRODUCER]: producerSchema,
    [UserUpdateTier.OFF_TAKER]: buyerSchema,
    [UserUpdateTier.ENABLER]: warehouseSchema,
    [UserUpdateTier.FINANCIER]: financierSchema,
  };

  const profileForm = useForm<any>({
    resolver: zodResolver(tier ? profileSchemas[tier] : producerSchema),
    defaultValues: {},
  });

  const tierLabels: Record<UserUpdateTier, { label: string; desc: string }> = {
    [UserUpdateTier.PRODUCER]: { label: "Producer", desc: "Cooperatives, factories & farmers — list eWRs and run auctions" },
    [UserUpdateTier.OFF_TAKER]: { label: "Off-Taker", desc: "Exporters, millers & buyers — bid on auctions and co-sign forward contracts" },
    [UserUpdateTier.ENABLER]: { label: "Warehouse Operator", desc: "Licensed warehouses — issue, grade and secure eWR collateral" },
    [UserUpdateTier.FINANCIER]: { label: "Financier", desc: "Banks & lenders — provide warehouse financing and pre-sale advances" },
  };

  function handleUserSubmit(values: z.infer<typeof userSchema>) {
    setUserData(values);
    setTier(values.tier);
    setStep("profile");
    profileForm.reset();
  }

  async function handleProfileSubmit(profileValues: any) {
    if (!userData) return;
    setIsSubmitting(true);
    try {
      // 1. Update user (name, company, tier)
      await updateMe.mutateAsync({
        data: {
          name: userData.name,
          company: userData.company,
          tier: userData.tier,
        },
      });

      // 2. Submit profile
      const payload = {
        user: {
          name: userData.name,
          company: userData.company,
          phone: userData.phone,
          nationalId: userData.nationalId,
        },
        profile: profileValues,
      };

      const res = await customFetch(`${basePath}/api/profiles/me`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }) as Response;

      const data = await res.json() as { user: any; tierProfile: any };
      queryClient.setQueryData(getGetMeQueryKey(), data.user);
      toast({ title: "Profile submitted", description: "Your onboarding is now under KYB review." });
      setStep("done");
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (err: any) {
      const msg = err?.message || "Failed to submit profile. Please try again.";
      toast({ title: "Submission failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "tier") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <div className="text-center mb-10">
            <img src={`${basePath}/logo-dark.png`} alt="TokenHarvest" className="h-10 w-auto mx-auto mb-6" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Choose your role</h1>
            <p className="text-muted-foreground mt-2">This determines your marketplace access and compliance requirements</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {(Object.keys(UserUpdateTier) as UserUpdateTier[]).map((t) => {
              const { label, desc } = tierLabels[t];
              return (
                <button
                  key={t}
                  onClick={() => { setTier(t); userForm.setValue("tier", t); setStep("user"); }}
                  className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 hover:border-primary hover:shadow-md transition-all text-left bg-white"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-primary font-bold text-sm">{t[0]}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{label}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (step === "user") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img src={`${basePath}/logo-dark.png`} alt="TokenHarvest" className="h-9 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Your details</h1>
            <p className="text-muted-foreground text-sm mt-1">General identity for all tiers</p>
          </div>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(handleUserSubmit)} className="space-y-4">
              <FormField control={userForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={userForm.control} name="company" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company / Entity Name</FormLabel>
                  <FormControl><Input placeholder="Nyeri Coffee Co-op" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={userForm.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input placeholder="+254 712 345 678" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={userForm.control} name="nationalId" render={({ field }) => (
                <FormItem>
                  <FormLabel>National ID / Passport</FormLabel>
                  <FormControl><Input placeholder="12345678" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={userForm.control} name="tier" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input value={tierLabels[field.value as UserUpdateTier].label} disabled className="bg-muted" />
                  </FormControl>
                  <FormDescription>Role cannot be changed after submission</FormDescription>
                </FormItem>
              )} />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("tier")}>Back</Button>
                <Button type="submit" className="flex-1">Continue</Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  if (step === "profile") {
    const tierName = tier ? tierLabels[tier].label : "";
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img src={`${basePath}/logo-dark.png`} alt="TokenHarvest" className="h-9 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{tierName} Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">KYB verification details</p>
          </div>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
              {tier === UserUpdateTier.PRODUCER && (
                <>
                  <FormField control={profileForm.control} name="entityName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registered Entity Name</FormLabel>
                      <FormControl><Input placeholder="Nyeri Coffee Farmers Co-op Ltd" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="registrationNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration / Incorporation Number</FormLabel>
                      <FormControl><Input placeholder="C123456" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="kraPin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>KRA PIN</FormLabel>
                      <FormControl><Input placeholder="A123456789B" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="officeAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registered Office Address</FormLabel>
                      <FormControl><Input placeholder="Nyeri County, Kenya" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="adminFirstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin First Name</FormLabel>
                      <FormControl><Input placeholder="John" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="adminLastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Last Name</FormLabel>
                      <FormControl><Input placeholder="Kamau" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="adminPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Phone</FormLabel>
                      <FormControl><Input placeholder="+254 712 345 678" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="adminEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Email</FormLabel>
                      <FormControl><Input placeholder="admin@coop.co.ke" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="bankName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl><Input placeholder="Co-operative Bank" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="bankAccountNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account Number</FormLabel>
                      <FormControl><Input placeholder="0123456789" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}
              {tier === UserUpdateTier.OFF_TAKER && (
                <>
                  <FormField control={profileForm.control} name="companyLegalName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Legal Name</FormLabel>
                      <FormControl><Input placeholder="Mombasa Tea Exporters Ltd" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="registrationNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl><Input placeholder="C987654" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="kraPin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>KRA PIN</FormLabel>
                      <FormControl><Input placeholder="A987654321B" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="officeAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Address</FormLabel>
                      <FormControl><Input placeholder="Mombasa, Kenya" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="bankName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl><Input placeholder="Equity Bank" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="bankAccountNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account Number</FormLabel>
                      <FormControl><Input placeholder="0123456789" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="buyerPersonnelName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authorized Buyer Name</FormLabel>
                      <FormControl><Input placeholder="Sarah Ochieng" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="buyerPersonnelPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authorized Buyer Phone</FormLabel>
                      <FormControl><Input placeholder="+254 722 345 678" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="buyerPersonnelEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authorized Buyer Email</FormLabel>
                      <FormControl><Input placeholder="buyer@exporter.co.ke" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="purchasingLimitUsd" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchasing Limit (USD)</FormLabel>
                      <FormControl><Input placeholder="50000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}
              {tier === UserUpdateTier.ENABLER && (
                <>
                  <FormField control={profileForm.control} name="operatorName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operator Company Name</FormLabel>
                      <FormControl><Input placeholder="AgriBora Certified Silos" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="wrscLicenseNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>WRSC License Number</FormLabel>
                      <FormControl><Input placeholder="WRSC-2024-001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="capacityMt" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (Metric Tons)</FormLabel>
                      <FormControl><Input placeholder="10,000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="warehouseInChargeName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse In-Charge Name</FormLabel>
                      <FormControl><Input placeholder="Peter Mwangi" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="warehouseInChargePhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse In-Charge Phone</FormLabel>
                      <FormControl><Input placeholder="+254 733 456 789" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="warehouseInChargeEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse In-Charge Email</FormLabel>
                      <FormControl><Input placeholder="manager@agribora.co.ke" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="insurerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurer Name</FormLabel>
                      <FormControl><Input placeholder="Jubilee Insurance" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="insurancePolicyNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Policy Number</FormLabel>
                      <FormControl><Input placeholder="POL-2024-ABC" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}
              {tier === UserUpdateTier.FINANCIER && (
                <>
                  <FormField control={profileForm.control} name="institutionName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Financial Institution Name</FormLabel>
                      <FormControl><Input placeholder="Equity Bank Kenya" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="centralBankLicenseCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Central Bank License Code</FormLabel>
                      <FormControl><Input placeholder="CBK-001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="departmentDesignation" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department Designation</FormLabel>
                      <FormControl><Input placeholder="Agribusiness Trade Finance Division" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="creditApproverName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Approver Name</FormLabel>
                      <FormControl><Input placeholder="James Otieno" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="creditApproverEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Approver Email</FormLabel>
                      <FormControl><Input placeholder="approver@equity.co.ke" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="maxLiquidityPoolUsd" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Liquidity Pool (USD)</FormLabel>
                      <FormControl><Input placeholder="1,000,000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("user")}>Back</Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Profile"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                By submitting, you agree to our KYB verification process. Your profile will be reviewed before activation.
              </p>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="text-center">
        <img src={`${basePath}/logo-dark.png`} alt="TokenHarvest" className="h-9 w-auto mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">All set!</h1>
        <p className="text-muted-foreground">Your profile is under review. Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
