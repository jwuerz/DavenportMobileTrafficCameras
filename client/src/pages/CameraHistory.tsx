
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Camera, MapPin, Clock, TrendingUp, BarChart3 } from "lucide-react";
import { format } from "date-fns";

interface CameraDeployment {
  id: number;
  address: string;
  type: string;
  description: string;
  schedule: string;
  latitude?: string;
  longitude?: string;
  startDate: string;
  endDate?: string;
  weekOfYear?: string;
  scrapedAt: string;
  isActive: boolean;
}

interface StationaryCamera {
  id: number;
  address: string;
  type: string;
  description: string;
  schedule: string;
  installDate?: string;
  status: string;
  isActive: boolean;
  createdAt: string;
}

interface DeploymentStats {
  totalDeployments: number;
  uniqueLocations: number;
  averageDeploymentDuration: number;
  mostFrequentLocation: string;
}

export default function CameraHistory() {
  const [activeTab, setActiveTab] = useState("mobile-historical");

  const { data: allDeployments = [] } = useQuery<CameraDeployment[]>({
    queryKey: ['/api/deployments']
  });

  const { data: stationaryCameras = [] } = useQuery<StationaryCamera[]>({
    queryKey: ['/api/stationary-cameras']
  });

  // Filter for mobile cameras only (existing deployments)
  const mobileDeployments = allDeployments.filter(d => d.type === 'mobile');

  // Combine mobile and stationary for the comprehensive view
  const allCameraHistory = [
    ...allDeployments,
    ...stationaryCameras.map(camera => ({
      id: camera.id,
      address: camera.address,
      type: camera.type,
      description: camera.description,
      schedule: camera.schedule,
      startDate: camera.createdAt,
      endDate: camera.isActive ? undefined : camera.createdAt,
      isActive: camera.isActive,
      scrapedAt: camera.createdAt,
      weekOfYear: undefined,
      latitude: undefined,
      longitude: undefined
    }))
  ];

  const stats: DeploymentStats = {
    totalDeployments: mobileDeployments.length,
    uniqueLocations: new Set(mobileDeployments.map(d => d.address)).size,
    averageDeploymentDuration: calculateAverageDuration(mobileDeployments),
    mostFrequentLocation: getMostFrequentLocation(mobileDeployments)
  };

  const comprehensiveStats = {
    totalDeployments: allCameraHistory.length,
    uniqueLocations: new Set(allCameraHistory.map(d => d.address)).size,
    mobileCount: mobileDeployments.length,
    stationaryCount: stationaryCameras.length
  };

  function calculateAverageDuration(deployments: CameraDeployment[]): number {
    const completedDeployments = deployments.filter(d => d.endDate);
    if (completedDeployments.length === 0) return 0;
    
    const totalDays = completedDeployments.reduce((sum, deployment) => {
      const start = new Date(deployment.startDate);
      const end = new Date(deployment.endDate!);
      const days = Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    
    return Math.round(totalDays / completedDeployments.length);
  }

  function getMostFrequentLocation(deployments: CameraDeployment[]): string {
    const locationCounts = deployments.reduce((acc, deployment) => {
      acc[deployment.address] = (acc[deployment.address] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const [mostFrequent] = Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a);
    
    return mostFrequent?.[0] || 'No data';
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mobile': return 'bg-blue-600';
      case 'red_light': return 'bg-red-600';
      case 'fixed': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mobile': return 'Mobile';
      case 'red_light': return 'Red Light';
      case 'fixed': return 'Fixed';
      default: return type;
    }
  };

  const recentMobileDeployments = mobileDeployments
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 5);

  const recentAllHistory = allCameraHistory
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 10);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Camera Location History</h1>
        <p className="text-muted-foreground">
          Track historical camera placements and deployment patterns across Davenport
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mobile-historical">Historical Locations of Mobile Cameras</TabsTrigger>
          <TabsTrigger value="comprehensive">Historical Locations of Mobile and Stationary Cameras</TabsTrigger>
        </TabsList>

        <TabsContent value="mobile-historical" className="space-y-6">
          {/* Mobile Camera Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Mobile Deployments</CardTitle>
                <Camera className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDeployments}</div>
                <p className="text-xs text-muted-foreground">
                  All recorded mobile camera deployments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Mobile Locations</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueLocations}</div>
                <p className="text-xs text-muted-foreground">
                  Different addresses used for mobile cameras
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Deployment Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageDeploymentDuration}</div>
                <p className="text-xs text-muted-foreground">
                  Days per mobile deployment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Frequent Mobile Location</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold leading-tight">{stats.mostFrequentLocation}</div>
                <p className="text-xs text-muted-foreground">
                  Most deployed mobile location
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Mobile Deployments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Mobile Camera Deployments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMobileDeployments.map((deployment) => (
                  <div key={deployment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{deployment.address}</h4>
                        <Badge className={`${getTypeColor(deployment.type)} text-white text-xs`}>
                          {getTypeLabel(deployment.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{deployment.description}</p>
                      <p className="text-xs text-muted-foreground">{deployment.schedule}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm font-medium">
                        {format(new Date(deployment.startDate), 'MMM dd, yyyy')}
                      </div>
                      {deployment.endDate && (
                        <div className="text-xs text-muted-foreground">
                          Ended: {format(new Date(deployment.endDate), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-6">
          {/* Comprehensive Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Camera Records</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{comprehensiveStats.totalDeployments}</div>
                <p className="text-xs text-muted-foreground">
                  All mobile and stationary cameras
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mobile Cameras</CardTitle>
                <Camera className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{comprehensiveStats.mobileCount}</div>
                <p className="text-xs text-muted-foreground">
                  Mobile deployment records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stationary Cameras</CardTitle>
                <Camera className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{comprehensiveStats.stationaryCount}</div>
                <p className="text-xs text-muted-foreground">
                  Fixed and red light cameras
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Locations</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{comprehensiveStats.uniqueLocations}</div>
                <p className="text-xs text-muted-foreground">
                  All camera locations combined
                </p>
              </CardContent>
            </Card>
          </div>

          {/* All Camera History */}
          <Card>
            <CardHeader>
              <CardTitle>All Camera History (Mobile and Stationary)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAllHistory.map((camera) => (
                  <div key={`${camera.type}-${camera.id}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{camera.address}</h4>
                        <Badge className={`${getTypeColor(camera.type)} text-white text-xs`}>
                          {getTypeLabel(camera.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{camera.description}</p>
                      <p className="text-xs text-muted-foreground">{camera.schedule}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm font-medium">
                        {format(new Date(camera.startDate), 'MMM dd, yyyy')}
                      </div>
                      {camera.endDate && (
                        <div className="text-xs text-muted-foreground">
                          Ended: {format(new Date(camera.endDate), 'MMM dd, yyyy')}
                        </div>
                      )}
                      {!camera.isActive && camera.type !== 'mobile' && (
                        <div className="text-xs text-red-600">Inactive</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
