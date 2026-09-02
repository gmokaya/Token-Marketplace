import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CommoditySelect,
  COMMODITY_SUBTYPES,
  normalizeLegacyCommodity,
} from "./CommoditySelect";
import { CountrySelect } from "./CountrySelect";
import { PhoneNumberInput } from "./PhoneNumberInput";
import { VolumeSelect } from "./VolumeSelect";
import {
  COFFEE_ORIGIN_CATALOG,
  COFFEE_PROCESSING_TYPES,
} from "./coffee-origin";
import {
  TEA_GRADES,
  TEA_ORIGIN_CATALOG,
  TEA_PROCESSING_METHODS,
  TEA_TYPES,
  TEA_VARIETIES,
} from "./tea-origin";

type Market = "grain" | "coffee" | "tea";

const createOnboardingSchema = (market: Market) => {
  const commoditySelectionSchema = z
    .object({
      commodity: z.string(),
      subType: z.string().nullable(),
    })
    .superRefine((selection, ctx) => {
      const allowed = COMMODITY_SUBTYPES[selection.commodity];
      const marketOriginReplacesSubtype =
        (market === "coffee" && selection.commodity === "Coffee") ||
        (market === "tea" && selection.commodity === "Tea");
      if (allowed && !marketOriginReplacesSubtype && !selection.subType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subType"],
          message: `Select a ${selection.commodity} sub-type`,
        });
      } else if (
        allowed &&
        !marketOriginReplacesSubtype &&
        selection.subType &&
        !allowed.includes(selection.subType)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subType"],
          message: "Select a valid sub-type",
        });
      } else if (!allowed && selection.subType !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subType"],
          message: "This commodity does not use a sub-type",
        });
      }
    });

  return z
    .object({
      marketplaceRole: z.enum(["producer", "trader", "buyer"]),
      fullName: z.string().min(2, "Full name is required"),
      country: z.string().optional(),
      region: z.string().optional(),
      city: z.string().optional(),
      coffeeOriginCountry: z.string().optional(),
      coffeeOriginRegion: z.string().optional(),
      coffeeVariety: z.string().optional(),
      coffeeProcessingType: z.string().optional(),
      teaOriginCountry: z.string().optional(),
      teaOriginRegion: z.string().optional(),
      teaVariety: z.string().optional(),
      teaType: z.string().optional(),
      teaProcessingMethod: z.string().optional(),
      teaGrade: z.string().optional(),
      commoditySelections: z.array(commoditySelectionSchema).default([]),
      payoutMobileMoney: z.string().optional(),
      businessName: z.string().optional(),
      businessRegistrationNumber: z.string().optional(),
      entityType: z.string().optional(),
      expectedVolume: z.string().optional(),
      destinationCountry: z.string().optional(),
      interests: z.array(z.string()).default([]),
      producerStory: z.string().optional(),
    })
    .superRefine((data, ctx) => {
    const requireText = (field: keyof OnboardingData, message: string) => {
      const value = data[field];
      if (typeof value !== "string" || value.trim().length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
      }
    };

    requireText("payoutMobileMoney", "Mobile number is required");

    if (data.marketplaceRole === "producer") {
      requireText("country", "Country is required");
      requireText("region", "Region is required");
      requireText("city", "City is required");
      requireText("businessName", "Entity name is required");
      requireText(
        "businessRegistrationNumber",
        "Entity registration number is required",
      );
      requireText("entityType", "Entity type is required");
      if (!data.commoditySelections.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["commoditySelections"],
          message: "Select at least one commodity",
        });
      }
    }

      if (data.marketplaceRole === "trader") {
        requireText("businessName", "Entity name is required");
        requireText(
          "businessRegistrationNumber",
          "Entity registration number is required",
        );
        requireText("entityType", "Entity type is required");
        if (!data.commoditySelections.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["commoditySelections"],
            message: "Select at least one commodity",
          });
        }
      }

      if (data.marketplaceRole === "buyer") {
        requireText("businessName", "Entity name is required");
        requireText(
          "businessRegistrationNumber",
          "Entity registration number is required",
        );
        requireText("entityType", "Entity type is required");
        if (!data.commoditySelections.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["commoditySelections"],
            message: "Select at least one sourcing interest",
          });
        }
        requireText("expectedVolume", "Choose an expected volume");
        requireText("destinationCountry", "Choose a destination country");
      }

      if (market === "coffee") {
        if (
          !data.commoditySelections.some(
            (selection) => selection.commodity === "Coffee",
          )
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["commoditySelections"],
            message: "Select Coffee to continue",
          });
        }
        requireText("coffeeOriginCountry", "Country of origin is required");
        requireText("coffeeOriginRegion", "Region is required");
        requireText("coffeeVariety", "Variety is required");
        requireText(
          "coffeeProcessingType",
          "Processing type is required",
        );

        const origin = data.coffeeOriginCountry
          ? COFFEE_ORIGIN_CATALOG[data.coffeeOriginCountry]
          : undefined;
        if (data.coffeeOriginCountry && !origin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["coffeeOriginCountry"],
            message: "Select a valid country of origin",
          });
        }
        if (
          origin &&
          data.coffeeOriginRegion &&
          !origin.regions.includes(data.coffeeOriginRegion)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["coffeeOriginRegion"],
            message: "Select a valid region for this country",
          });
        }
        if (
          origin &&
          data.coffeeVariety &&
          !origin.varieties.includes(data.coffeeVariety)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["coffeeVariety"],
            message: "Select a valid variety for this country",
          });
        }
        if (
          data.coffeeProcessingType &&
          !COFFEE_PROCESSING_TYPES.includes(data.coffeeProcessingType)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["coffeeProcessingType"],
            message: "Select a valid processing type",
          });
        }
      }

      if (market === "tea") {
        if (
          !data.commoditySelections.some(
            (selection) => selection.commodity === "Tea",
          )
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["commoditySelections"],
            message: "Select Tea to continue",
          });
        }
        requireText("teaOriginCountry", "Country of origin is required");
        requireText("teaOriginRegion", "Region is required");
        requireText("teaVariety", "Tea variety is required");
        requireText("teaType", "Tea type is required");
        requireText("teaProcessingMethod", "Processing method is required");
        requireText("teaGrade", "Grade is required");

        const origin = data.teaOriginCountry
          ? TEA_ORIGIN_CATALOG[data.teaOriginCountry]
          : undefined;
        if (data.teaOriginCountry && !origin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["teaOriginCountry"],
            message: "Select a valid country of origin",
          });
        }
        if (
          origin &&
          data.teaOriginRegion &&
          !origin.regions.includes(data.teaOriginRegion)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["teaOriginRegion"],
            message: "Select a valid region for this country",
          });
        }
        if (
          data.teaVariety &&
          !TEA_VARIETIES.includes(data.teaVariety)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["teaVariety"],
            message: "Select a valid tea variety",
          });
        }
        if (data.teaType && !TEA_TYPES.includes(data.teaType)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["teaType"],
            message: "Select a valid tea type",
          });
        }
        if (
          data.teaProcessingMethod &&
          !TEA_PROCESSING_METHODS.includes(data.teaProcessingMethod)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["teaProcessingMethod"],
            message: "Select a valid processing method",
          });
        }
        if (data.teaGrade && !TEA_GRADES.includes(data.teaGrade)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["teaGrade"],
            message: "Select a valid grade",
          });
        }
      }
    });
};

