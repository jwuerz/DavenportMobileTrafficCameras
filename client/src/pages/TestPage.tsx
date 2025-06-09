import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, TestTube } from "lucide-react";
import NotificationGuide from "@/components/NotificationGuide";
import MultiStrategyNotificationTester from "@/components/MultiStrategyNotificationTester";
import FirebaseConfigTest from "@/components/FirebaseConfigTest";

export default function TestPage() {
  const [testEmail, setTestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const testFirebaseNotification = useCallback(async () => {
    console.log("Firebase notification button clicked");
    setIsLoading(true);

    try {
      const { notificationService } = await import("@/lib/notificationService");

      // Initialize and request permission
      const result = await notificationService.requestPermissionAndGetToken();

      if (result.granted && result.token) {
        // Test local notification first
        const testSuccess = await notificationService.testNotification();

        if (testSuccess) {
          toast({
            title: "Firebase Notifications Enabled",
            description: "You will receive push notifications for camera updates.",
          });
        } else {
          toast({
            title: "Local Test Failed",
            description: "Check browser permissions and try again.",
            variant: "destructive",
          });
        }
      } else {
        console.error("Registration failed:", result.error);
        toast({
          title: "Registration Failed",
          description: result.error || "Could not register for notifications. Please check your browser settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Firebase notification error:", error);
      toast({
        title: "Registration Failed",
        description: `Could not register for notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const testChromeNotification = async () => {
    console.log("Chrome notification button clicked");

    if (!("Notification" in window)) {
      toast({
        title: "Notifications Not Supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
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
        return;
      }

      // Register service worker with better error handling
      let swRegistration = null;
      if ('serviceWorker' in navigator) {
        try {
          // Check if already registered
          swRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
          if (!swRegistration) {
            swRegistration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/'
            });
            console.log('Service Worker registered:', swRegistration);
            // Wait for service worker to be ready
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
      let permission: NotificationPermission = currentPermission;
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
        return;
      }

      // Test notification creation with error handling
      try {
        const notification = new Notification("🚦 Test Notification", {
          body: "Chrome notifications are working!",
          icon: "/favicon.ico",
          tag: "test-notification",
          requireInteraction: false
        });

        notification.onclick = () => {
          console.log("Notification clicked");
          window.focus();
          notification.close();
        };

        notification.onerror = (error) => {
          console.error("Notification error:", error);
        };

        notification.onshow = () => {
          console.log("Notification shown successfully");
        };

        toast({
          title: "Chrome Notifications Working",
          description: "Test notification sent successfully. Check your notification shade.",
        });

      } catch (notificationError) {
        console.error("Notification creation failed:", notificationError);
        
        // Fallback: try using service worker to show notification
        if (swRegistration) {
          try {
            await swRegistration.showNotification("🚦 Fallback Test Notification", {
              body: "Service worker notifications are working!",
              icon: "/favicon.ico",
              tag: "test-notification-sw",
              requireInteraction: false
            });

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

    } catch (error) {
      console.error("Chrome notification error:", error);
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      toast({
        title: "Notification Test Failed",
        description: isAndroid 
          ? "Android issue detected. Try: 1) Clear browser cache 2) Check Chrome notification settings 3) Restart browser"
          : `Error: ${(error as Error).message || "Check browser permissions and try again."}`,
        variant: "destructive",
      });
    }
  };

  const sendTestEmail = useCallback(async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to test.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });

      if (response.ok) {
        toast({
          title: "Email Sent",
          description: `Test email sent to ${testEmail}`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Email Failed",
          description: errorData.message || "Failed to send test email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Email test error:", error);
      toast({
        title: "Email Error",
        description: "Network error while sending test email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [testEmail]);

  const sendWelcomeEmail = useCallback(async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to test.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/test-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });

      if (response.ok) {
        toast({
          title: "Welcome Email Sent",
          description: `Welcome email sent to ${testEmail}`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Welcome Email Failed",
          description: errorData.message || "Failed to send welcome email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Welcome email test error:", error);
      toast({
        title: "Welcome Email Error",
        description: "Network error while sending welcome email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [testEmail]);

  const sendCameraUpdateEmail = useCallback(async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to test.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/test-camera-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });

      if (response.ok) {
        toast({
          title: "Camera Update Email Sent",
          description: `Camera update email sent to ${testEmail}`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Camera Update Failed",
          description: errorData.message || "Failed to send camera update email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Camera update email test error:", error);
      toast({
        title: "Camera Update Error",
        description: "Network error while sending camera update email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [testEmail]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <TestTube className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">Test Page</h1>
          </div>
          <p className="text-gray-600">Test notifications and email functionality</p>
        </div>

        <div className="grid gap-6">
          {/* Notification Setup Guide */}
          <div className="flex justify-center">
            <NotificationGuide />
          </div>
          
          {/* Multi-Strategy Notification Tester */}
          <MultiStrategyNotificationTester />

          {/* Firebase Configuration Test */}
          <FirebaseConfigTest />

          <div className="grid gap-6 md:grid-cols-1">
            {/* Email Tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-green-600" />
                  Email Tests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="testEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Test Email Address
                  </label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full"
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <Button 
                    onClick={sendTestEmail}
                    disabled={isLoading || !testEmail.trim()}
                    className="w-full"
                  >
                    Send Test Email
                  </Button>

                  <Button 
                    onClick={sendWelcomeEmail}
                    disabled={isLoading || !testEmail.trim()}
                    variant="outline"
                    className="w-full"
                  >
                    Send Welcome Email
                  </Button>

                  <Button 
                    onClick={sendCameraUpdateEmail}
                    disabled={isLoading || !testEmail.trim()}
                    variant="outline"
                    className="w-full"
                  >
                    Send Camera Update
                  </Button>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h4 className="font-medium text-red-800 mb-2">Android Notification Issues:</h4>
                    <ul className="space-y-1 text-red-700">
                      <li>• <strong>Chrome Settings:</strong> Go to Chrome → Settings → Site Settings → Notifications</li>
                      <li>• <strong>Clear Cache:</strong> Clear browser cache and cookies for this site</li>
                      <li>• <strong>Battery Optimization:</strong> Disable battery optimization for Chrome</li>
                      <li>• <strong>Do Not Disturb:</strong> Check that Do Not Disturb mode is off</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h4 className="font-medium text-yellow-800 mb-2">Common Email Issues:</h4>
                    <ul className="space-y-1 text-yellow-700">
                      <li>• <strong>Domain validation:</strong> Make sure your FROM_EMAIL domain is verified in Brevo</li>
                      <li>• <strong>API key:</strong> Verify BREVO_API_KEY is set and active in your Secrets</li>
                      <li>• <strong>Sender reputation:</strong> New domains may have sending limitations</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-medium text-blue-800 mb-2">To fix domain issues:</h4>
                    <ol className="space-y-1 text-blue-700">
                      <li>1. Go to your Brevo dashboard → Senders, Domains & Dedicated IPs</li>
                      <li>2. Add and verify your domain (e.g., davenportcameraalerts.com)</li>
                      <li>3. Update FROM_EMAIL environment variable to use verified domain</li>
                      <li>4. For testing, use noreply@yourdomain.com format</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="text-blue-600 hover:text-blue-800 underline">
            ← Back to Main Page
          </a>
        </div>
      </div>
    </div>
  );
}