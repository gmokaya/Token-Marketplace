import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Shield, Share2, Pencil, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().optional(),
});

const socialProfileSchema = z.object({
  socialBio: z.string().max(500, "Keep your introduction under 500 characters").optional(),
  websiteUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  linkedinUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  instagramUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  xUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SocialProfileFormValues = z.infer<typeof socialProfileSchema>;

function getApiErrorMessage(error: { data?: unknown; message?: string }, fallback: string) {
  const data = error.data;
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return error.message || fallback;
}

export default function Profile() {
  const { data: me, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editIdentity, setEditIdentity] = useState(false);
  const [editSocial, setEditSocial] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      company: "",
    },
  });

  const socialForm = useForm<SocialProfileFormValues>({
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
    if (me) {
      form.reset({
        name: me.name || "",
        company: me.company || "",
      });
      socialForm.reset({
        socialBio: me.socialBio || "",
        websiteUrl: me.websiteUrl || "",
        linkedinUrl: me.linkedinUrl || "",
        instagramUrl: me.instagramUrl || "",
        xUrl: me.xUrl || "",
      });
    }
  }, [me, form, socialForm]);

  const onSubmit = (data: ProfileFormValues) => {
    updateMe.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Profile updated", description: "Your details have been saved successfully." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setEditIdentity(false);
      },
      onError: (error) => {
        toast({ title: "Error", description: getApiErrorMessage(error, "Failed to update profile"), variant: "destructive" });
      }
    });
  };

  const onSocialSubmit = (data: SocialProfileFormValues) => {
    updateMe.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Social profile updated", description: "Your public profile details have been saved." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setEditSocial(false);
      },
      onError: (error) => {
        toast({ title: "Error", description: getApiErrorMessage(error, "Failed to update social profile"), variant: "destructive" });
      },
    });
  };

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full max-w-2xl" />;
  }

  if (!me) return null;

  return (
    <div className="max-w-2xl space-y-6 market-profile-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account information and preferences.</p>
      </div>

      <Card className="market-profile-section market-profile-compliance">
        <CardHeader>
          <CardTitle>Compliance Profile</CardTitle>
          <CardDescription>Your current platform privileges and verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div className="space-y-1">
              <p className="text-sm font-medium">Platform Role</p>
              <p className="text-xs text-muted-foreground">Determines your available tools</p>
            </div>
            <Badge variant="outline" className="font-mono bg-background">{me.tier}</Badge>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div className="space-y-1">
              <p className="text-sm font-medium">KYB Verification</p>
              <p className="text-xs text-muted-foreground">Know Your Business status</p>
            </div>
            {me.kybStatus === "VERIFIED" ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified
              </Badge>
            ) : me.kybStatus === "PENDING" ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> Pending Review
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Rejected
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div className="space-y-1">
              <p className="text-sm font-medium">Reputation Score</p>
              <p className="text-xs text-muted-foreground">Based on successful settlements</p>
            </div>
            <div className="text-xl font-mono font-bold text-accent">{me.reputationScore}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="market-profile-section market-profile-identity">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                General Identity
              </CardTitle>
              <CardDescription>Contact and account identity details.</CardDescription>
            </div>
            {!editIdentity ? (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditIdentity(true)}>
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => {
                  form.reset({ name: me.name || "", company: me.company || "" });
                  setEditIdentity(false);
                }}
              >
                <X className="w-3 h-3" /> Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editIdentity ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <FormLabel>Email</FormLabel>
                    <p className="text-sm text-muted-foreground py-2">{me.email}</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl><Input {...field} placeholder="Acme Coffee Roasters" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <FormLabel>Role</FormLabel>
                    <p className="text-sm text-muted-foreground py-2">{me.tier}</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="submit" size="sm" disabled={updateMe.isPending}>
                    {updateMe.isPending ? "Saving..." : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.reset({ name: me.name || "", company: me.company || "" });
                      setEditIdentity(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="grid grid-cols-2 gap-y-5 gap-x-6">
              <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium text-lg">{me.name}</p></div>
              <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium text-lg">{me.email}</p></div>
              <div><p className="text-sm text-muted-foreground">Company</p><p className="font-medium text-lg">{me.company || "N/A"}</p></div>
              <div><p className="text-sm text-muted-foreground">Role</p><p className="font-medium text-lg">{me.tier}</p></div>
              <div><p className="text-sm text-muted-foreground">Reputation Score</p><p className="font-medium text-lg">{me.reputationScore}</p></div>
              <div><p className="text-sm text-muted-foreground">KYB Status</p><p className="font-medium text-lg">{me.kybStatus}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      {(me.tier === "PRODUCER" || me.tier === "OFF_TAKER") && (
        <Card className="market-profile-section market-profile-social">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-primary" />
                  Social Profile
                </CardTitle>
                <CardDescription>Help buyers and partners learn more about you.</CardDescription>
              </div>
              {!editSocial ? (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditSocial(true)}>
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => {
                    socialForm.reset({
                      socialBio: me.socialBio || "",
                      websiteUrl: me.websiteUrl || "",
                      linkedinUrl: me.linkedinUrl || "",
                      instagramUrl: me.instagramUrl || "",
                      xUrl: me.xUrl || "",
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
                <form onSubmit={socialForm.handleSubmit(onSocialSubmit)} className="space-y-4">
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
                  <Button type="submit" disabled={updateMe.isPending}>
                    {updateMe.isPending ? "Saving..." : "Save social profile"}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {me.socialBio || "Add a short introduction so buyers and partners can learn more about you."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    ["Website", me.websiteUrl],
                    ["LinkedIn", me.linkedinUrl],
                    ["Instagram", me.instagramUrl],
                    ["X / Twitter", me.xUrl],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      {value ? (
                        <a href={value as string} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline underline-offset-2 break-all">
                          {value as string}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">N/A</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
