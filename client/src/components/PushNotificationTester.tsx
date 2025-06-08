import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Smartphone, Monitor, Tablet, Bell, Send, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/lib/notificationService';

interface TestNotificationData {
  title: string;
  body: string;
  url?: string;
  vibrate?: boolean;
  silent?: boolean;
}

export default function PushNotificationTester() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [testData, setTestData] = useState<TestNotificationData>({
    title: '🚦 Camera Location Update',
    body: 'Traffic camera locations have been updated in Davenport',
    url: '/',
    vibrate: true,
    silent: false
  });
  const { toast } = useToast();

  useEffect(() => {
    detectDevice();
  }, []);

  const detectDevice = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    setDeviceInfo({
      userAgent,
      platform,
      isAndroid: /Android/i.test(userAgent),
      isIOS: /iPhone|iPad|iPod/i.test(userAgent),
      isChrome: /Chrome/i.test(userAgent),
      isFirefox: /Firefox/i.test(userAgent),
      isSafari: /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent),
      isEdge: /Edge/i.test(userAgent),
      isPWA: window.matchMedia('(display-mode: standalone)').matches,
      supportsNotifications: 'Notification' in window,
      supportsServiceWorker: 'serviceWorker' in navigator,
      supportsPush: 'PushManager' in window
    });
  };

  const registerForNotifications = async () => {
    setIsRegistering(true);
    
    try {
      const result = await notificationService.requestPermissionAndGetToken();
      
      if (result.granted && result.token) {
        setFcmToken(result.token);
        toast({
          title: "Registration Successful",
          description: "Device registered for push notifications",
        });
      } else {
        toast({
          title: "Registration Failed",
          description: result.error || "Could not register for notifications",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Error",
        description: "Failed to register for push notifications",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const sendTestNotification = async () => {
    if (!fcmToken) {
      toast({
        title: "Not Registered",
        description: "Please register for notifications first",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);

    try {
      const response = await fetch('/api/test-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fcmToken,
          notification: {
            title: testData.title,
            body: testData.body,
          },
          data: {
            url: testData.url,
            clickAction: 'open_app',
            vibrate: testData.vibrate ? 'true' : 'false',
            silent: testData.silent ? 'true' : 'false'
          }
        })
      });

      if (response.ok) {
        toast({
          title: "Test Notification Sent",
          description: "Check your notification shade/tray",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Send Failed",
          description: errorData.message || "Failed to send notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Send test notification error:", error);
      toast({
        title: "Send Error",
        description: "Network error while sending notification",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const sendCameraUpdateTest = async () => {
    if (!fcmToken) {
      toast({
        title: "Not Registered",
        description: "Please register for notifications first",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);

    try {
      const response = await fetch('/api/test-camera-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fcmToken
        })
      });

      if (response.ok) {
        toast({
          title: "Camera Update Sent",
          description: "Simulated camera location update notification",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Send Failed",
          description: errorData.message || "Failed to send camera update",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Send camera update error:", error);
      toast({
        title: "Send Error",
        description: "Network error while sending camera update",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getDeviceIcon = () => {
    if (!deviceInfo) return <Monitor className="w-5 h-5" />;
    
    if (deviceInfo.isAndroid || deviceInfo.isIOS) {
      return <Smartphone className="w-5 h-5" />;
    }
    
    if (deviceInfo.platform?.includes('iPad')) {
      return <Tablet className="w-5 h-5" />;
    }
    
    return <Monitor className="w-5 h-5" />;
  };

  const getPlatformSupport = () => {
    if (!deviceInfo) return null;

    const supports = [];
    const issues = [];

    if (deviceInfo.supportsNotifications) {
      supports.push("✓ Notifications API");
    } else {
      issues.push("✗ Notifications not supported");
    }

    if (deviceInfo.supportsServiceWorker) {
      supports.push("✓ Service Workers");
    } else {
      issues.push("✗ Service Workers not supported");
    }

    if (deviceInfo.supportsPush) {
      supports.push("✓ Push Manager");
    } else {
      issues.push("✗ Push notifications not supported");
    }

    return { supports, issues };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getDeviceIcon()}
          Cross-Platform Push Notification Tester
        </CardTitle>
        <CardDescription>
          Test push notifications on Android, iOS, and web browsers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Device Information */}
        {deviceInfo && (
          <div className="space-y-3">
            <h4 className="font-medium">Device Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Platform: {deviceInfo.platform}</div>
              <div>PWA Mode: {deviceInfo.isPWA ? 'Yes' : 'No'}</div>
              <div>Browser: {
                deviceInfo.isChrome ? 'Chrome' :
                deviceInfo.isFirefox ? 'Firefox' :
                deviceInfo.isSafari ? 'Safari' :
                deviceInfo.isEdge ? 'Edge' : 'Other'
              }</div>
              <div>Mobile: {deviceInfo.isAndroid || deviceInfo.isIOS ? 'Yes' : 'No'}</div>
            </div>
            
            {(() => {
              const support = getPlatformSupport();
              if (!support) return null;
              
              return (
                <div className="space-y-2">
                  {support.supports.length > 0 && (
                    <div className="text-sm text-green-600">
                      {support.supports.map((item, i) => <div key={i}>{item}</div>)}
                    </div>
                  )}
                  {support.issues.length > 0 && (
                    <div className="text-sm text-red-600">
                      {support.issues.map((item, i) => <div key={i}>{item}</div>)}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Registration Section */}
        <div className="space-y-3">
          <h4 className="font-medium">Step 1: Register Device</h4>
          <div className="flex gap-2 items-center">
            <Button 
              onClick={registerForNotifications}
              disabled={isRegistering}
              className="flex items-center gap-2"
            >
              {isRegistering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              Register for Notifications
            </Button>
            {fcmToken && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Registered
              </div>
            )}
          </div>
          
          {fcmToken && (
            <div className="text-xs">
              <Label>FCM Token (first 50 chars):</Label>
              <div className="font-mono bg-gray-100 p-2 rounded text-xs break-all">
                {fcmToken.substring(0, 50)}...
              </div>
            </div>
          )}
        </div>

        {/* Custom Notification Testing */}
        <div className="space-y-3">
          <h4 className="font-medium">Step 2: Test Custom Notification</h4>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="title">Notification Title</Label>
              <Input
                id="title"
                value={testData.title}
                onChange={(e) => setTestData({...testData, title: e.target.value})}
                placeholder="Enter notification title"
              />
            </div>
            <div>
              <Label htmlFor="body">Notification Body</Label>
              <Textarea
                id="body"
                value={testData.body}
                onChange={(e) => setTestData({...testData, body: e.target.value})}
                placeholder="Enter notification message"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="url">Click URL (optional)</Label>
              <Input
                id="url"
                value={testData.url || ''}
                onChange={(e) => setTestData({...testData, url: e.target.value})}
                placeholder="URL to open when clicked"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={testData.vibrate}
                  onChange={(e) => setTestData({...testData, vibrate: e.target.checked})}
                />
                Vibrate (Android)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={testData.silent}
                  onChange={(e) => setTestData({...testData, silent: e.target.checked})}
                />
                Silent
              </label>
            </div>
          </div>
          
          <Button 
            onClick={sendTestNotification}
            disabled={isTesting || !fcmToken}
            className="flex items-center gap-2"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Test Notification
          </Button>
        </div>

        {/* Camera Update Test */}
        <div className="space-y-3">
          <h4 className="font-medium">Step 3: Test Camera Update Notification</h4>
          <p className="text-sm text-gray-600">
            This simulates the actual notification users receive when camera locations change.
          </p>
          
          <Button 
            onClick={sendCameraUpdateTest}
            disabled={isTesting || !fcmToken}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Camera Update Test
          </Button>
        </div>

        {/* Platform-Specific Instructions */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Platform Notes:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>Android Chrome:</strong> Notifications appear in system tray with vibration</li>
              <li>• <strong>iOS Safari:</strong> Add to Home Screen first for better notification support</li>
              <li>• <strong>Desktop:</strong> Notifications appear in system notification area</li>
              <li>• <strong>PWA Mode:</strong> Enhanced notification features and app icon</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}