import { useState } from "react";
import { Menu, X, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Video className="text-primary text-2xl" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Davenport Camera Alerts</h1>
              <p className="text-sm text-gray-500 hidden sm:block">Stay informed, avoid tickets</p>
            </div>
          </div>
          
          <nav className="hidden md:flex space-x-6">
            <button
              onClick={() => scrollToSection("locations")}
              className="text-gray-700 hover:text-primary transition-colors"
            >
              Camera Locations
            </button>
            <button
              onClick={() => scrollToSection("subscribe")}
              className="text-gray-700 hover:text-primary transition-colors"
            >
              Subscribe
            </button>
            <button
              onClick={() => scrollToSection("manage")}
              className="text-gray-700 hover:text-primary transition-colors"
            >
              Manage Subscription
            </button>
          </nav>
          
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-4">
              <button
                onClick={() => scrollToSection("locations")}
                className="text-gray-700 hover:text-primary transition-colors text-left"
              >
                Camera Locations
              </button>
              <button
                onClick={() => scrollToSection("subscribe")}
                className="text-gray-700 hover:text-primary transition-colors text-left"
              >
                Subscribe
              </button>
              <button
                onClick={() => scrollToSection("manage")}
                className="text-gray-700 hover:text-primary transition-colors text-left"
              >
                Manage Subscription
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
