import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/lib/notificationService';

export default function NotificationGuide() {
  const [isTestingNotifications, setIsTestingNotifications] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const checkPermissionStatus = () => {
    if ('Notification' in window) {
      const status = Notification.permission;
      setPermissionStatus(status);
      return status;
    }
    return 'unsupported';
  };

  const testNotifications = async () => {
    setIsTestingNotifications(true);
    
    try {
      const result = await notificationService.requestPermissionAndGetToken();
      
      if (result.granted) {
        const testSuccess = await notificationService.testNotification();
        
        if (testSuccess) {
          toast({
            title: "Notifications Working",
            description: "You will receive camera location updates.",
          });
          setPermissionStatus('granted');
        } else {
          toast({
            title: "Test Failed",
            description: "Check browser settings and try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Permission Required",
          description: result.error || "Please allow notifications to receive alerts.",
          variant: "destructive",
        });
        setPermissionStatus(Notification.permission);
      }
    } catch (error) {
      console.error("Notification test error:", error);
      toast({
        title: "Setup Failed",
        description: "Please check your browser settings.",
        variant: "destructive",
      });
    } finally {
      setIsTestingNotifications(false);
    }
  };

  const getPermissionBadge = () => {
    switch (permissionStatus) {
      case 'granted':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Enabled</span>;
      case 'denied':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><BellOff className="w-3 h-3 mr-1" />Blocked</span>;
      case 'default':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Bell className="w-3 h-3 mr-1" />Not Set</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Unsupported</span>;
    }
  };

  const getInstructions = () => {
    const status = permissionStatus;
    
    if (status === 'denied') {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Notifications are blocked. To enable them:
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Click the notification icon (🔔) in your browser's address bar</li>
              <li>Select "Allow" for notifications</li>
              <li>Refresh this page and test again</li>
            </ol>
            
            <p className="mt-2 text-sm text-gray-600">
              Alternative: Go to your browser settings → Privacy & Security → Site Settings → Notifications, 
              find this site and change it to "Allow".
            </p>
          </AlertDescription>
        </Alert>
      );
    }
    
    if (status === 'default') {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Click "Enable Notifications" below to receive real-time camera location updates. 
            Your browser will ask for permission.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (status === 'granted') {
      return (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Notifications are enabled! You will receive alerts when camera locations are updated.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Your browser does not support notifications. Please use Chrome, Firefox, Safari, or Edge 
          for the best experience.
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Get instant alerts when camera locations change
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Status:</span>
          {getPermissionBadge()}
        </div>
        
        {getInstructions()}
        
        <div className="flex gap-2">
          <Button 
            onClick={testNotifications}
            disabled={isTestingNotifications}
            className="flex items-center gap-2"
          >
            {isTestingNotifications ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            {permissionStatus === 'granted' ? 'Test Notifications' : 'Enable Notifications'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={checkPermissionStatus}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Check Status
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Notifications will alert you when camera deployments change</p>
          <p>• You can disable notifications anytime in your browser settings</p>
          <p>• Notifications work even when this tab is closed</p>
        </div>
      </CardContent>
    </Card>
  );
}