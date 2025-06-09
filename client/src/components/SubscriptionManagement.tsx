import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Settings, Pause, Trash2, Bell, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const lookupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LookupFormData = z.infer<typeof lookupSchema>;

interface UserSubscription {
  id: number;
  email: string;
  phone?: string;
  isActive: boolean;
  notificationPreferences: string[];
  createdAt: string;
}

export default function SubscriptionManagement() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const { toast } = useToast();

  const form = useForm<LookupFormData>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      email: "",
    },
  });

  const onLookup = async (data: LookupFormData) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/subscription/lookup", data);
      const userData = await response.json();
      setSubscription(userData);
      setPushNotificationsEnabled(false); // Reset state for new subscription
      toast({
        title: "Subscription Found",
        description: "Your subscription details have been loaded.",
      });
    } catch (error) {
      toast({
        title: "Subscription Not Found",
        description: "No subscription found for this email address.",
        variant: "destructive",
      });
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!subscription) return;

    try {
      await apiRequest("POST", `/api/subscription/${subscription.id}/toggle`);
      setSubscription({
        ...subscription,
        isActive: !subscription.isActive,
      });
      toast({
        title: subscription.isActive ? "Subscription Paused" : "Subscription Resumed",
        description: subscription.isActive 
          ? "You will no longer receive notifications."
          : "You will now receive notifications again.",
      });
    } catch (error) {
      toast({
        title: "Action Failed",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEnablePushNotifications = async () => {
    if (!subscription) return;

    console.log("Push notification button clicked");
    setIsEnablingPush(true);

    if (!("Notification" in window)) {
      toast({
        title: "Notifications Not Supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
      setIsEnablingPush(false);
      return;
    }

    try {
      // Check current permission status first
      const currentPermission = Notification.permission;
      console.log("Current notification permission:", currentPermission);

      if (currentPermission === "denied") {
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in your browser settings: Menu > Settings > Site Settings > Notifications",
          variant: "destructive",
        });
        setIsEnablingPush(false);
        return;
      }

      // Register service worker with better error handling
      let swRegistration = null;
      if ('serviceWorker' in navigator) {
        try {
          swRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
          if (!swRegistration) {
            swRegistration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/'
            });
            console.log('Service Worker registered:', swRegistration);
            await navigator.serviceWorker.ready;
          } else {
            console.log('Service Worker already registered:', swRegistration);
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error);
          toast({
            title: "Service Worker Failed",
            description: "Background notifications may not work. Try refreshing the page.",
            variant: "destructive",
          });
        }
      }

      // Request permission if needed
      let permission = currentPermission;
      if (permission === "default") {
        console.log("Requesting notification permission...");
        permission = await Notification.requestPermission();
        console.log("Permission result:", permission);
      }

      if (permission !== "granted") {
        const isAndroid = /Android/i.test(navigator.userAgent);
        toast({
          title: "Notifications Blocked",
          description: isAndroid 
            ? "Android: Go to Chrome Settings > Site Settings > Notifications and allow this site"
            : "Please allow notifications in your browser settings.",
          variant: "destructive",
        });
        setIsEnablingPush(false);
        return;
      }

      // Try Firebase FCM registration
      let fcmToken = null;
      let notificationSuccess = false;
      
      try {
        const { notificationService } = await import("@/lib/notificationService");
        const result = await notificationService.requestPermissionAndGetToken();
        
        if (result.granted && result.token) {
          fcmToken = result.token;
          console.log("FCM token obtained successfully");
          
          // Register FCM token with the user
          await apiRequest("POST", "/api/register-fcm", {
            email: subscription.email,
            fcmToken: fcmToken
          });
          
          // Send welcome notification
          const welcomeNotification = new Notification("🚦 Welcome to Davenport Camera Alerts!", {
            body: "You're now subscribed to push notifications for camera location updates. We'll notify you when camera locations change.",
            icon: "/favicon.ico",
            tag: "welcome-notification",
            requireInteraction: false
          });

          welcomeNotification.onclick = () => {
            window.focus();
            welcomeNotification.close();
          };

          setPushNotificationsEnabled(true);
          notificationSuccess = true;
          
          toast({
            title: "Push Notifications Enabled",
            description: "You will now receive push notifications for camera updates.",
          });
        }
      } catch (firebaseError) {
        console.log("Firebase FCM failed, falling back to browser notifications:", firebaseError);
      }

      // Fallback to basic browser notifications if Firebase failed
      if (!notificationSuccess) {
        try {
          const notification = new Notification("🚦 Welcome to Davenport Camera Alerts!", {
            body: "You're now subscribed to browser notifications for camera location updates.",
            icon: "/favicon.ico",
            tag: "welcome-notification",
            requireInteraction: false
          });

          notification.onclick = () => {
            console.log("Notification clicked");
            window.focus();
            notification.close();
          };

          setPushNotificationsEnabled(true);
          
          toast({
            title: "Browser Notifications Enabled",
            description: "Basic notifications are working. You'll receive alerts when the page is open.",
          });

        } catch (notificationError) {
          console.error("Notification creation failed:", notificationError);
          
          // Final fallback: try using service worker to show notification
          if (swRegistration) {
            try {
              await swRegistration.showNotification("🚦 Welcome to Davenport Camera Alerts!", {
                body: "You're now subscribed to notifications for camera location updates.",
                icon: "/favicon.ico",
                tag: "welcome-notification-sw",
                requireInteraction: false
              });

              setPushNotificationsEnabled(true);

              toast({
                title: "Service Worker Notifications Working",
                description: "Fallback notification sent via service worker.",
              });
            } catch (swError) {
              console.error("Service worker notification failed:", swError);
              throw swError;
            }
          } else {
            throw notificationError;
          }
        }
      }

    } catch (error) {
      console.error("Notification setup error:", error);
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      toast({
        title: "Notification Setup Failed",
        description: isAndroid 
          ? "Android issue detected. Try: 1) Clear browser cache 2) Check Chrome notification settings 3) Restart browser"
          : `Error: ${error.message || "Check browser permissions and try again."}`,
        variant: "destructive",
      });
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!subscription) return;

    if (!confirm("Are you sure you want to unsubscribe? This action cannot be undone.")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/subscription/${subscription.id}`);
      toast({
        title: "Unsubscribed Successfully",
        description: "You have been unsubscribed from camera location notifications.",
      });
      setSubscription(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Unsubscribe Failed",
        description: "Failed to unsubscribe. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPreferenceLabel = (pref: string) => {
    const labels: Record<string, string> = {
      location_changes: "Location Changes",
      new_cameras: "New Camera Installations",
      schedule_changes: "Schedule Changes",
    };
    return labels[pref] || pref;
  };

  return (
    <section id="manage" className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Manage Your Subscription</h3>
          <p className="text-gray-600">
            Update your notification preferences or unsubscribe at any time.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Find Your Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onLookup)} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="lookup-email">
                    Enter your email address to manage subscription
                  </Label>
                  <Input
                    id="lookup-email"
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
                <div className="flex items-end">
                  <Button type="submit" disabled={isLoading}>
                    <Search className="mr-2 h-4 w-4" />
                    {isLoading ? "Searching..." : "Find Subscription"}
                  </Button>
                </div>
              </div>
            </form>

            {subscription && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-4">Subscription Details</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Email:</span>
                    <span className="font-medium">{subscription.email}</span>
                  </div>
                  {subscription.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Phone:</span>
                      <span className="font-medium">{subscription.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Status:</span>
                    <Badge
                      className={
                        subscription.isActive
                          ? "bg-green-600 text-white"
                          : "bg-gray-500 text-white"
                      }
                    >
                      {subscription.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Subscribed since:</span>
                    <span>{formatDate(subscription.createdAt)}</span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-gray-700">Notification Preferences:</span>
                    <div className="flex flex-wrap gap-2">
                      {subscription.notificationPreferences.map((pref) => (
                        <Badge key={pref} variant="secondary">
                          {getPreferenceLabel(pref)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 mt-6">
                  <Button
                    onClick={handleTogglePause}
                    variant={subscription.isActive ? "secondary" : "default"}
                    size="sm"
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    {subscription.isActive ? "Pause Notifications" : "Resume Notifications"}
                  </Button>
                  <Button
                    onClick={handleEnablePushNotifications}
                    disabled={pushNotificationsEnabled || isEnablingPush}
                    variant={pushNotificationsEnabled ? "default" : "outline"}
                    size="sm"
                    className={pushNotificationsEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {isEnablingPush ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : pushNotificationsEnabled ? (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    ) : (
                      <Bell className="mr-2 h-4 w-4" />
                    )}
                    {isEnablingPush 
                      ? "Enabling..." 
                      : pushNotificationsEnabled 
                        ? "Push Notifications Active" 
                        : "Enable Push Notifications"
                    }
                  </Button>
                  <Button
                    onClick={handleUnsubscribe}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Unsubscribe
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
