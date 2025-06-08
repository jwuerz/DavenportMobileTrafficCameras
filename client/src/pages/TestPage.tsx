
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

  const testFirebaseNotification = async () => {
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
        toast({
          title: "Permission Required",
          description: result.error || "Please allow notifications to receive alerts.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Firebase notification error:", error);
      toast({
        title: "Firebase Setup Failed",
        description: "Configuration may be missing. Using fallback notifications.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      const responseData = await response.json();

      if (response.ok) {
        toast({
          title: "Welcome Email Sent",
          description: `Test welcome email sent to ${testEmail}`,
        });
      } else {
        const errorMessage = responseData.error || responseData.message || "Unknown error occurred";
        console.error("Email test error:", responseData);
        toast({
          title: "Email Test Failed",
          description: `Error: ${errorMessage}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Network error:", error);
      toast({
        title: "Email Test Failed",
        description: `Network error: ${error.message}`,
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

      const responseData = await response.json();

      if (response.ok) {
        toast({
          title: "Camera Update Email Sent",
          description: `Test camera update email sent to ${testEmail}`,
        });
      } else {
        const errorMessage = responseData.error || responseData.message || "Unknown error occurred";
        console.error("Email test error:", responseData);
        toast({
          title: "Email Test Failed",
          description: `Error: ${errorMessage}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Network error:", error);
      toast({
        title: "Email Test Failed",
        description: `Network error: ${error.message}`,
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
          {/* Firebase Push Notifications Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2 text-blue-600" />
                Firebase Push Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Test Firebase push notification functionality. This will request permission and register for real-time notifications.
              </p>
              <Button 
                onClick={testFirebaseNotification}
                className="w-full"
                type="button"
              >
                Test Firebase Notification
              </Button>
              <Button 
                onClick={() => {
                  console.log("Legacy notification button clicked!");
                  testChromeNotification();
                }} 
                variant="outline"
                className="w-full"
                type="button"
              >
                Test Legacy Browser Notification
              </Button>
              <div className="text-xs text-gray-500">
                Firebase notifications work across devices and browsers, even when the page is closed.
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

        {/* Email Configuration Help */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2 text-yellow-600" />
              Email Configuration Help
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
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

        <div className="mt-8 text-center">
          <a href="/" className="text-blue-600 hover:text-blue-800 underline">
            ← Back to Main Page
          </a>
        </div>
      </div>
    </div>
  );
}
