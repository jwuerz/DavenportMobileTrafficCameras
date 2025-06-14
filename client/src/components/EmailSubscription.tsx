import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Chrome, Info, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const subscriptionSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  notificationPreferences: z
    .array(z.string())
    .min(1, "Please select at least one notification preference"),
});

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

export default function EmailSubscription() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      email: "",
      phone: "",
      notificationPreferences: ["location_changes"],
    },
  });

  const notificationOptions = [
    { value: "location_changes", label: "Camera location changes" },
    { value: "new_cameras", label: "New camera installations" },
    { value: "schedule_changes", label: "Camera schedule changes" },
    { value: "push_notifications", label: "Browser push notifications" },
  ];

  const onSubmit = async (data: SubscriptionFormData) => {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/subscribe", data);

      // Try to register FCM token if user selected push notifications
      if (data.notificationPreferences.includes("push_notifications")) {
        try {
          const { notificationService } = await import(
            "@/lib/notificationService"
          );
          const result =
            await notificationService.requestPermissionAndGetToken();

          if (result.granted && result.token) {
            // Register FCM token with the user
            await apiRequest("POST", "/api/register-fcm", {
              email: data.email,
              fcmToken: result.token,
            });

            toast({
              title: "Subscription Successful!",
              description:
                "You will receive email and push notifications when camera locations change.",
            });
          } else {
            toast({
              title: "Subscription Created",
              description:
                "Email notifications enabled. Push notifications require browser permission.",
            });
          }
        } catch (fcmError) {
          console.log("FCM registration optional:", fcmError);
          toast({
            title: "Subscription Created",
            description:
              "Email notifications enabled. Push notification setup failed.",
          });
        }
      } else {
        toast({
          title: "Subscription Successful!",
          description:
            "You will receive email notifications when camera locations change.",
        });
      }

      form.reset();
    } catch (error) {
      toast({
        title: "Subscription Failed",
        description: "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const enableBrowserNotifications = async () => {
    const { notificationService } = await import("@/lib/notificationService");

    try {
      const result = await notificationService.requestPermissionAndGetToken();

      if (result.granted) {
        // Test the notification
        await notificationService.testNotification();

        toast({
          title: "Push Notifications Enabled",
          description:
            "You will receive push notifications for camera updates.",
        });
      } else {
        toast({
          title: "Notifications Blocked",
          description:
            result.error ||
            "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <section id="subscribe" className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Never Miss an Update
          </h3>
          <p className="text-gray-600 text-lg">
            Subscribe to get instant email notifications when camera locations
            change.
          </p>
        </div>

        <Card className="subscription-form">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center">
              Subscribe for Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    {...form.register("phone")}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium">
                  Email Notification Preferences
                </Label>
                <div className="space-y-3">
                  {notificationOptions
                    .filter((option) => option.value !== "push_notifications")
                    .map((option) => (
                      <div
                        key={option.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={option.value}
                          checked={form
                            .watch("notificationPreferences")
                            .includes(option.value)}
                          onCheckedChange={(checked) => {
                            const current = form.getValues(
                              "notificationPreferences",
                            );
                            if (checked) {
                              form.setValue("notificationPreferences", [
                                ...current,
                                option.value,
                              ]);
                            } else {
                              form.setValue(
                                "notificationPreferences",
                                current.filter((pref) => pref !== option.value),
                              );
                            }
                          }}
                        />
                        <Label htmlFor={option.value} className="text-sm">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                </div>

                {/* Push Notifications Switch */}
                <div className="border rounded-lg p-4 bg-blue-50/50 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="push-notifications"
                          className="text-sm font-medium"
                        >
                          Browser Push Notifications
                        </Label>
                        <p className="text-xs text-gray-600">
                          Get instant alerts even when the browser is closed on
                          select devices. Swipe to see if your device is
                          supported.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={form
                        .watch("notificationPreferences")
                        .includes("push_notifications")}
                      onCheckedChange={(checked) => {
                        const current = form.getValues(
                          "notificationPreferences",
                        );
                        if (checked) {
                          form.setValue("notificationPreferences", [
                            ...current,
                            "push_notifications",
                          ]);
                        } else {
                          form.setValue(
                            "notificationPreferences",
                            current.filter(
                              (pref) => pref !== "push_notifications",
                            ),
                          );
                        }
                      }}
                    />
                  </div>
                </div>

                {form.formState.errors.notificationPreferences && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.notificationPreferences.message}
                  </p>
                )}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Privacy Notice</p>
                  <p className="text-sm">
                    Your email will only be used for camera location
                    notifications. We never share your information with third
                    parties.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Chrome/Browser Notifications Switch */}
              <div className="border rounded-lg p-4 bg-orange-50/50 border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Chrome className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="chrome-notifications" className="text-sm font-medium">
                        Browser Notifications (Chrome/Safari/Firefox)
                      </Label>
                      <p className="text-xs text-gray-600">
                        Basic notifications that work when your browser is open
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="chrome-notifications"
                    onCheckedChange={(checked) => {
                      if (checked) {
                        enableBrowserNotifications();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Notification Differences Info */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Notification Types Explained:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start space-x-2">
                      <Smartphone className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Push Notifications:</strong> Advanced notifications that work even when browser is closed (mobile devices, some desktops)
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Chrome className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Browser Notifications:</strong> Basic notifications that appear while your browser is open and this tab is active
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Subscribing..." : "Subscribe to Alerts"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
