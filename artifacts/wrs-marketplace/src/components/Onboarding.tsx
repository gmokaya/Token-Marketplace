import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUpdateMe, UserUpdateTier, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Sprout, ShoppingBag, Warehouse, Landmark, Users, Check,
  CheckCircle2, Clock, ArrowRight, Info,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const userSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  company: z.string().min(2, "Company / entity name is required"),
  phone: z.string().min(8, "A valid phone number is required"),
  nationalId: z.string().min(4, "National ID or passport number is required"),
  tier: z.nativeEnum(UserUpdateTier),
});

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
  adminNationalId: z.string().optional(),
  adminPhone: z.string().optional(),
  adminEmail: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankSwiftCode: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  mobileMoneyPaybill: z.string().optional(),
});

type Step = "tier" | "user" | "profile" | "done";

const STEP_LABELS = ["Role", "Details", "Compliance", "Done"];
const STEP_KEYS: Step[] = ["tier", "user", "profile", "done"];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEP_KEYS.indexOf(current);
  return (
    <div className="flex items-center justify-center mb-8">
      {STEP_LABELS.map((label, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${done ? "bg-primary text-white" : active ? "bg-primary text-white ring-4 ring-primary/20" : "bg-gray-100 text-gray-400"}`}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[11px] mt-1 font-medium ${active ? "text-primary" : done ? "text-primary/60" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`w-10 h-0.5 mb-5 mx-1 transition-colors ${i < idx ? "bg-primary" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const ROLE_META: Record<UserUpdateTier, {
  label: string;
  subtitle: string;
  icon: React.ElementType;
  needs: string[];
}> = {
  [UserUpdateTier.PRODUCER]: {
    label: "Producer",
    subtitle: "Cooperatives, factories & farmers",
    icon: Sprout,
    needs: ["Registration / incorporation number", "KRA PIN", "Bank account details"],
  },
  [UserUpdateTier.OFF_TAKER]: {
    label: "Off-Taker",
    subtitle: "Exporters, millers & commodity buyers",
    icon: ShoppingBag,
    needs: ["Company registration number", "KRA PIN", "Authorized buyer details"],
  },
  [UserUpdateTier.ENABLER]: {
    label: "Warehouse Operator",
    subtitle: "Licensed warehouses: issue & secure eWRs",
    icon: Warehouse,
    needs: ["WRSC licence number", "Insurance policy details", "Facility capacity"],
  },
  [UserUpdateTier.FINANCIER]: {
    label: "Financier",
    subtitle: "Banks & lenders providing trade finance",
    icon: Landmark,
    needs: ["Central Bank licence code", "Credit approver name & email", "Liquidity pool limit (optional)"],
  },
  [UserUpdateTier.COOPERATIVE]: {
    label: "Cooperative",
    subtitle: "Agricultural cooperatives & farmer groups",
    icon: Users,
    needs: ["Co-op registration number", "KRA PIN", "Bank account details"],
  },
  [UserUpdateTier.ADMIN]: {
    label: "Exchange Administrator",
    subtitle: "Platform oversight",
    icon: Check,
    needs: [],
  },
};

export function Onboarding() {
  const [step, setStep] = useState<Step>("tier");
  const [tier, setTier] = useState<UserUpdateTier | null>(null);
  const [userData, setUserData] = useState<z.infer<typeof userSchema> | null>(null);
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const adminSchema = z.object({});
  const profileSchemas: Record<UserUpdateTier, z.ZodTypeAny> = {
    [UserUpdateTier.PRODUCER]: producerSchema,
    [UserUpdateTier.OFF_TAKER]: buyerSchema,
    [UserUpdateTier.ENABLER]: warehouseSchema,
    [UserUpdateTier.FINANCIER]: financierSchema,
    [UserUpdateTier.COOPERATIVE]: cooperativeSchema,
    [UserUpdateTier.ADMIN]: adminSchema,
  };

  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", company: "", phone: "", nationalId: "", tier: UserUpdateTier.PRODUCER },
  });

  const profileForm = useForm<any>({
    resolver: zodResolver(tier ? profileSchemas[tier] : producerSchema),
    defaultValues: {},
  });

  async function handleUserSubmit(values: z.infer<typeof userSchema>) {
    setIsSubmitting(true);
    try {
      const result = await updateMe.mutateAsync({
        data: { name: values.name, company: values.company, tier: values.tier },
      });
      queryClient.setQueryData(getGetMeQueryKey(), result);
      setUserData(values);
      setTier(values.tier);
      profileForm.reset();
      setStep("profile");
    } catch (err: any) {
      toast({
        title: "Could not save details",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSkip() {
    if (!userData) return;
    setIsSubmitting(true);
    try {
      await customFetch(`${basePath}/api/profiles/me`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: { phone: userData.phone, nationalId: userData.nationalId },
        }),
      });
    } catch {
      // Non-fatal: user can update contact details from profile page
    } finally {
      setIsSubmitting(false);
    }
    setSkipped(true);
    setStep("done");
    toast({ title: "You're in!", description: "Complete your compliance profile anytime from your Profile page." });
    const destination = userData.tier === "COOPERATIVE" ? "/coop" : "/dashboard";
    setTimeout(() => navigate(destination), 1400);
  }

  async function handleProfileSubmit(profileValues: any) {
    if (!userData) return;
    setIsSubmitting(true);
    try {
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
      toast({ title: "Profile submitted!", description: "Your compliance profile is now under KYB review." });
      setSkipped(false);
      setStep("done");
    } catch (err: any) {
      toast({ title: "Submission failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDoneNavigate() {
    const destination = userData?.tier === "COOPERATIVE" ? "/coop" : "/dashboard";
    navigate(destination);
  }

  if (step === "tier") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <span className="tokenharvest-wordmark text-3xl text-gray-900 inline-block mx-auto mb-6">
              TokenHarvest
            </span>
            <StepIndicator current="tier" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Choose your role</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Select the role that best describes how you'll use the marketplace.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(UserUpdateTier) as UserUpdateTier[])
              .filter((t) => t !== UserUpdateTier.ADMIN)
              .map((t) => {
                const { label, subtitle, icon: Icon, needs } = ROLE_META[t];
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setTier(t);
                      userForm.setValue("tier", t);
                      setStep("user");
                    }}
                    className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 hover:border-primary hover:shadow-md transition-all text-left bg-white group"
                  >
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/15 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{label}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 mb-2">{subtitle}</p>
                      <div className="space-y-0.5">
                        {needs.map((n) => (
                          <p key={n} className="text-[11px] text-gray-400 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                            {n}
                          </p>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary shrink-0 mt-1 ml-auto transition-colors" />
                  </button>
                );
              })}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => { window.location.href = basePath || "/"; }}
              className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors"
            >
              Back to home page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "user") {
    const selectedTier = userForm.getValues("tier") || tier;
    const meta = selectedTier ? ROLE_META[selectedTier] : null;
    const Icon = meta?.icon;
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <span className="tokenharvest-wordmark text-2xl text-gray-900 inline-block mx-auto mb-5">
              TokenHarvest
            </span>
            <StepIndicator current="user" />
            {meta && Icon && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary">{meta.label}</span>
              </div>
            )}
            <h1 className="text-2xl font-bold">Your details</h1>
            <p className="text-muted-foreground text-sm mt-1">These fields are required to create your account.</p>
          </div>

          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(handleUserSubmit)} className="space-y-4">
              <FormField control={userForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. Jane Kamau" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={userForm.control} name="company" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company / Entity Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. Nyeri Coffee Co-op" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={userForm.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="+254 712 345 678" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={userForm.control} name="nationalId" render={({ field }) => (
                <FormItem>
                  <FormLabel>National ID / Passport <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="12345678" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("tier")}>Back</Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Continue"}
                </Button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-xs text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors"
                >
                  Cancel and return to home page
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  if (step === "profile") {
    const tierName = tier ? ROLE_META[tier].label : "";
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <span className="tokenharvest-wordmark text-2xl text-gray-900 inline-block mx-auto mb-5">
              TokenHarvest
            </span>
            <StepIndicator current="profile" />
            <h1 className="text-2xl font-bold">{tierName} Compliance Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Required for KYB verification. You can also skip and complete this later.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-5 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <strong>Not ready yet?</strong> Skip this step to access your dashboard immediately. You can submit these details from your <strong>Profile</strong> page anytime. They're needed before you can trade.
            </p>
          </div>

          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
              {tier === UserUpdateTier.PRODUCER && (
                <>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Required</div>
                  <FormField control={profileForm.control} name="entityName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registered Entity Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Nyeri Coffee Farmers Co-op Ltd" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="registrationNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration / Incorporation Number <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="C123456" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Optional: complete later</div>
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
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Required</div>
                  <FormField control={profileForm.control} name="companyLegalName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Legal Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Mombasa Tea Exporters Ltd" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="registrationNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="C987654" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Optional: complete later</div>
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
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Required</div>
                  <FormField control={profileForm.control} name="operatorName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operator Company Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="AgriBora Certified Silos" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="wrscLicenseNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>WRSC Licence Number <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="WRSC-2024-001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Optional: complete later</div>
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
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Required</div>
                  <FormField control={profileForm.control} name="institutionName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Financial Institution Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Equity Bank Kenya" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="centralBankLicenseCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Central Bank Licence Code <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="CBK-001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Optional: complete later</div>
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

              {tier === UserUpdateTier.COOPERATIVE && (
                <>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Required</div>
                  <FormField control={profileForm.control} name="entityName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cooperative Entity Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Nyeri Coffee Farmers Co-op Ltd" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="registrationNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration / Incorporation Number <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="C123456" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Optional: complete later</div>
                  <FormField control={profileForm.control} name="licenceNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Licence Number</FormLabel>
                      <FormControl><Input placeholder="LIC-2024-001" {...field} /></FormControl>
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
                  <FormField control={profileForm.control} name="bankBranch" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Branch</FormLabel>
                      <FormControl><Input placeholder="Nyeri Branch" {...field} /></FormControl>
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
                  <FormField control={profileForm.control} name="mobileMoneyPaybill" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Money Paybill</FormLabel>
                      <FormControl><Input placeholder="522522" {...field} /></FormControl>
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
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={handleSkip}
                disabled={isSubmitting}
              >
                Skip for now. Complete later from Profile
              </Button>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <span className="tokenharvest-wordmark text-2xl text-gray-900 inline-block mx-auto mb-6">
          TokenHarvest
        </span>
        <StepIndicator current="done" />

        {skipped ? (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">You're in!</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Your account is ready. Complete your compliance profile from your Profile page to unlock full trading access.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-left mb-6">
              <p className="text-xs font-semibold text-amber-800 mb-2">What happens next</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-amber-700">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                  <span>Dashboard access: available now</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-amber-700">
                  <Clock className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                  <span>Full trading access: after KYB profile submission & review (1–2 days)</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Profile submitted!</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Your compliance profile is under KYB review. You'll get full access once it's approved.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-left mb-6">
              <p className="text-xs font-semibold text-gray-700 mb-2">What happens next</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                  <span>Submission received</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <Clock className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                  <span>KYB review: 1–2 business days</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <Clock className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                  <span>Dashboard & trading access unlocked</span>
                </div>
              </div>
            </div>
          </>
        )}

        <Button className="w-full" onClick={handleDoneNavigate}>
          Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
