import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { CountrySelect } from "./CountrySelect";
import { VolumeSelect } from "./VolumeSelect";
import { COMMODITY_SUBTYPES, CommoditySelect, normalizeLegacyCommodity } from "./CommoditySelect";

const commoditySelectionSchema = z.object({
  commodity: z.string(),
  subType: z.string().nullable(),
}).superRefine((selection, ctx) => {
  const allowed = COMMODITY_SUBTYPES[selection.commodity];
  if (allowed && !selection.subType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subType"], message: `Select a ${selection.commodity} sub-type` });
  } else if (allowed && selection.subType && !allowed.includes(selection.subType)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subType"], message: "Select a valid sub-type" });
  } else if (!allowed && selection.subType !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subType"], message: "This commodity does not use a sub-type" });
  }
});

const onboardingSchema = z.object({
  marketplaceRole: z.enum(["producer", "trader", "buyer"]),
  fullName: z.string().min(2, "Full name is required"),
  region: z.string().optional(),
  commoditySelections: z.array(commoditySelectionSchema).default([]),
  
  // Optional / Role-specific
  payoutMobileMoney: z.string().optional(),
  businessName: z.string().optional(),
  businessRegistrationNumber: z.string().optional(),
  bankDetails: z.string().optional(),
  expectedVolume: z.string().optional(),
  destinationCountry: z.string().optional(),
  interests: z.array(z.string()).default([]),
  producerStory: z.string().optional(),
}).superRefine((data, ctx) => {
  const requireText = (field: keyof OnboardingData, message: string) => {
    const value = data[field];
    if (typeof value !== "string" || value.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
    }
  };

  if (data.marketplaceRole === "producer") {
    requireText("region", "Region or county is required");
    requireText("payoutMobileMoney", "Mobile money number is required");
    if (!data.commoditySelections.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["commoditySelections"], message: "Select at least one commodity" });
    }
  }
  if (data.marketplaceRole === "trader") {
    requireText("businessName", "Business name is required");
    requireText("businessRegistrationNumber", "Registration number is required");
    requireText("bankDetails", "Bank details are required");
    if (!data.commoditySelections.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["commoditySelections"], message: "Select at least one commodity" });
    }
  }
  if (data.marketplaceRole === "buyer") {
    requireText("businessName", "Company name is required");
    requireText("businessRegistrationNumber", "Registration number is required");
    if (!data.commoditySelections.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["commoditySelections"], message: "Sourcing interest is required" });
    }
    requireText("expectedVolume", "Expected volume is required");
    requireText("destinationCountry", "Destination country is required");
  }
});

type OnboardingData = z.infer<typeof onboardingSchema>;

const INTERESTS = {
  producer: [
    ["Access to markets", "access_to_markets"],
    ["Better prices", "better_prices"],
    ["Reducing post-harvest losses", "reduce_post_harvest_losses"],
    ["Better quality storage", "quality_storage"],
    ["Access to financing", "access_to_finance"],
    ["Faster payments", "faster_payments"],
  ],
  trader: [
    ["Finding more buyers", "find_buyers"],
    ["Freeing up capital tied in stock", "free_up_capital"],
    ["Getting paid faster", "faster_payment"],
    ["Access to trade financing", "access_to_financing"],
    ["Simplifying logistics", "simplify_logistics"],
  ],
  buyerValues: [
    ["Fair trade practices", "fair_trade"],
    ["Traceable sourcing", "traceable_sourcing"],
    ["Social & environmental impact", "impact"],
    ["Direct trade with producers", "direct_trade"],
    ["Producer welfare", "producer_welfare"],
  ],
  buyerCommercial: [
    ["Trade financing", "trade_financing"],
    ["Secure payments", "secure_payments"],
    ["Reliable logistics", "reliable_logistics"],
    ["Insurance coverage", "insurance"],
    ["Access to verified producers", "access_to_producers"],
    ["Verified quality", "verified_quality"],
    ["Consistent supply", "consistent_supply"],
    ["GI-certified / origin-specific products", "gi_certification"],
    ["Overall quality assurance", "quality_assurance"],
  ],
} as const;

type OnboardingWizardProps = {
  marketName?: string;
  commodities?: string[]; // No longer used, but kept for interface compatibility
};

