import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUpdateMe, UserUpdateTier } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

const onboardingSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  company: z.string().min(2, {
    message: "Company name must be at least 2 characters.",
  }),
  tier: z.nativeEnum(UserUpdateTier),
});

export function Onboarding() {
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      company: "",
      tier: UserUpdateTier.PRODUCER,
    },
  });

  function onSubmit(values: z.infer<typeof onboardingSchema>) {
    updateMe.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetMeQueryKey(), data);
        },
      }
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded-lg shadow-sm bg-card">
      <h2 className="text-2xl font-bold mb-6">Complete your profile</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} data-testid="input-name" />
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
                  <Input placeholder="Acme Agribusiness" {...field} data-testid="input-company" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-tier">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={UserUpdateTier.PRODUCER}>Producer</SelectItem>
                    <SelectItem value={UserUpdateTier.OFF_TAKER}>Off-Taker</SelectItem>
                    <SelectItem value={UserUpdateTier.ENABLER}>Enabler</SelectItem>
                    <SelectItem value={UserUpdateTier.FINANCIER}>Financier</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  This determines your access level on the marketplace.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={updateMe.isPending} data-testid="button-submit-onboarding">
            {updateMe.isPending ? "Saving..." : "Continue to Dashboard"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
