import { useEffect } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import CurrentLocations from "@/components/CurrentLocations";
import EmailSubscription from "@/components/EmailSubscription";
import SubscriptionManagement from "@/components/SubscriptionManagement";
import Footer from "@/components/Footer";

export default function Home() {
  useEffect(() => {
    // Handle hash navigation when page loads
    const hash = window.location.hash;
    if (hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        // Use setTimeout to ensure the page has fully loaded
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Features />
      <CurrentLocations />
      <EmailSubscription />
      <SubscriptionManagement />
      <Footer />
    </div>
  );
}
