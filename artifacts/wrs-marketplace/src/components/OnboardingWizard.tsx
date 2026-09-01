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

// Types and Schemas
const onboardingSchema = z.object({
  marketplaceRole: z.enum(["producer", "trader", "buyer"]),
  fullName: z.string().min(2, "Full name is required"),
  region: z.string().optional(),
  commodities: z.array(z.string()).default([]),
  
  // Optional / Role-specific
  payoutMobileMoney: z.string().optional(),
  businessName: z.string().optional(),
  businessRegistrationNumber: z.string().optional(),
  bankDetails: z.string().optional(),
  companyName: z.string().optional(),
  sourcingCommodity: z.string().optional(),
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
    if (!data.commodities.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["commodities"], message: "Select at least one commodity" });
    }
  }
  if (data.marketplaceRole === "trader") {
    requireText("businessName", "Business name is required");
    requireText("businessRegistrationNumber", "Registration number is required");
    requireText("bankDetails", "Bank details are required");
    if (!data.commodities.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["commodities"], message: "Select at least one commodity" });
    }
  }
  if (data.marketplaceRole === "buyer") {
    requireText("businessName", "Company name is required");
    requireText("businessRegistrationNumber", "Registration number is required");
    requireText("sourcingCommodity", "Sourcing interest is required");
    requireText("expectedVolume", "Expected volume is required");
    requireText("destinationCountry", "Destination country is required");
  }
});

type OnboardingData = z.infer<typeof onboardingSchema>;

const DEFAULT_COMMODITIES = ["Maize", "Soybeans", "Wheat", "Sorghum", "Beans", "Millet", "Rice", "Sunflower", "Sesame"];

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
  commodities?: string[];
};

