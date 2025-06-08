
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, MapPin, Eye, Database, Users } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2 text-primary" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Personal Information</h4>
                <ul className="list-disc ml-6 space-y-1 text-gray-600">
                  <li>Email address (for notifications)</li>
                  <li>Notification preferences</li>
                  <li>Subscription status and management choices</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Usage Information</h4>
                <ul className="list-disc ml-6 space-y-1 text-gray-600">
                  <li>Pages visited on our website</li>
                  <li>Time spent on different sections</li>
                  <li>Browser type and device information</li>
                  <li>IP address (for security purposes)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Camera Location Data</h4>
                <ul className="list-disc ml-6 space-y-1 text-gray-600">
                  <li>Public camera deployment schedules and locations</li>
                  <li>Historical camera placement data</li>
                  <li>Geographic coordinates for mapping purposes</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2 text-primary" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <Mail className="h-4 w-4 mr-2 mt-1 text-primary flex-shrink-0" />
                  <span>Send email notifications about camera location changes</span>
                </li>
                <li className="flex items-start">
                  <MapPin className="h-4 w-4 mr-2 mt-1 text-primary flex-shrink-0" />
                  <span>Provide current and historical camera location information</span>
                </li>
                <li className="flex items-start">
                  <Users className="h-4 w-4 mr-2 mt-1 text-primary flex-shrink-0" />
                  <span>Improve our service based on usage patterns</span>
                </li>
                <li className="flex items-start">
                  <Shield className="h-4 w-4 mr-2 mt-1 text-primary flex-shrink-0" />
                  <span>Maintain security and prevent abuse of our service</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary" />
                Information Sharing & Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">We Never Sell Your Data</h4>
                <p className="text-green-700">
                  We do not sell, trade, or rent your personal information to third parties under any circumstances.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Limited Sharing</h4>
                <p className="text-gray-600 mb-2">We may share information only in these specific cases:</p>
                <ul className="list-disc ml-6 space-y-1 text-gray-600">
                  <li>When required by law or legal process</li>
                  <li>To protect our rights, property, or safety</li>
                  <li>With service providers who help us operate our service (email delivery, hosting)</li>
                  <li>In the event of a business merger or acquisition (with advance notice)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2 text-primary" />
                Data Security & Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Security Measures</h4>
                <ul className="list-disc ml-6 space-y-1 text-gray-600">
                  <li>Encrypted data transmission (HTTPS)</li>
                  <li>Secure database storage with access controls</li>
                  <li>Regular security updates and monitoring</li>
                  <li>Limited employee access on a need-to-know basis</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Data Retention</h4>
                <ul className="list-disc ml-6 space-y-1 text-gray-600">
                  <li>Email addresses: Retained until you unsubscribe</li>
                  <li>Historical camera data: Retained indefinitely for historical analysis</li>
                  <li>Usage logs: Deleted after 90 days</li>
                  <li>Unsubscribed emails: Deleted within 30 days</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary" />
                Your Rights & Choices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">You Have the Right To:</h4>
                  <ul className="list-disc ml-6 space-y-1 text-gray-600">
                    <li>Access your personal information we have stored</li>
                    <li>Update or correct your information</li>
                    <li>Delete your account and associated data</li>
                    <li>Opt out of email notifications at any time</li>
                    <li>Export your data in a portable format</li>
                    <li>Object to certain processing of your data</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Easy Unsubscribe</h4>
                  <p className="text-blue-700">
                    Every email we send includes an unsubscribe link. You can also manage your subscription 
                    preferences directly on our website at any time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                Cookies & Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-600">
                Our website uses minimal cookies and tracking:
              </p>
              <ul className="list-disc ml-6 space-y-1 text-gray-600">
                <li>Essential cookies for website functionality</li>
                <li>Session cookies to remember your preferences</li>
                <li>No third-party advertising or tracking cookies</li>
                <li>Optional browser notifications (with your permission)</li>
              </ul>
              <p className="text-sm text-gray-500 italic">
                You can disable cookies in your browser settings, though some features may not work properly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                We may update this Privacy Policy from time to time to reflect changes in our practices or 
                for legal reasons. When we make changes:
              </p>
              <ul className="list-disc ml-6 space-y-1 text-gray-600">
                <li>We will update the "Last updated" date at the top of this page</li>
                <li>For significant changes, we will notify you via email</li>
                <li>Continued use of our service means you accept the updated policy</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                If you have any questions about this Privacy Policy or how we handle your data, please contact us:
              </p>
              <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                <p><strong>Email:</strong> privacy@davenportcameras.com</p>
                <p><strong>Subject Line:</strong> Privacy Policy Question</p>
                <p><strong>Response Time:</strong> We aim to respond within 48 hours</p>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                For general questions about camera locations, please visit the 
                <a href="https://www.davenportiowa.com/government/departments/police/automated_traffic_enforcement" 
                   target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                  official Davenport city website
                </a>.
              </p>
            </CardContent>
          </Card>

          <div className="text-center pt-8">
            <p className="text-sm text-gray-500">
              This privacy policy is effective as of {new Date().toLocaleDateString()} and applies to all 
              information collected by our camera location notification service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
