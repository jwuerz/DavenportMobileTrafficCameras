import { Video, Mail, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <Video className="h-8 w-8 mr-3" />
              <h4 className="text-xl font-semibold">Davenport Camera Alerts</h4>
            </div>
            <p className="text-gray-300 mb-4">
              Helping Davenport drivers stay informed about traffic camera locations 
              to promote safe driving and avoid unnecessary tickets.
            </p>
            <div className="text-sm text-gray-400">
              <p>This is an independent service not affiliated with the City of Davenport.</p>
            </div>
          </div>

          <div>
            <h5 className="font-semibold mb-4">Quick Links</h5>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="#locations" className="hover:text-white transition-colors">
                  Current Locations
                </a>
              </li>
              <li>
                <a href="/history" className="hover:text-white transition-colors">
                  History Map
                </a>
              </li>
              <li>
                <a href="#subscribe" className="hover:text-white transition-colors">
                  Subscribe
                </a>
              </li>
              <li>
                <a href="#manage" className="hover:text-white transition-colors">
                  Manage Subscription
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold mb-4">Contact & Legal</h5>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="#terms" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="mailto:support@cameraalerts.com" className="hover:text-white transition-colors inline-flex items-center">
                  <Mail className="mr-1 h-4 w-4" />
                  Support
                </a>
              </li>
              <li>
                <a 
                  href="https://www.davenportiowa.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center"
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Official City Website
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Davenport Camera Alerts. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}