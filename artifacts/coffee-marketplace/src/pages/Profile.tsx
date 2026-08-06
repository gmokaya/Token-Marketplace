import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { data: me, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      company: "",
    },
  });

  useEffect(() => {
    if (me) {
      form.reset({
        name: me.name || "",
        company: me.company || "",
      });
    }
  }, [me, form]);

  const onSubmit = (data: ProfileFormValues) => {
    updateMe.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Profile updated", description: "Your details have been saved successfully." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (error) => {
        toast({ title: "Error", description: error.error || "Failed to update profile", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full max-w-2xl" />;
  }

  if (!me) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
          <CardDescription>Update your display name and company association.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Acme Coffee Roasters" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button type="submit" disabled={updateMe.isPending}>
                  {updateMe.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