export default function OnboardingWizard({
  marketName = "TokenHarvest",
}: OnboardingWizardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      marketplaceRole: "producer",
      fullName: "",
      region: "",
      commoditySelections: [],
      payoutMobileMoney: "",
      businessName: "",
      businessRegistrationNumber: "",
      bankDetails: "",
      expectedVolume: "",
      destinationCountry: "",
      interests: [],
      producerStory: "",
    },
    mode: "onChange",
  });

  const currentRole = form.watch("marketplaceRole");

  useEffect(() => {
    async function loadData() {
      try {
        const serverData = await customFetch<any>("/api/onboarding/me");
        const localData = localStorage.getItem("onboarding-draft");
        const parsedLocal = localData ? JSON.parse(localData) : null;
        const initialRole = localStorage.getItem("onboardingRole") || "producer";

        const merged = {
          marketplaceRole: initialRole,
          ...serverData,
          ...parsedLocal,
        };

        // Migrate old flat arrays to structured selections
        if (merged.commodities && (!merged.commoditySelections || merged.commoditySelections.length === 0)) {
          merged.commoditySelections = merged.commodities.map(normalizeLegacyCommodity);
        }
        if (merged.sourcingCommodity && (!merged.commoditySelections || merged.commoditySelections.length === 0)) {
          merged.commoditySelections = [normalizeLegacyCommodity(merged.sourcingCommodity)];
        }
        
        form.reset(merged);
      } catch (err) {
        const localData = localStorage.getItem("onboarding-draft");
        const parsedLocal = localData ? JSON.parse(localData) : null;
        const initialRole = localStorage.getItem("onboardingRole") || "producer";
        
        if (parsedLocal) {
          if (parsedLocal.commodities && (!parsedLocal.commoditySelections || parsedLocal.commoditySelections.length === 0)) {
            parsedLocal.commoditySelections = parsedLocal.commodities.map(normalizeLegacyCommodity);
          }
          if (parsedLocal.sourcingCommodity && (!parsedLocal.commoditySelections || parsedLocal.commoditySelections.length === 0)) {
            parsedLocal.commoditySelections = [normalizeLegacyCommodity(parsedLocal.sourcingCommodity)];
          }
          form.reset({ ...parsedLocal, marketplaceRole: parsedLocal.marketplaceRole || initialRole });
        } else {
          form.setValue("marketplaceRole", initialRole as "producer" | "trader" | "buyer");
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem("onboarding-draft", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const nextStep = async () => {
    if (isAdvancing || currentStep >= 3) return;
    setIsAdvancing(true);
    let fieldsToValidate: any[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ["fullName"];
      if (currentRole === "producer") fieldsToValidate.push("region");
    }
    if (currentStep === 2) {
      if (currentRole === "producer") fieldsToValidate = ["commoditySelections", "payoutMobileMoney"];
      if (currentRole === "trader") fieldsToValidate = ["businessName", "businessRegistrationNumber", "commoditySelections", "bankDetails"];
      if (currentRole === "buyer") fieldsToValidate = ["businessName", "businessRegistrationNumber", "commoditySelections", "expectedVolume", "destinationCountry"];
    }
    
    try {
      const isValid = await form.trigger(fieldsToValidate);
      if (isValid) {
        setCurrentStep((step) => Math.min(3, step + 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const prevStep = () => {
    setCurrentStep(s => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (data: OnboardingData) => {
    if (currentStep < 3) {
      await nextStep();
      return;
    }

    setIsSubmitting(true);
    try {
      await customFetch("/api/onboarding/me", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      localStorage.removeItem("onboarding-draft");
      localStorage.removeItem("onboardingRole");
      await queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/onboarding/me"] });
      
      toast({
        title: `Welcome to ${marketName}!`,
        description: "Your profile has been created successfully.",
      });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({
        title: "Something went wrong",
        description: err.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-10">
      {[1, 2, 3].map((step) => (
        <div 
          key={step} 
          className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
            step <= currentStep ? "bg-[#606A5C]" : "bg-[#e5e5ea]"
          }`} 
        />
      ))}
    </div>
  );

  const toggleInterest = (interest: string) => {
    const current = form.getValues("interests") || [];
    form.setValue(
      "interests",
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest],
      { shouldDirty: true },
    );
  };

  const renderInterestChips = (items: ReadonlyArray<readonly [string, string]>) => {
    const selected = form.watch("interests") || [];
    return (
      <div className="flex flex-wrap gap-2.5">
        {items.map(([label, value]) => {
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggleInterest(value)}
              className={cn(
                "inline-flex items-center justify-center px-4 py-2.5 rounded-full text-[14px] font-medium transition-all duration-200 cursor-pointer border",
                isSelected
                  ? "bg-[#606A5C] border-[#606A5C] text-white shadow-sm"
                  : "bg-[#f5f5f7] border-[#e5e5ea] text-[#1d1d1f] hover:bg-[#e5e5ea]"
              )}
              data-testid={`chip-interest-${value}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  const appleInput = "flex w-full rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] px-4 py-3 text-[15px] text-[#1d1d1f] transition-all placeholder:text-[#86868b] focus:bg-white focus:border-[#606A5C] focus:outline-none focus:ring-1 focus:ring-[#606A5C]/20 shadow-none";
  const appleLabel = "block text-[13px] font-medium text-[#86868b] px-1 mb-2";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#86868b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif] w-full mx-auto text-[#1d1d1f] max-w-[480px]">
      {renderStepIndicator()}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* STEP 1: Basic Profile */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] mb-2">Create your profile</h2>
                <p className="text-[15px] leading-relaxed text-[#86868b]">Tell us a bit about yourself so we can personalize your experience.</p>
              </div>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="marketplaceRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={appleLabel}>I am joining as a</FormLabel>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {(["producer", "trader", "buyer"] as const).map((role) => {
                          const isSelected = field.value === role;
                          return (
                            <button
                              type="button"
                              key={role}
                              onClick={() => field.onChange(role)}
                              className={cn(
                                "inline-flex items-center justify-center px-5 py-3 rounded-full text-[14px] font-medium transition-all duration-200 cursor-pointer border",
                                isSelected 
                                  ? "bg-[#606A5C] border-[#606A5C] text-white shadow-sm" 
                                  : "bg-[#f5f5f7] border-[#e5e5ea] text-[#1d1d1f] hover:bg-[#e5e5ea]"
                              )}
                              data-testid={`select-role-${role}`}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage className="px-1 text-red-500 text-[13px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={appleLabel}>Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className={appleInput} 
                          placeholder="Jane Doe"
                          data-testid="input-fullname"
                        />
                      </FormControl>
                      <FormMessage className="px-1 text-red-500 text-[13px]" />
                    </FormItem>
                  )}
                />

                {currentRole === "producer" && (
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={appleLabel}>Region or county</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className={appleInput} 
                            placeholder="e.g. Rift Valley, Kenya"
                            data-testid="input-region"
                          />
                        </FormControl>
                        <FormMessage className="px-1 text-red-500 text-[13px]" />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Business & Operations */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] mb-2">Business operations</h2>
                <p className="text-[15px] leading-relaxed text-[#86868b]">
                  {currentRole === "producer" && "Tell us what you grow and where payments should reach you."}
                  {currentRole === "trader" && "Tell us about your trading business."}
                  {currentRole === "buyer" && "Tell us about your sourcing needs."}
                </p>
              </div>

              <div className="space-y-6">
                {(currentRole === "producer" || currentRole === "trader" || currentRole === "buyer") && (
                  <FormField
                    control={form.control}
                    name="commoditySelections"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={appleLabel}>
                          {currentRole === "producer" ? "What do you produce?" : currentRole === "buyer" ? "What are you sourcing?" : "What do you trade?"}
                        </FormLabel>
                        <FormControl>
                          <CommoditySelect value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage className="px-1 text-red-500 text-[13px]" />
                      </FormItem>
                    )}
                  />
                )}

                {currentRole === "producer" && (
                  <FormField control={form.control} name="payoutMobileMoney" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={appleLabel}>Mobile money number</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="tel" autoComplete="tel" className={appleInput} placeholder="+254 712 345 678" data-testid="input-mobile-money" />
                      </FormControl>
                      <FormMessage className="px-1 text-red-500 text-[13px]" />
                    </FormItem>
                  )} />
                )}

                {(currentRole === "trader" || currentRole === "buyer") && (
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={appleLabel}>Company Name</FormLabel>
                        <FormControl>
                          <Input {...field} className={appleInput} data-testid="input-company-name" />
                        </FormControl>
                        <FormMessage className="px-1 text-red-500 text-[13px]" />
                      </FormItem>
                    )}
                  />
                )}

                {(currentRole === "trader" || currentRole === "buyer") && (
                  <FormField control={form.control} name="businessRegistrationNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={appleLabel}>Business registration number</FormLabel>
                      <FormControl>
                        <Input {...field} className={appleInput} data-testid="input-registration" />
                      </FormControl>
                      <FormMessage className="px-1 text-red-500 text-[13px]" />
                    </FormItem>
                  )} />
                )}

                {currentRole === "trader" && (
                  <FormField control={form.control} name="bankDetails" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={appleLabel}>Bank details for escrow payouts</FormLabel>
                      <FormControl>
                        <Textarea {...field} className={cn(appleInput, "min-h-[100px] resize-none")} placeholder="Bank name and account details" data-testid="textarea-bank" />
                      </FormControl>
                      <FormMessage className="px-1 text-red-500 text-[13px]" />
                    </FormItem>
                  )} />
                )}

                {currentRole === "buyer" && (
                  <>
                    <FormField
                      control={form.control}
                      name="expectedVolume"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={appleLabel}>Annual Volume Requirement</FormLabel>
                          <FormControl>
                            <VolumeSelect value={field.value} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage className="px-1 text-red-500 text-[13px]" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="destinationCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={appleLabel}>Destination Country</FormLabel>
                          <FormControl>
                            <CountrySelect value={field.value} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage className="px-1 text-red-500 text-[13px]" />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Details & Financials */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] mb-2">Final details</h2>
                <p className="text-[15px] leading-relaxed text-[#86868b]">
                  Select as many as apply. This helps us tailor the platform for your needs.
                </p>
              </div>

              <div className="space-y-8">
                {currentRole === "producer" && (
                  <>
                    <FormField
                      control={form.control}
                      name="producerStory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={appleLabel}>Your Farm's Story (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              className={cn(appleInput, "min-h-[120px] resize-none")} 
                              placeholder="Tell buyers about your practices, history, or community impact..."
                              data-testid="textarea-story"
                            />
                          </FormControl>
                          <FormMessage className="px-1 text-red-500 text-[13px]" />
                        </FormItem>
                      )}
                    />
                    <div>
                      <div className={appleLabel}>What would help you most right now?</div>
                      {renderInterestChips(INTERESTS.producer)}
                    </div>
                  </>
                )}

                {currentRole === "trader" && (
                  <div>
                    <div className={appleLabel}>What's your primary focus?</div>
                    {renderInterestChips(INTERESTS.trader)}
                  </div>
                )}

                {currentRole === "buyer" && (
                  <div className="space-y-8">
                    <div>
                      <div className={appleLabel}>Values & Impact Priorities</div>
                      {renderInterestChips(INTERESTS.buyerValues)}
                    </div>
                    <div>
                      <div className={appleLabel}>Commercial Requirements</div>
                      {renderInterestChips(INTERESTS.buyerCommercial)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-8 mt-4 flex items-center justify-between border-t border-[#e5e5ea]">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={prevStep}
                className="h-12 px-6 rounded-xl text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] text-[15px] font-medium transition-colors"
                data-testid="button-prev"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <Button
                key={`continue-step-${currentStep}`}
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  void nextStep();
                }}
                disabled={isAdvancing}
                className="h-12 px-8 rounded-xl bg-[#606A5C] hover:bg-[#4A5340] text-white text-[15px] font-medium shadow-none transition-all active:scale-[0.98]"
                data-testid="button-next"
              >
                {isAdvancing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                key="submit-profile"
                type="submit"
                disabled={isSubmitting}
                className="h-12 px-8 rounded-xl bg-[#606A5C] hover:bg-[#4A5340] text-white text-[15px] font-medium shadow-none transition-all active:scale-[0.98]"
                data-testid="button-submit"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Complete Profile
              </Button>
            )}
          </div>

        </form>
      </Form>
    </div>
  );
}
