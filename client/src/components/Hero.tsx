import { Button } from "@/components/ui/button";
import { Bell, MapPin } from "lucide-react";

export default function Hero() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="hero-gradient text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Stay Ahead of Traffic Cameras
        </h2>
        <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
          Get instant notifications when Davenport's mobile traffic camera locations change. 
          Avoid tickets and drive with confidence.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => scrollToSection("subscribe")}
            size="lg"
            className="bg-white text-primary hover:bg-gray-100 shadow-lg"
          >
            <Bell className="mr-2 h-5 w-5" />
            Get Notifications
          </Button>
          <Button
            onClick={() => scrollToSection("locations")}
            variant="outline"
            size="lg"
            className="border-2 border-white text-white hover:bg-white hover:text-primary"
          >
            <MapPin className="mr-2 h-5 w-5" />
            View Current Locations
          </Button>
        </div>
      </div>
    </section>
  );
}
