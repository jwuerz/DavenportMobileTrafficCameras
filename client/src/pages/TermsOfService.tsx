
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, ExternalLink, FileText, Scale, Clock } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Scale className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Please read these terms carefully before using our service.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Agreement to Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                By accessing and using Davenport Camera Alerts ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-semibold mb-2">Important Notice:</p>
                <p className="text-blue-700">
                  This is an independent, unofficial service. We are not affiliated with, endorsed by, or connected to the City of Davenport, Iowa.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ExternalLink className="h-5 w-5 mr-2 text-primary" />
                Data Source & Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Data Source</h4>
                <p className="text-gray-600 mb-2">
                  All camera location information is sourced from the official City of Davenport website. We do not create, modify, or verify this data.
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">No Warranty of Accuracy</h4>
                <ul className="list-disc ml-6 space-y-1 text-yellow-700">
                  <li>Camera locations and schedules may change without notice</li>
                  <li>We cannot guarantee the accuracy, completeness, or timeliness of information</li>
                  <li>Always refer to the official city website for the most current information</li>
                  <li>Use this service as a supplementary tool, not the sole source of information</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-primary" />
                Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Important Disclaimer</h4>
                <p className="text-red-700 mb-2">
                  <strong>You use this service entirely at your own risk.</strong> We shall not be liable for:
                </p>
                <ul className="list-disc ml-6 space-y-1 text-red-700">
                  <li>Traffic tickets or fines received</li>
                  <li>Inaccurate or outdated camera location information</li>
                  <li>Service interruptions or technical failures</li>
                  <li>Any direct, indirect, incidental, or consequential damages</li>
                  <li>Loss of time, money, or other damages arising from use of this service</li>
                </ul>
              </div>
              <p className="text-gray-600">
                <strong>Maximum Liability:</strong> Our total liability to you for any and all claims shall not exceed the amount you paid to use this service (which is currently $0).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">By using our service, you agree to:</p>
              <ul className="list-disc ml-6 space-y-2 text-gray-600">
                <li><strong>Drive Safely:</strong> Always obey traffic laws and posted speed limits</li>
                <li><strong>Verify Information:</strong> Check the official city website for current information</li>
                <li><strong>Use Responsibly:</strong> Do not rely solely on our notifications</li>
                <li><strong>Respect the Service:</strong> Do not abuse, hack, or misuse our platform</li>
                <li><strong>Provide Accurate Information:</strong> Give us valid contact information</li>
                <li><strong>Comply with Laws:</strong> Use the service in accordance with all applicable laws</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                We strive to provide reliable service, but we do not guarantee:
              </p>
              <ul className="list-disc ml-6 space-y-1 text-gray-600 mb-4">
                <li>Uninterrupted or error-free service</li>
                <li>That the service will meet your specific requirements</li>
                <li>The accuracy or reliability of any information obtained through the service</li>
                <li>That defects will be corrected</li>
              </ul>
              <p className="text-gray-600">
                We reserve the right to modify, suspend, or discontinue the service at any time without notice.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-600">
                  <strong>Camera Location Data:</strong> All camera location information is public data owned by the City of Davenport, Iowa. We claim no ownership of this data.
                </p>
                <p className="text-gray-600">
                  <strong>Service Content:</strong> The design, software, and presentation of our service are protected by copyright and other intellectual property laws.
                </p>
                <p className="text-gray-600">
                  <strong>User Content:</strong> You retain ownership of any content you provide (such as your email address), but grant us permission to use it to provide the service.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-primary" />
                Termination
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-600">
                  <strong>By You:</strong> You may stop using our service at any time by unsubscribing from notifications.
                </p>
                <p className="text-gray-600">
                  <strong>By Us:</strong> We may terminate or suspend your access immediately, without prior notice, for any reason, including if you breach these Terms.
                </p>
                <p className="text-gray-600">
                  Upon termination, your right to use the service ceases immediately, and we may delete your information.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Governing Law</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                These Terms shall be interpreted and governed by the laws of the State of Iowa, United States, without regard to conflict of law provisions.
              </p>
              <p className="text-gray-600">
                Any disputes arising from these Terms or your use of the service shall be resolved in the appropriate courts of Iowa.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                We reserve the right to modify these terms at any time. When we make changes:
              </p>
              <ul className="list-disc ml-6 space-y-1 text-gray-600 mb-4">
                <li>We will update the "Last updated" date</li>
                <li>For material changes, we will notify you via email</li>
                <li>Continued use of the service constitutes acceptance of new terms</li>
                <li>If you disagree with changes, you must stop using the service</li>
              </ul>
            </CardContent>
          </Card>

          <div className="text-center pt-8">
            <p className="text-sm text-gray-500">
              By using Davenport Camera Alerts, you acknowledge that you have read, understood, 
              and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
