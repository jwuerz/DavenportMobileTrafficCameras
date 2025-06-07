import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CameraLocation {
  id: number;
  address: string;
  type: string;
  description: string;
  schedule: string;
  isActive: boolean;
  lastUpdated: string;
}

interface Stats {
  subscribers: number;
  locationsMonitored: number;
  lastUpdate: string;
}

export default function CurrentLocations() {
  const { toast } = useToast();

  const { data: locations, isLoading: locationsLoading, refetch: refetchLocations } = useQuery<CameraLocation[]>({
    queryKey: ["/api/camera-locations"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const handleRefresh = async () => {
    try {
      await apiRequest("POST", "/api/refresh-locations");
      await refetchLocations();
      toast({
        title: "Locations Updated",
        description: "Camera locations have been refreshed successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh camera locations. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "red_light":
        return "bg-red-500";
      case "fixed":
        return "bg-green-600";
      case "mobile":
      default:
        return "bg-orange-600";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "red_light":
        return "Red Light";
      case "fixed":
        return "Fixed";
      case "mobile":
      default:
        return "Mobile";
    }
  };

  const formatLastUpdate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <section id="locations" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Current Camera Locations</h3>
          <p className="text-gray-600 mb-6">Updated from City of Davenport official website</p>
          
          {/* Stats Bar */}
          <div className="inline-flex items-center bg-green-600 text-white px-4 py-2 rounded-full text-sm mb-6">
            <div className="w-2 h-2 bg-white rounded-full mr-2 notification-badge" />
            {statsLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <span>
                Last updated: {stats?.lastUpdate ? formatLastUpdate(stats.lastUpdate) : "Never"}
              </span>
            )}
          </div>

          {/* Statistics */}
          {!statsLoading && stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              <div className="stats-card rounded-lg p-4">
                <div className="text-2xl font-bold text-primary">{stats.subscribers}</div>
                <p className="text-sm text-gray-600">Active Subscribers</p>
              </div>
              <div className="stats-card rounded-lg p-4">
                <div className="text-2xl font-bold text-primary">{stats.locationsMonitored}</div>
                <p className="text-sm text-gray-600">Locations Monitored</p>
              </div>
              <div className="stats-card rounded-lg p-4">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="text-primary border-primary hover:bg-primary hover:text-white"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Locations Grid */}
        {locationsLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="camera-card">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : locations && locations.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {locations.map((location) => (
              <Card key={location.id} className="camera-card border-l-4" style={{ borderLeftColor: getTypeColor(location.type).replace('bg-', '#') }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {location.address}
                    </CardTitle>
                    <Badge className={`${getTypeColor(location.type)} text-white text-xs`}>
                      {getTypeLabel(location.type)}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm">{location.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>{location.schedule}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-gray-600 text-lg mb-4">No camera locations found</p>
              <p className="text-gray-500 text-sm">
                Camera locations will appear here once they are detected from the city website.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Button variant="outline" asChild>
            <a
              href="https://www.davenportiowa.com/government/departments/police/automated_traffic_enforcement"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Official City Website
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
