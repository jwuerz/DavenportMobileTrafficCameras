import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Send } from 'lucide-react';
import { getFirebaseConfig } from '@/lib/firebaseConfig';
import { initializeFirebase, requestNotificationPermission, getFirebaseToken } from '@/lib/firebase';

interface ConfigStatus {
  key: string;
  label: string;
  value: string | undefined;
  isValid: boolean;
  isSecret: boolean;
}

export default function FirebaseConfigTest() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus[]>([]);
  const [testResults, setTestResults] = useState<any>({});
  const [isTestingConfig, setIsTestingConfig] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    checkFirebaseConfig();
  }, []);

  const checkFirebaseConfig = () => {
    const config = getFirebaseConfig();
    
    const status: ConfigStatus[] = [
      {
        key: 'apiKey',
        label: 'API Key',
        value: config.apiKey,
        isValid: !!config.apiKey && config.apiKey !== 'undefined',
        isSecret: false
      },
      {
        key: 'authDomain',
        label: 'Auth Domain',
        value: config.authDomain,
        isValid: !!config.authDomain && config.authDomain !== 'undefined',
        isSecret: false
      },
      {
        key: 'projectId',
        label: 'Project ID',
        value: config.projectId,
        isValid: !!config.projectId && config.projectId !== 'undefined',
        isSecret: false
      },
      {
        key: 'storageBucket',
        label: 'Storage Bucket',
        value: config.storageBucket,
        isValid: !!config.storageBucket && config.storageBucket !== 'undefined',
        isSecret: false
      },
      {
        key: 'messagingSenderId',
        label: 'Messaging Sender ID',
        value: config.messagingSenderId,
        isValid: !!config.messagingSenderId && config.messagingSenderId !== 'undefined',
        isSecret: false
      },
      {
        key: 'appId',
        label: 'App ID',
        value: config.appId,
        isValid: !!config.appId && config.appId !== 'undefined',
        isSecret: false
      },
      {
        key: 'vapidKey',
        label: 'VAPID Key',
        value: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        isValid: !!import.meta.env.VITE_FIREBASE_VAPID_KEY && import.meta.env.VITE_FIREBASE_VAPID_KEY !== 'undefined',
        isSecret: true
      }
    ];

    setConfigStatus(status);
  };

  const testFirebaseInitialization = async () => {
    setIsTestingConfig(true);
    const results: any = {};

    try {
      // Test Firebase initialization
      console.log('Testing Firebase initialization...');
      const messaging = await initializeFirebase();
      results.initialization = {
        success: !!messaging,
        message: messaging ? 'Firebase initialized successfully' : 'Firebase initialization failed'
      };

      // Test notification permission
      console.log('Testing notification permission...');
      const hasPermission = await requestNotificationPermission();
      results.permission = {
        success: hasPermission,
        message: hasPermission ? 'Notification permission granted' : 'Notification permission denied'
      };

      // Test FCM token generation
      if (hasPermission) {
        console.log('Testing FCM token generation...');
        try {
          const token = await getFirebaseToken();
          setFcmToken(token);
          results.tokenGeneration = {
            success: !!token,
            message: token ? `FCM token generated: ${token.substring(0, 20)}...` : 'FCM token generation failed'
          };
        } catch (tokenError) {
          results.tokenGeneration = {
            success: false,
            message: `FCM token error: ${(tokenError as Error).message}`
          };
        }
      } else {
        results.tokenGeneration = {
          success: false,
          message: 'Skipped - notification permission required'
        };
      }

    } catch (error) {
      results.initialization = {
        success: false,
        message: `Firebase initialization error: ${(error as Error).message}`
      };
    }

    setTestResults(results);
    setIsTestingConfig(false);
  };

  const sendTestNotification = async () => {
    if (!fcmToken) {
      alert('FCM token required. Please run Firebase test first.');
      return;
    }

    setIsTestingNotification(true);
    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'firebase',
          fcmToken: fcmToken
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Test notification sent successfully! Check your browser for the notification.');
      } else {
        alert(`Test notification failed: ${result.message}`);
      }
    } catch (error) {
      alert(`Test notification error: ${(error as Error).message}`);
    } finally {
      setIsTestingNotification(false);
    }
  };

  const sendTestToAllUsers = async () => {
    setIsTestingNotification(true);
    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'firebase-all'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Test notifications sent to ${result.sentCount} users with Firebase tokens!`);
      } else {
        alert(`Test notification failed: ${result.message}`);
      }
    } catch (error) {
      alert(`Test notification error: ${(error as Error).message}`);
    } finally {
      setIsTestingNotification(false);
    }
  };

  const allConfigValid = configStatus.every(config => config.isValid);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Firebase Configuration Status
          </CardTitle>
          <CardDescription>
            Verify that Firebase environment variables are properly configured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {configStatus.map((config) => (
              <div key={config.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {config.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">{config.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.isValid ? "default" : "destructive"}>
                    {config.isValid ? "Valid" : "Missing"}
                  </Badge>
                  {!config.isSecret && config.value && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {config.value.length > 20 ? `${config.value.substring(0, 20)}...` : config.value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!allConfigValid && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Some Firebase configuration values are missing. The app will run in development mode with simulated notifications.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={testFirebaseInitialization} 
            disabled={isTestingConfig}
            className="w-full"
          >
            {isTestingConfig ? 'Testing...' : 'Test Firebase Configuration'}
          </Button>
        </CardContent>
      </Card>

      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Firebase Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(testResults).map(([test, result]: [string, any]) => (
              <div key={test} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium capitalize">{test.replace(/([A-Z])/g, ' $1')}</span>
                </div>
                <span className="text-sm text-muted-foreground max-w-md text-right">
                  {result.message}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {fcmToken && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Test Notifications
            </CardTitle>
            <CardDescription>
              Test the notification system with real users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button 
                onClick={sendTestNotification} 
                disabled={isTestingNotification}
                className="w-full"
                variant="outline"
              >
                Send Test to This Device
              </Button>
              
              <Button 
                onClick={sendTestToAllUsers} 
                disabled={isTestingNotification}
                className="w-full"
              >
                Send Test to All Firebase Users
              </Button>
            </div>

            <Alert>
              <AlertDescription>
                This will send test notifications to users who have signed up for Firebase notifications.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}