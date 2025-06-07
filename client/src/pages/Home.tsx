import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import CurrentLocations from "@/components/CurrentLocations";
import EmailSubscription from "@/components/EmailSubscription";
import SubscriptionManagement from "@/components/SubscriptionManagement";
import Footer from "@/components/Footer";

export default function Home() {
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
