import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, Monitor, Tablet, Bell, Send, CheckCircle, AlertTriangle, Loader2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificationManager } from '@/lib/notificationStrategies';

interface DeviceInfo {
  userAgent: string;
  platform: string;
  isAndroid: boolean;
  isIOS: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isPWA: boolean;
  supportsNotifications: boolean;
  supportsServiceWorker: boolean;
  supportsPush: boolean;
}

export default function MultiStrategyNotificationTester() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState<string>('None');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [strategies, setStrategies] = useState<Array<{ name: string; supported: boolean; capabilities: string[] }>>([]);
  const [testTitle, setTestTitle] = useState('🚦 Camera Location Update');
  const [testBody, setTestBody] = useState('Traffic camera locations have been updated in Davenport');
  const { toast } = useToast();

  useEffect(() => {
    detectDevice();
    loadStrategies();
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

  const loadStrategies = () => {
    const allStrategies = notificationManager.getAllStrategies();
    setStrategies(allStrategies);
  };

  const initializeNotifications = async () => {
    setIsInitializing(true);
    
    try {
      const result = await notificationManager.initialize();
      setActiveStrategy(result.strategy);
      
      if (result.success) {
        toast({
          title: "Notifications Initialized",
          description: `Using: ${result.strategy}`,
        });
      } else {
        toast({
          title: "Initialization Failed",
          description: "Unable to set up any notification strategy",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Notification initialization error:", error);
      toast({
        title: "Initialization Error",
        description: "Failed to initialize notification system",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const testNotification = async () => {
    setIsTesting(true);
    
    try {
      const success = await notificationManager.sendNotification(testTitle, testBody, {
        tag: 'test-notification',
        requireInteraction: false,
        onClick: () => console.log('Test notification clicked')
      });
      
      if (success) {
        toast({
          title: "Test Notification Sent",
          description: "Check your notification area",
        });
      } else {
        toast({
          title: "Test Failed",
          description: "Unable to send test notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Test notification error:", error);
      toast({
        title: "Test Error",
        description: "Failed to send test notification",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const testCameraUpdate = async () => {
    setIsTesting(true);
    
    try {
      const success = await notificationManager.sendNotification(
        '🚦 Camera Location Update',
        'Mobile camera locations have been updated: 5800 Eastern Ave, 6700 Division St, and 3 other locations.',
        {
          tag: 'camera-update',
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: { type: 'camera-update', count: 5 },
          onClick: () => {
            window.location.hash = '#locations';
            console.log('Camera update notification clicked');
          }
        }
      );
      
      if (success) {
        toast({
          title: "Camera Update Sent",
          description: "Simulated real camera location update",
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Unable to send camera update notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Camera update error:", error);
      toast({
        title: "Update Error",
        description: "Failed to send camera update",
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

  const getDeviceDescription = () => {
    if (!deviceInfo) return 'Unknown device';
    
    let description = '';
    
    if (deviceInfo.isAndroid) {
      description += 'Android ';
    } else if (deviceInfo.isIOS) {
      description += 'iOS ';
    } else {
      description += 'Desktop ';
    }
    
    if (deviceInfo.isChrome) {
      description += 'Chrome';
    } else if (deviceInfo.isFirefox) {
      description += 'Firefox';
    } else if (deviceInfo.isSafari) {
      description += 'Safari';
    } else if (deviceInfo.isEdge) {
      description += 'Edge';
    } else {
      description += 'Browser';
    }
    
    if (deviceInfo.isPWA) {
      description += ' (PWA Mode)';
    }
    
    return description;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getDeviceIcon()}
          Multi-Strategy Notification System
        </CardTitle>
        <CardDescription>
          Comprehensive cross-platform notification testing for {getDeviceDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Device Capabilities */}
        {deviceInfo && (
          <div className="space-y-3">
            <h4 className="font-medium">Device Capabilities</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className={deviceInfo.supportsNotifications ? 'text-green-600' : 'text-red-600'}>
                {deviceInfo.supportsNotifications ? '✓' : '✗'} Notifications API
              </div>
              <div className={deviceInfo.supportsServiceWorker ? 'text-green-600' : 'text-red-600'}>
                {deviceInfo.supportsServiceWorker ? '✓' : '✗'} Service Workers
              </div>
              <div className={deviceInfo.supportsPush ? 'text-green-600' : 'text-red-600'}>
                {deviceInfo.supportsPush ? '✓' : '✗'} Push Manager
              </div>
              <div className={deviceInfo.isPWA ? 'text-green-600' : 'text-gray-600'}>
                {deviceInfo.isPWA ? '✓' : '○'} PWA Mode
              </div>
            </div>
          </div>
        )}

        {/* Available Strategies */}
        <div className="space-y-3">
          <h4 className="font-medium">Available Notification Strategies</h4>
          <div className="space-y-2">
            {strategies.map((strategy, index) => (
              <div key={index} className={`p-3 rounded-lg border ${strategy.supported ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{strategy.name}</span>
                  <span className={`text-sm ${strategy.supported ? 'text-green-600' : 'text-gray-500'}`}>
                    {strategy.supported ? 'Supported' : 'Not Available'}
                  </span>
                </div>
                {strategy.supported && (
                  <div className="mt-2 text-xs text-gray-600">
                    {strategy.capabilities.join(' • ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Initialization */}
        <div className="space-y-3">
          <h4 className="font-medium">Step 1: Initialize Notification System</h4>
          <div className="flex gap-2 items-center">
            <Button 
              onClick={initializeNotifications}
              disabled={isInitializing}
              className="flex items-center gap-2"
            >
              {isInitializing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Initialize Notifications
            </Button>
            {activeStrategy !== 'None' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Active: {activeStrategy}
              </div>
            )}
          </div>
        </div>

        {/* Custom Test */}
        <div className="space-y-3">
          <h4 className="font-medium">Step 2: Test Custom Notification</h4>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="testTitle">Notification Title</Label>
              <Input
                id="testTitle"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Enter notification title"
              />
            </div>
            <div>
              <Label htmlFor="testBody">Notification Message</Label>
              <Input
                id="testBody"
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                placeholder="Enter notification message"
              />
            </div>
          </div>
          
          <Button 
            onClick={testNotification}
            disabled={isTesting || activeStrategy === 'None'}
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
            onClick={testCameraUpdate}
            disabled={isTesting || activeStrategy === 'None'}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            Send Camera Update Test
          </Button>
        </div>

        {/* Platform Instructions */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Platform-Specific Notes:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              {deviceInfo?.isAndroid && (
                <li>• <strong>Android:</strong> Notifications appear in system tray with vibration patterns</li>
              )}
              {deviceInfo?.isIOS && (
                <li>• <strong>iOS:</strong> Add to Home Screen for enhanced notification support</li>
              )}
              {!deviceInfo?.isAndroid && !deviceInfo?.isIOS && (
                <li>• <strong>Desktop:</strong> Notifications appear in system notification area</li>
              )}
              {deviceInfo?.isPWA && (
                <li>• <strong>PWA Mode:</strong> Enhanced notification features with app badges</li>
              )}
              <li>• <strong>Fallback:</strong> In-app notifications available if system notifications fail</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}