
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, TestTube } from "lucide-react";

export default function TestPage() {
  const [testEmail, setTestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
      // Register service worker first if not already registered
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered:', registration);
        } catch (error) {
          console.log('Service Worker registration failed:', error);
        }
      }

      // Request permission if needed
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        toast({
          title: "Notifications Blocked",
          description: "Please allow notifications to test this feature.",
          variant: "destructive",
        });
        return;
      }

      // Try service worker notification first
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration && registration.showNotification) {
            await registration.showNotification("🚦 Camera Locations Updated!", {
              body: "5 new camera locations detected for this week. Click to view details.",
              icon: "/favicon.ico",
              tag: "camera-update",
              requireInteraction: false,
              badge: "/favicon.ico"
            });
            toast({
              title: "Service Worker Notification Sent",
              description: "Check your browser for the camera update notification.",
            });
            return;
          }
        } catch (swError) {
          console.log("Service worker notification failed:", swError);
        }
      }

      // Fallback to direct Notification constructor
      const notification = new Notification("🚦 Camera Locations Updated!", {
        body: "5 new camera locations detected for this week. Click to view details.",
        icon: "/favicon.ico",
        tag: "camera-update"
      });

      notification.onclick = function() {
        window.focus();
        notification.close();
      };

      toast({
        title: "Direct Notification Sent",
        description: "Check your browser for the camera update notification.",
      });

    } catch (error) {
      console.error("Notification error:", error);
      toast({
        title: "Notification Failed",
        description: `Error: ${error.message}. This may work better in production.`,
        variant: "destructive",
      });
    }
  };

  const testWelcomeEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to test.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/test-welcome-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: testEmail }),
      });

      if (response.ok) {
        toast({
          title: "Welcome Email Sent",
          description: `Test welcome email sent to ${testEmail}`,
        });
      } else {
        throw new Error("Failed to send email");
      }
    } catch (error) {
      toast({
        title: "Email Test Failed",
        description: "Failed to send test email. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testCameraUpdateEmail = async () => {
    if (!testEmail) {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: testEmail }),
      });

      if (response.ok) {
        toast({
          title: "Camera Update Email Sent",
          description: `Test camera update email sent to ${testEmail}`,
        });
      } else {
        throw new Error("Failed to send email");
      }
    } catch (error) {
      toast({
        title: "Email Test Failed",
        description: "Failed to send test email. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <TestTube className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">Test Page</h1>
          </div>
          <p className="text-gray-600">Test Chrome notifications and email functionality</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Chrome Notifications Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2 text-blue-600" />
                Chrome Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Test browser notification functionality. This will request permission if not already granted.
              </p>
              <Button 
                onClick={() => {
                  console.log("Button clicked!");
                  testChromeNotification();
                }} 
                className="w-full"
                type="button"
              >
                Test Chrome Notification
              </Button>
              <div className="text-xs text-gray-500">
                Note: Make sure your browser allows notifications for this site.
              </div>
            </CardContent>
          </Card>

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
                  placeholder="Enter email to test..."
                  className="mb-4"
                />
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={testWelcomeEmail} 
                  disabled={isLoading || !testEmail}
                  className="w-full"
                  variant="outline"
                >
                  Test Welcome Email
                </Button>
                
                <Button 
                  onClick={testCameraUpdateEmail} 
                  disabled={isLoading || !testEmail}
                  className="w-full"
                  variant="outline"
                >
                  Test Camera Update Email
                </Button>
              </div>
              
              <div className="text-xs text-gray-500">
                Note: Emails will be sent using your configured email service (Brevo).
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Status */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Chrome Notifications:</span>
                <span className="ml-2 text-gray-600">
                  {"Notification" in window ? "Supported" : "Not Supported"}
                </span>
              </div>
              <div>
                <span className="font-medium">Notification Permission:</span>
                <span className="ml-2 text-gray-600">
                  {"Notification" in window ? Notification.permission : "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium">Email Service:</span>
                <span className="ml-2 text-gray-600">
                  {process.env.NODE_ENV === "development" ? "Development Mode" : "Production"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <a href="/" className="text-blue-600 hover:text-blue-800 underline">
            ← Back to Main Page
          </a>
        </div>
      </div>
    </div>
  );
}