export default function OnboardingWizard({
  marketName = "Grain Marketplace",
  commodities = DEFAULT_COMMODITIES,
}: OnboardingWizardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize form
  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      marketplaceRole: "producer",
      fullName: "",
      region: "",
      commodities: [],
      payoutMobileMoney: "",
      businessName: "",
      businessRegistrationNumber: "",
      bankDetails: "",
      companyName: "",
      sourcingCommodity: "",
      expectedVolume: "",
      destinationCountry: "",
      interests: [],
      producerStory: "",
    },
    mode: "onChange",
  });

  // Role watcher for conditional fields
  const currentRole = form.watch("marketplaceRole");

  // Load from API + LocalStorage
  useEffect(() => {
    async function loadData() {
      try {
        const serverData = await customFetch<any>("/api/onboarding/me");
        
        // Also check local storage for un-submitted changes
        const localData = localStorage.getItem("onboarding-draft");
        const parsedLocal = localData ? JSON.parse(localData) : null;
        
        const initialRole = localStorage.getItem("onboardingRole") || "producer";

        const merged = {
          marketplaceRole: initialRole,
          ...serverData,
          ...parsedLocal,
        };
        
        form.reset(merged);
      } catch (err) {
        // If 404, we just start fresh, maybe check local storage
        const localData = localStorage.getItem("onboarding-draft");
        const parsedLocal = localData ? JSON.parse(localData) : null;
        const initialRole = localStorage.getItem("onboardingRole") || "producer";
        if (parsedLocal) {
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

  // Auto-save to LocalStorage
  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem("onboarding-draft", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Navigation handlers
  const nextStep = async () => {
    if (isAdvancing || currentStep >= 3) return;
    setIsAdvancing(true);
    // Validate current step
    let fieldsToValidate: any[] = [];
    if (currentStep === 1) fieldsToValidate = ["fullName"];
    if (currentStep === 2) {
      if (currentRole === "producer") fieldsToValidate = ["region", "commodities", "payoutMobileMoney"];
      if (currentRole === "trader") fieldsToValidate = ["businessName", "businessRegistrationNumber", "commodities", "bankDetails"];
      if (currentRole === "buyer") fieldsToValidate = ["businessName", "businessRegistrationNumber", "sourcingCommodity", "expectedVolume", "destinationCountry"];
    }
    
    try {
      const isValid = await form.trigger(fieldsToValidate);
      if (isValid) {
        setCurrentStep((step) => Math.min(3, step + 1));
        window.scrollTo(0, 0);
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const prevStep = () => {
    setCurrentStep(s => Math.max(1, s - 1));
    window.scrollTo(0, 0);
  };

  const onSubmit = async (data: OnboardingData) => {
    // Pressing Enter in a field dispatches a form submit. Before the final
    // step, treat that exactly like Continue so no profile can be saved early.
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
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center gap-2 flex-1">
          <div 
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              step <= currentStep ? "bg-white" : "bg-white/20"
            }`} 
          />
        </div>
      ))}
      <span className="text-white/50 text-xs tracking-widest uppercase ml-2">Step {currentStep} of 3</span>
    </div>
  );

  const toggleCommodity = (commodity: string) => {
    const current = form.getValues("commodities") || [];
    if (current.includes(commodity)) {
      form.setValue("commodities", current.filter(c => c !== commodity), { shouldValidate: true });
    } else {
      form.setValue("commodities", [...current, commodity], { shouldValidate: true });
    }
  };

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
      <div className="flex flex-wrap gap-2">
        {items.map(([label, value]) => (
          <button
            key={value}
            type="button"
            aria-pressed={selected.includes(value)}
            onClick={() => toggleInterest(value)}
            className={`px-3 py-2 rounded-full text-sm border transition-colors ${
              selected.includes(value)
                ? "bg-white text-gray-900 border-white"
                : "bg-white/5 border-white/20 text-white/75 hover:bg-white/10"
            }`}
            data-testid={`chip-interest-${value}`}
          >
            {label}
          </button>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {renderStepIndicator()}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* STEP 1: Basic Profile */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Let's set up your profile</h2>
                <p className="text-white/60 text-sm">Tell us a bit about yourself so we can personalize your experience.</p>
              </div>

              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="marketplaceRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">I am joining as a</FormLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {(["producer", "trader", "buyer"] as const).map((role) => (
                          <button
                            type="button"
                            key={role}
                            onClick={() => field.onChange(role)}
                            className={`px-3 py-2.5 text-sm font-medium text-center border rounded cursor-pointer transition-colors ${
                              field.value === role 
                                ? "bg-white text-gray-900 border-white" 
                                : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                            }`}
                            data-testid={`select-role-${role}`}
                          >
                            {role[0].toUpperCase() + role.slice(1)}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12" 
                          placeholder="Jane Doe"
                          data-testid="input-fullname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                  <FormLabel className="text-white/80">Region or county</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12" 
                          placeholder="e.g. Rift Valley, Kenya"
                          data-testid="input-region"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Business & Operations */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Business operations</h2>
                <p className="text-white/60 text-sm">
                  {currentRole === "producer" && "Tell us what you grow and where payments should reach you."}
                  {currentRole === "trader" && "Tell us about your trading business."}
                  {currentRole === "buyer" && "Tell us about your sourcing needs."}
                </p>
              </div>

              <div className="space-y-5">
                {currentRole === "producer" && (
                  <>
                    <FormField
                      control={form.control}
                      name="commodities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">What do you produce?</FormLabel>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {commodities.map((c) => (
                              <button
                                type="button"
                                key={c}
                                onClick={() => toggleCommodity(c)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
                                  (field.value || []).includes(c)
                                    ? "bg-white text-gray-900 border-white"
                                    : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                                }`}
                                data-testid={`chip-commodity-${c.toLowerCase()}`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="payoutMobileMoney" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Mobile money number</FormLabel>
                        <FormControl>
                          <Input {...field} inputMode="tel" autoComplete="tel" className="bg-white/10 border-white/20 text-white h-12" placeholder="+254 712 345 678" data-testid="input-mobile-money" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                )}

                {(currentRole === "trader" || currentRole === "buyer") && (
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Company Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-white/10 border-white/20 text-white h-12" data-testid="input-company-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {currentRole === "trader" && (
                  <>
                    <FormField
                      control={form.control}
                      name="commodities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Commodities Traded</FormLabel>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {commodities.map((c) => (
                              <button
                                type="button"
                                key={c}
                                onClick={() => toggleCommodity(c)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
                                  (field.value || []).includes(c)
                                    ? "bg-white text-gray-900 border-white"
                                    : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                                }`}
                                data-testid={`chip-commodity-${c.toLowerCase()}`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="businessRegistrationNumber" render={({ field }) => (
                      <FormItem><FormLabel className="text-white/80">Business registration number</FormLabel><FormControl><Input {...field} className="bg-white/10 border-white/20 text-white h-12" data-testid="input-registration" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="bankDetails" render={({ field }) => (
                      <FormItem><FormLabel className="text-white/80">Bank details for escrow payouts</FormLabel><FormControl><Textarea {...field} className="bg-white/10 border-white/20 text-white min-h-[80px]" placeholder="Bank name and account details" data-testid="textarea-bank" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </>
                )}

                {currentRole === "buyer" && (
                  <>
                    <FormField
                      control={form.control}
                      name="businessRegistrationNumber"
                      render={({ field }) => (
                        <FormItem><FormLabel className="text-white/80">Business registration number</FormLabel><FormControl><Input {...field} className="bg-white/10 border-white/20 text-white h-12" data-testid="input-registration" /></FormControl><FormMessage /></FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sourcingCommodity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Primary Sourcing Commodity</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-white/10 border-white/20 text-white h-12" placeholder="e.g. Premium White Maize" data-testid="input-sourcing" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="expectedVolume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white/80">Annual Volume (MT)</FormLabel>
                            <FormControl>
                              <Input {...field} className="bg-white/10 border-white/20 text-white h-12" placeholder="e.g. 5000" data-testid="input-volume" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="destinationCountry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white/80">Destination</FormLabel>
                            <FormControl>
                              <Input {...field} className="bg-white/10 border-white/20 text-white h-12" placeholder="e.g. Kenya" data-testid="input-destination" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Details & Financials */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Final details</h2>
                <p className="text-white/60 text-sm">
                  Select as many as apply. This helps us build TokenHarvest around what actually matters to people like you.
                </p>
              </div>

              <div className="space-y-5">
                {currentRole === "producer" && (
                  <>
                    <FormField
                      control={form.control}
                      name="producerStory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Your Farm's Story (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              className="bg-white/10 border-white/20 text-white min-h-[100px] resize-none" 
                              placeholder="Tell buyers about your practices, history, or community impact..."
                              data-testid="textarea-story"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div><p className="text-sm font-medium text-white/80 mb-3">What would help you most right now?</p>{renderInterestChips(INTERESTS.producer)}</div>
                  </>
                )}

                {currentRole === "trader" && (
                  <div><p className="text-sm font-medium text-white/80 mb-3">What's on your mind these days?</p>{renderInterestChips(INTERESTS.trader)}</div>
                )}

                {currentRole === "buyer" && (
                  <>
                    <div><p className="text-xs uppercase tracking-widest text-white/50 mb-3">Values & Impact</p>{renderInterestChips(INTERESTS.buyerValues)}</div>
                    <div><p className="text-xs uppercase tracking-widest text-white/50 mb-3">Commercial Priorities</p>{renderInterestChips(INTERESTS.buyerCommercial)}</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-6 flex items-center justify-between border-t border-white/10">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={prevStep}
                className="text-white hover:bg-white/10 hover:text-white"
                data-testid="button-prev"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div /> // Spacer
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
                className="bg-white text-gray-900 hover:bg-white/90"
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
                className="bg-white text-gray-900 hover:bg-white/90"
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