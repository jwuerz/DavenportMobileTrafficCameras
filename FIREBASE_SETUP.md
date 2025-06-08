# Firebase Push Notifications Setup Guide

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in your Davenport Camera Alerts application.

## Prerequisites

1. Google account
2. Access to Firebase Console
3. Your deployed application URL

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Name your project (e.g., "davenport-camera-alerts")
4. Enable Google Analytics (optional)
5. Create the project

## Step 2: Add Web App to Firebase Project

1. In your Firebase project dashboard, click the web icon (</>) to add a web app
2. Register your app with a nickname (e.g., "Davenport Camera Web")
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object - you'll need these values

## Step 3: Enable Cloud Messaging

1. In the Firebase Console, go to "Project Settings" (gear icon)
2. Navigate to the "Cloud Messaging" tab
3. In the "Web configuration" section, click "Generate key pair" under "Web push certificates"
4. Copy the generated VAPID key

## Step 4: Configure Environment Variables

Add these environment variables to your Replit project:

### Frontend Environment Variables (prefix with VITE_):
```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### Backend Environment Variables:
```
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVER_KEY=your_server_key_here
```

## Step 5: Get Server Key

1. In Firebase Console, go to "Project Settings"
2. Navigate to the "Cloud Messaging" tab
3. Copy the "Server key" from the "Project credentials" section
4. Add it as `FIREBASE_SERVER_KEY` in your environment variables

## Step 6: Update Service Worker Configuration

The service worker at `client/public/sw.js` needs your Firebase configuration. Replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "your_api_key_here",
  authDomain: "your_project_id.firebaseapp.com", 
  projectId: "your_project_id",
  storageBucket: "your_project_id.appspot.com",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id"
};
```

## Step 7: Test the Integration

1. Restart your application after adding environment variables
2. Go to the Test page in your app
3. Click "Test Firebase Notification"
4. Allow notification permissions when prompted
5. You should receive a test notification

## Step 8: Production Deployment

For production deployment, ensure:

1. All environment variables are set in your production environment
2. Your domain is added to Firebase authorized domains:
   - Go to Firebase Console > Authentication > Settings > Authorized domains
   - Add your production domain (e.g., yourapp.replit.app)

## Troubleshooting

### Common Issues:

1. **No notifications received**: Check browser permissions and ensure VAPID key is correct
2. **FCM token registration fails**: Verify API key and project ID are correct
3. **Service worker errors**: Check browser console for Firebase configuration errors
4. **Server-side sending fails**: Verify server key is correct and Firebase project has Cloud Messaging enabled

### Development Mode:

Without Firebase configuration, the app will:
- Log notifications to console instead of sending them
- Show "development mode" messages
- Continue working with email notifications only

## Features Enabled:

Once configured, users will receive:
- Real-time push notifications when camera locations change
- Cross-device notifications (works even when browser is closed)
- Rich notifications with action buttons
- Automatic fallback to email if push fails

## Security Notes:

- API keys can be public (they're restricted by domain)
- Server key should be kept private
- VAPID key is safe to include in client code
- Use Firebase security rules for additional protection

## Support:

For Firebase-specific issues, consult the [Firebase Documentation](https://firebase.google.com/docs/cloud-messaging/js/client).