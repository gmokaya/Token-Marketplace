import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Share2, ShieldAlert, X } from "lucide-react";

const socialProfileSchema = z.object({
  socialBio: z.string().max(500, "Keep your introduction under 500 characters").optional(),
  websiteUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  linkedinUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  instagramUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  xUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
});

type SocialProfileFormValues = z.infer<typeof socialProfileSchema>;

export default function Profile() {
  const { data: user } = useGetMe();
  const updateMe = useUpdateMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editSocial, setEditSocial] = useState(false);
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
    if (!user) return;
    socialForm.reset({
      socialBio: user.socialBio || "",
      websiteUrl: user.websiteUrl || "",
      linkedinUrl: user.linkedinUrl || "",
      instagramUrl: user.instagramUrl || "",
      xUrl: user.xUrl || "",
    });
  }, [user, socialForm]);

  if (!user) return null;

  const onSocialSubmit = (data: SocialProfileFormValues) => {
    updateMe.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Social profile updated", description: "Your public profile details have been saved." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setEditSocial(false);
      },
      onError: (error) => {
        toast({ title: "Update failed", description: error.error || "Failed to update social profile", variant: "destructive" });
      },
    });
  };

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Profile"
        description="Manage your account information and preferences."
      />
      
      <Card className="rounded-none shadow-sm border border-border">
        <CardHeader className="border-b bg-muted/5 p-6">
          <CardTitle className="text-xl font-bold">General Identity</CardTitle>
          <CardDescription>Name, contact and account identity details.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Name</div>
              <div className="font-medium text-lg">{user.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Email</div>
              <div className="font-medium text-lg">{user.email}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Company</div>
              <div className="font-medium text-lg">{user.company || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Role Tier</div>
              <Badge variant="outline" className="rounded-none px-3 py-1 text-xs tracking-wider">
                {user.tier}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Reputation Score</div>
              <div className="font-mono text-xl font-semibold">{user.reputationScore}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none shadow-sm border border-border">
        <CardHeader className="border-b bg-muted/5 p-6">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Compliance Profile
          </CardTitle>
          <CardDescription>Your verification status and marketplace access.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">KYB Status</div>
              <Badge 
                variant={user.kybStatus === 'VERIFIED' ? 'default' : 'secondary'} 
                className="rounded-none px-3 py-1 text-xs tracking-wider"
              >
                {user.kybStatus}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {(user.tier === "PRODUCER" || user.tier === "OFF_TAKER") && (
        <Card className="rounded-none shadow-sm border border-border">
          <CardHeader className="border-b bg-muted/5 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
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
                      socialBio: user.socialBio || "",
                      websiteUrl: user.websiteUrl || "",
                      linkedinUrl: user.linkedinUrl || "",
                      instagramUrl: user.instagramUrl || "",
                      xUrl: user.xUrl || "",
                    });
                    setEditSocial(false);
                  }}
                >
                  <X className="w-3 h-3" /> Cancel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-8">
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
                  {user.socialBio || "Add a short introduction so buyers and partners can learn more about you."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    ["Website", user.websiteUrl],
                    ["LinkedIn", user.linkedinUrl],
                    ["Instagram", user.instagramUrl],
                    ["X / Twitter", user.xUrl],
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