import { useState, useEffect } from 'react';
// Assuming Button is a styled component, e.g., from ShadCN UI
// For this script, actual Button implementation is not needed, only its import.
// import { Button } from '@/components/ui/button';
const Button = (props: any) => <button {...props} />; // Dummy Button

// Assuming lucide-react icons
// const Bell = () => <span>🔔</span>; // Dummy Bell icon
// const BellOff = () => <span>🔕</span>; // Dummy BellOff icon
import { Bell, BellOff } from 'lucide-react';


// Assuming useToast is a custom hook for showing notifications
// For this script, actual useToast implementation is not needed.
// import { useToast } from '@/hooks/use-toast';
const useToast = () => ({ toast: (options: any) => console.log('Toast:', options) }); // Dummy useToast

// Assuming apiRequest is a helper for making API calls
// For this script, actual apiRequest implementation is not needed.
// import { apiRequest } from '@/lib/queryClient';
const apiRequest = async (method: string, url: string, data: any) => {
  console.log('API Request:', method, url, data);
  if (url === '/api/push/subscribe') return { subscriptionId: 'mockId123' };
  if (url === '/api/push/unsubscribe') return { message: 'Unsubscribed' };
  return {};
};


// Function to convert VAPID public key from URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string || "mock_vapid_public_key_for_testing_if_not_set"; // Fallback for testing

export default function PushNotificationManager() {
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY === "mock_vapid_public_key_for_testing_if_not_set") {
      console.error('VITE_VAPID_PUBLIC_KEY is not set in .env file. Push notifications cannot be enabled.');
      toast({
        title: 'Push Notification Error',
        description: 'VAPID public key not configured in .env file (VITE_VAPID_PUBLIC_KEY).',
        variant: 'destructive',
      });
      setSubscriptionLoading(false);
      return;
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js') // Path to your service worker file
        .then(swReg => {
          console.log('Service Worker is registered', swReg);
          setServiceWorkerRegistration(swReg);
          return swReg.pushManager.getSubscription();
        })
        .then(subscription => {
          setIsSubscribed(!!subscription);
          setSubscriptionLoading(false);
        })
        .catch(error => {
          console.error('Service Worker Error', error);
          toast({
            title: 'Push Notification Error',
            description: 'Could not register service worker. Ensure sw.js is in public folder and VAPID key is set.',
            variant: 'destructive',
          });
          setSubscriptionLoading(false);
        });
    } else {
      console.warn('Push messaging is not supported by this browser.');
      toast({
        title: 'Push Notifications Not Supported',
        description: 'Your browser does not support push notifications.',
        variant: 'destructive',
      });
      setSubscriptionLoading(false);
    }
  }, [toast]);

  const handleSubscribe = async () => {
    if (!serviceWorkerRegistration) {
      toast({ title: 'Service worker not ready', variant: 'destructive' });
      return;
    }
    if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY === "mock_vapid_public_key_for_testing_if_not_set") {
      toast({ title: 'VAPID Key Missing', description: 'VITE_VAPID_PUBLIC_KEY not set in .env. Push setup incomplete.', variant: 'destructive' });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
      setPermissionDenied(true);
      toast({ title: 'Permission Denied', description: 'You have blocked push notifications. Please check browser settings.', variant: 'destructive'});
      return;
    }
    if (permission === 'granted') {
      setPermissionDenied(false);
      setSubscriptionLoading(true);
      try {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        const subscription = await serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        // CRITICAL TODO: Replace MOCK_USER_ID with actual user ID from auth context/props
        const MOCK_USER_ID = 1;
        console.warn("CRITICAL: Replace MOCK_USER_ID in PushNotificationManager.tsx with actual user ID.");

        await apiRequest('POST', '/api/push/subscribe', { subscription: subscription.toJSON(), userId: MOCK_USER_ID });
        toast({ title: 'Subscribed!', description: 'You will now receive push notifications.' });
        setIsSubscribed(true);
      } catch (error) {
        console.error('Failed to subscribe the user: ', error);
        toast({ title: 'Subscription Failed', description: 'Could not subscribe. Check console for errors.', variant: 'destructive' });
      } finally {
        setSubscriptionLoading(false);
      }
    }
  };

  const handleUnsubscribe = async () => {
    if (!serviceWorkerRegistration) {
      toast({ title: 'Service worker not ready', variant: 'destructive' });
      return;
    }
    setSubscriptionLoading(true);
    try {
      const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
      if (subscription) {
        const unsubscribedSuccessfully = await subscription.unsubscribe();
        if (unsubscribedSuccessfully) {
          await apiRequest('POST', '/api/push/unsubscribe', { endpoint: subscription.endpoint });
          toast({ title: 'Unsubscribed', description: 'You will no longer receive push notifications.' });
          setIsSubscribed(false);
        } else {
          throw new Error('Failed to unsubscribe via browser PushManager.');
        }
      }
    } catch (error) {
      console.error('Failed to unsubscribe the user: ', error);
      toast({ title: 'Unsubscription Failed', description: 'Could not unsubscribe. Check console.', variant: 'destructive' });
    } finally {
      setSubscriptionLoading(false);
    }
  };

  if (!('serviceWorker' in navigator && 'PushManager' in window)) {
    return <p className="text-sm text-muted-foreground">Push notifications not supported by your browser.</p>;
  }

  if (subscriptionLoading && !isSubscribed) { // Only show full loading state if not yet subscribed
    return <Button variant="outline" size="sm" disabled>Loading Notifications...</Button>;
  }

  if (permissionDenied) {
    return <p className="text-sm text-red-500">Notifications blocked. Please enable them in your browser settings to subscribe.</p>;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
      disabled={subscriptionLoading} // Disable button during any loading state
      title={isSubscribed ? 'Unsubscribe from notifications' : 'Subscribe to notifications'}
      aria-label={isSubscribed ? 'Unsubscribe from notifications' : 'Subscribe to notifications'}
    >
      {isSubscribed ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
    </Button>
  );
}
