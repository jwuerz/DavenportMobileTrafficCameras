import { AlertCircle, Clock, Shield, Smartphone } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: AlertCircle,
      title: "Real-Time Updates",
      description: "Get notified within minutes when camera locations change on the city website.",
      iconColor: "text-blue-600",
      bgColor: "bg-blue-600/10"
    },
    {
      icon: Shield,
      title: "Avoid Tickets",
      description: "Stay informed about mobile camera locations to drive safely and avoid costly tickets.",
      iconColor: "text-green-600",
      bgColor: "bg-green-600/10"
    },
    {
      icon: Smartphone,
      title: "Mobile Friendly",
      description: "Access current locations and manage notifications from any device, anywhere.",
      iconColor: "text-orange-600",
      bgColor: "bg-orange-600/10"
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How does it work?
        </h3>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div key={index} className="text-center">
                <div className={`${feature.bgColor} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <IconComponent className={`${feature.iconColor} h-8 w-8`} />
                </div>
                <h4 className="text-xl font-semibold mb-3">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