type OnboardingData = z.infer<ReturnType<typeof createOnboardingSchema>>;

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

const ENTITY_TYPES = [
  ["individual", "Individual"],
  ["sole_proprietorship", "Sole proprietorship"],
  ["partnership", "Partnership"],
  ["limited_company", "Limited company"],
  ["cooperative", "Cooperative"],
  ["ngo_nonprofit", "NGO / Non-profit"],
  ["other", "Other"],
] as const;

type OnboardingWizardProps = {
  marketName?: string;
  market?: Market;
};

const stepLabels = ["About you", "Your market", "Your entity", "Your priorities"];

export default function OnboardingWizard({
  marketName = "TokenHarvest",
  market = "grain",
}: OnboardingWizardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isCoffeeMarket = market === "coffee";
  const onboardingSchema = createOnboardingSchema(market);

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      marketplaceRole: "producer",
      fullName: "",
      country: "",
      region: "",
      city: "",
      coffeeOriginCountry: "",
      coffeeOriginRegion: "",
      coffeeVariety: "",
      coffeeProcessingType: "",
      teaOriginCountry: "",
      teaOriginRegion: "",
      teaVariety: "",
      teaType: "",
      teaProcessingMethod: "",
      teaGrade: "",
      commoditySelections: [],
      payoutMobileMoney: "",
      businessName: "",
      businessRegistrationNumber: "",
      entityType: "",
      expectedVolume: "",
      destinationCountry: "",
      interests: [],
      producerStory: "",
    },
    mode: "onChange",
  });

  const currentRole = form.watch("marketplaceRole");
  const isTeaMarket = market === "tea";
  const coffeeOriginCountry = form.watch("coffeeOriginCountry");
  const coffeeOriginRegion = form.watch("coffeeOriginRegion");
  const selectedCoffeeOrigin = coffeeOriginCountry
    ? COFFEE_ORIGIN_CATALOG[coffeeOriginCountry]
    : undefined;
  const coffeeRegions = selectedCoffeeOrigin?.regions ?? [];
  const coffeeVarieties = selectedCoffeeOrigin?.varieties ?? [];
  const teaOriginCountry = form.watch("teaOriginCountry");
  const selectedTeaOrigin = teaOriginCountry
    ? TEA_ORIGIN_CATALOG[teaOriginCountry]
    : undefined;
  const teaRegions = selectedTeaOrigin?.regions ?? [];

  useEffect(() => {
    async function loadData() {
      const initialRole = localStorage.getItem("onboardingRole") || "producer";
      try {
        const serverData = await customFetch<any>("/api/onboarding/me");
        const localValue = localStorage.getItem("onboarding-draft");
        const localData = localValue ? JSON.parse(localValue) : null;
        const merged: any = {
          marketplaceRole: initialRole,
          ...serverData,
          ...localData,
        };

        if (
          merged.commodities &&
          (!merged.commoditySelections || !merged.commoditySelections.length)
        ) {
          merged.commoditySelections = merged.commodities.map(
            normalizeLegacyCommodity,
          );
        }
        if (
          merged.sourcingCommodity &&
          (!merged.commoditySelections || !merged.commoditySelections.length)
        ) {
          merged.commoditySelections = [
            normalizeLegacyCommodity(merged.sourcingCommodity),
          ];
        }
        form.reset(merged);
      } catch {
        const localValue = localStorage.getItem("onboarding-draft");
        const localData: any = localValue ? JSON.parse(localValue) : null;
        if (localData) {
          if (
            localData.commodities &&
            (!localData.commoditySelections ||
              !localData.commoditySelections.length)
          ) {
            localData.commoditySelections = localData.commodities.map(
              normalizeLegacyCommodity,
            );
          }
          if (
            localData.sourcingCommodity &&
            (!localData.commoditySelections ||
              !localData.commoditySelections.length)
          ) {
            localData.commoditySelections = [
              normalizeLegacyCommodity(localData.sourcingCommodity),
            ];
          }
          form.reset({
            ...localData,
            marketplaceRole: localData.marketplaceRole || initialRole,
          });
        } else {
          form.setValue(
            "marketplaceRole",
            initialRole as OnboardingData["marketplaceRole"],
          );
        }
      } finally {
        setIsLoading(false);
      }
    }
    void loadData();
  }, [form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem("onboarding-draft", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const nextStep = async () => {
    if (isAdvancing || currentStep >= 4) return;
    setIsAdvancing(true);
    let fieldsToValidate: string[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ["fullName"];
      if (currentRole === "producer") {
        fieldsToValidate.push("country", "region", "city");
      } else {
        fieldsToValidate.push("country", "city");
      }
    } else if (currentStep === 2) {
      fieldsToValidate = ["commoditySelections"];
      if (currentRole === "buyer") {
        fieldsToValidate.push("expectedVolume", "destinationCountry");
      }
    } else if (currentStep === 3) {
      fieldsToValidate = [
        "businessName",
        "businessRegistrationNumber",
        "entityType",
        "payoutMobileMoney",
      ];
    }
    if (isCoffeeMarket) {
      fieldsToValidate.push(
        "coffeeOriginCountry",
        "coffeeOriginRegion",
        "coffeeVariety",
        "coffeeProcessingType",
      );
    }
    if (isTeaMarket) {
      fieldsToValidate.push(
        "teaOriginCountry",
        "teaOriginRegion",
        "teaVariety",
        "teaType",
        "teaProcessingMethod",
        "teaGrade",
      );
    }

    try {
      if (await form.trigger(fieldsToValidate as Array<keyof OnboardingData>)) {
        setCurrentStep((step) => Math.min(4, step + 1));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const prevStep = () => {
    setCurrentStep((step) => Math.max(1, step - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: OnboardingData) => {
    if (currentStep < 4) {
      await nextStep();
      return;
    }

    setIsSubmitting(true);
    try {
       await customFetch("/api/onboarding/me", {
        method: "PUT",
         body: JSON.stringify({ ...data, market }),
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

  const toggleInterest = (interest: string) => {
    const current = form.getValues("interests") || [];
    form.setValue(
      "interests",
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
      { shouldDirty: true },
    );
  };

  const renderInterestChips = (
    items: ReadonlyArray<readonly [string, string]>,
  ) => {
    const selected = form.watch("interests") || [];
    return (
      <div className="onboarding-interest-chips">
        {items.map(([label, value]) => {
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggleInterest(value)}
              className={cn(
                "onboarding-interest-chip",
                isSelected && "is-selected",
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

  if (isLoading) {
    return (
      <div className="onboarding-loading">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const totalSteps = stepLabels.length;
  const progress = Math.round((currentStep / totalSteps) * 100);
  const question =
    currentStep === 1
      ? {
          title: "Tell us about yourself",
          description: "Share your role and the details that describe you.",
        }
      : currentStep === 2
        ? currentRole === "producer"
          ? {
              title: "Tell us more about your production",
              description:
                "Choose what you produce and the details that describe your harvest.",
            }
          : {
              title: "What is relevant to your work?",
              description: "Choose the products and details that fit.",
            }
        : currentStep === 3
          ? {
              title: "Tell us about your entity",
              description: "Add your entity details and mobile number.",
            }
          : currentRole === "producer"
            ? {
                title: "What would help your farm thrive?",
                description: "Select all that apply.",
              }
            : currentRole === "trader"
              ? {
                  title: "What would make trading easier?",
                  description: "Select the areas where we can help.",
                }
              : {
                  title: "What matters most in your sourcing program?",
                  description: "Select all that apply.",
                };

  const inputClass =
    "onboarding-line-input w-full px-1 py-3 text-[16px] text-[#202532] transition-all placeholder:text-[#a4a9b3] focus:outline-none";
  const labelClass =
    "block px-1 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c929f]";

  return (
    <div className="market-onboarding onboarding-workspace">
      <aside className="onboarding-rail" aria-label="Onboarding progress">
        <Link
          href="/"
          className="onboarding-rail-brand"
          aria-label="Return to TokenHarvest home"
        >
          TokenHarvest
        </Link>
        <div
          className="onboarding-progress-ring"
          role="progressbar"
          aria-label="Profile completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          style={{
            background: `conic-gradient(var(--onboarding-accent) ${progress}%, #eef0f5 ${progress}% 100%)`,
          }}
        >
          <strong>{progress}%</strong>
          <span>
            {currentStep} / {totalSteps}
          </span>
        </div>
        <nav className="onboarding-step-list">
          {stepLabels.map((label, index) => {
            const step = index + 1;
            const isComplete = step < currentStep;
            const isActive = step === currentStep;
            return (
              <button
                key={label}
                type="button"
                disabled={step > currentStep}
                className={cn(
                  "onboarding-step-item",
                  isActive && "is-active",
                  isComplete && "is-complete",
                )}
                onClick={() => step < currentStep && setCurrentStep(step)}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="onboarding-step-icon">
                  {isComplete ? "✓" : step}
                </span>
                <span>{label}</span>
                <span className="onboarding-step-count">{step}</span>
              </button>
            );
          })}
        </nav>
        <div className="onboarding-rail-bottom">
          <div className="onboarding-secure-note">
            <span aria-hidden="true">✓</span> Saved
          </div>
        </div>
      </aside>

      <section className="onboarding-question-pane">
        <div className="onboarding-topbar">
          <p>
            Joining <strong>{marketName}</strong>
          </p>
        </div>
        <div className="onboarding-mobile-progress">
          <span>
            Step {currentStep} of {totalSteps}
          </span>
          <div>
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="onboarding-question-form"
          >
            <div className="onboarding-question-content animate-in fade-in slide-in-from-right-4 duration-500">
              <p className="onboarding-question-kicker">
                Step {currentStep} of {totalSteps}
              </p>
              <h1>{question.title}</h1>
              <p className="onboarding-question-description">
                {question.description}
              </p>

              <div className="onboarding-fields">
                {currentStep === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="marketplaceRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>
                            Role
                          </FormLabel>
                          <div className="onboarding-role-options">
                            {(["producer", "trader", "buyer"] as const).map(
                              (role) => (
                                <button
                                  key={role}
                                  type="button"
                                  aria-pressed={field.value === role}
                                  onClick={() => field.onChange(role)}
                                  className={cn(
                                    "onboarding-pill-option",
                                    field.value === role && "is-selected",
                                  )}
                                  data-testid={`select-role-${role}`}
                                >
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </button>
                              ),
                            )}
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
                          <FormLabel className={labelClass}>
                            Full name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className={inputClass}
                              placeholder="Jane Doe"
                              autoComplete="name"
                              data-testid="input-fullname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {currentRole === "producer" && (
                      <div className="onboarding-producer-location-grid">
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Country
                              </FormLabel>
                              <FormControl>
                                <CountrySelect
                                  value={field.value}
                                  onChange={field.onChange}
                                  ariaLabel="Country"
                                  placeholder="Select country"
                                  firstCountryCode="KE"
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
                              <FormLabel className={labelClass}>
                                Region
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className={inputClass}
                                  placeholder="e.g. Rift Valley"
                                  data-testid="input-region"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                City
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className={inputClass}
                                  placeholder="e.g. Nairobi"
                                  data-testid="input-city"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    {(currentRole === "trader" || currentRole === "buyer") && (
                      <div className="onboarding-producer-location-grid">
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Country
                              </FormLabel>
                              <FormControl>
                                <CountrySelect
                                  value={field.value}
                                  onChange={field.onChange}
                                  ariaLabel="Country"
                                  placeholder={
                                    currentRole === "buyer" ? "USA" : "Uganda"
                                  }
                                  firstCountryCode={
                                    currentRole === "buyer" ? "US" : "UG"
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                City
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className={inputClass}
                                  placeholder={
                                    currentRole === "buyer"
                                      ? "New York"
                                      : "Kampala"
                                  }
                                  data-testid="input-city"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="commoditySelections"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>
                            {currentRole === "producer"
                              ? "What do you produce?"
                              : currentRole === "buyer"
                                ? "What are you sourcing?"
                                : "What do you trade?"}
                          </FormLabel>
                          <FormControl>
                            <CommoditySelect
                              value={field.value}
                              onChange={field.onChange}
                              coffeeOnly={isCoffeeMarket}
                              teaOnly={isTeaMarket}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {isCoffeeMarket && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="coffeeOriginCountry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Coffee country of origin
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  form.setValue("coffeeOriginRegion", "");
                                  form.setValue("coffeeVariety", "");
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className="onboarding-select-trigger"
                                    data-testid="select-coffee-origin-country"
                                  >
                                    <SelectValue placeholder="Select country of origin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.keys(COFFEE_ORIGIN_CATALOG).map(
                                    (country) => (
                                      <SelectItem key={country} value={country}>
                                        {country}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coffeeOriginRegion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Coffee region
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  form.setValue("coffeeVariety", "");
                                }}
                                disabled={!coffeeOriginCountry}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className="onboarding-select-trigger"
                                    data-testid="select-coffee-origin-region"
                                  >
                                    <SelectValue placeholder="Select region" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {coffeeRegions.map((region) => (
                                    <SelectItem key={region} value={region}>
                                      {region}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coffeeVariety"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Coffee variety
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={!coffeeOriginCountry}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className="onboarding-select-trigger"
                                    data-testid="select-coffee-variety"
                                  >
                                    <SelectValue placeholder="Select variety" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {coffeeVarieties.map((variety) => (
                                    <SelectItem key={variety} value={variety}>
                                      {variety}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="coffeeProcessingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Coffee processing type
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className="onboarding-select-trigger"
                                    data-testid="select-coffee-processing-type"
                                  >
                                    <SelectValue placeholder="Select processing type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {COFFEE_PROCESSING_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    {isTeaMarket && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="teaOriginCountry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Tea country of origin
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  form.setValue("teaOriginRegion", "");
                                  form.setValue("teaVariety", "");
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className="onboarding-select-trigger"
                                    data-testid="select-tea-origin-country"
                                  >
                                    <SelectValue placeholder="Select country of origin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.keys(TEA_ORIGIN_CATALOG).map(
                                    (country) => (
                                      <SelectItem key={country} value={country}>
                                        {country}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="teaOriginRegion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Tea region
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={!teaOriginCountry}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className="onboarding-select-trigger"
                                    data-testid="select-tea-origin-region"
                                  >
                                    <SelectValue placeholder="Select region" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {teaRegions.map((region) => (
                                    <SelectItem key={region} value={region}>
                                      {region}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="teaVariety"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Tea variety
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={!teaOriginRegion}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className="onboarding-select-trigger"
                                    data-testid="select-tea-variety"
                                  >
                                    <SelectValue placeholder="Select tea variety" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TEA_VARIETIES.map((variety) => (
                                    <SelectItem key={variety} value={variety}>
                                      {variety}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="teaType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Tea type
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={!teaVariety}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className="onboarding-select-trigger"
                                    data-testid="select-tea-type"
                                  >
                                    <SelectValue placeholder="Select tea type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TEA_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="teaProcessingMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Processing method
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={!teaType}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className="onboarding-select-trigger"
                                    data-testid="select-tea-processing-method"
                                  >
                                    <SelectValue placeholder="Select processing method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TEA_PROCESSING_METHODS.map((method) => (
                                    <SelectItem key={method} value={method}>
                                      {method}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="teaGrade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Grade
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={!teaProcessingMethod}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className="onboarding-select-trigger"
                                    data-testid="select-tea-grade"
                                  >
                                    <SelectValue placeholder="Select grade" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TEA_GRADES.map((grade) => (
                                    <SelectItem key={grade} value={grade}>
                                      {grade}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    {currentRole === "buyer" && (
                      <>
                        <FormField
                          control={form.control}
                          name="expectedVolume"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>
                                Annual volume requirement
                              </FormLabel>
                              <FormControl>
                                <VolumeSelect
                                  value={field.value}
                                  onChange={field.onChange}
                                />
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
                              <FormLabel className={labelClass}>
                                Destination country
                              </FormLabel>
                              <FormControl>
                                <CountrySelect
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </>
                )}

                {currentStep === 3 && (
                  <>
                    <FormField
                      control={form.control}
                      name="payoutMobileMoney"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>
                            Mobile number
                          </FormLabel>
                          <FormControl>
                            <PhoneNumberInput
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>
                            Entity name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className={inputClass}
                              autoComplete="organization"
                              data-testid="input-entity-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessRegistrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>
                            Entity registration number
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className={inputClass}
                              data-testid="input-entity-registration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="entityType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>
                            Entity type
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="onboarding-select-trigger"
                                data-testid="select-entity-type"
                              >
                                <SelectValue placeholder="Select entity type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ENTITY_TYPES.map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {currentStep === 4 && (
                  <>
                    {currentRole === "producer" && (
                      <FormField
                        control={form.control}
                        name="producerStory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>
                              Tell us about your farm{" "}
                              <span className="normal-case tracking-normal">
                                (optional)
                              </span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="onboarding-story-input"
                                placeholder="Your practices, history, or community impact..."
                                data-testid="textarea-story"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {currentRole === "producer" && (
                      <div className="onboarding-interest-group">
                        <div className={labelClass}>
                          What would help you most right now?
                        </div>
                        {renderInterestChips(INTERESTS.producer)}
                      </div>
                    )}
                    {currentRole === "trader" && (
                      <div className="onboarding-interest-group">
                        <div className={labelClass}>
                          Choose your primary focus
                        </div>
                        {renderInterestChips(INTERESTS.trader)}
                      </div>
                    )}
                    {currentRole === "buyer" && (
                      <div className="onboarding-interest-group space-y-8">
                        <div>
                          <div className={labelClass}>
                            Values &amp; impact priorities
                          </div>
                          {renderInterestChips(INTERESTS.buyerValues)}
                        </div>
                        <div>
                          <div className={labelClass}>
                            Commercial requirements
                          </div>
                          {renderInterestChips(INTERESTS.buyerCommercial)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="onboarding-question-nav">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={prevStep}
                  className="onboarding-previous"
                  data-testid="button-prev"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Button>
              ) : (
                <span />
              )}
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    void nextStep();
                  }}
                  disabled={isAdvancing}
                  className="onboarding-next"
                  data-testid="button-next"
                >
                  {isAdvancing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}{" "}
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="onboarding-next"
                  data-testid="button-submit"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}{" "}
                  Complete profile
                </Button>
              )}
            </div>
          </form>
        </Form>
        <div className="onboarding-bottom-hint">
          <span>Saved</span>
        </div>
      </section>
    </div>
  );
}
