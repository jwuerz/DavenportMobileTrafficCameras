import CameraMap from '@/components/CameraMap';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Camera } from 'lucide-react';

interface CameraDeployment {
  id: number;
  address: string;
  type: string;
  description: string;
  schedule: string;
  latitude: string | null;
  longitude: string | null;
  startDate: string;
  endDate: string | null;
  weekOfYear: string | null;
  isActive: boolean;
}

interface DeploymentStats {
  totalDeployments: number;
  uniqueLocations: number;
  averageDeploymentDuration: number;
  mostFrequentLocation: string;
}

export default function CameraHistory() {
  const { data: allDeployments = [] } = useQuery<CameraDeployment[]>({
    queryKey: ['/api/deployments']
  });

  const stats: DeploymentStats = {
    totalDeployments: allDeployments.length,
    uniqueLocations: new Set(allDeployments.map(d => d.address)).size,
    averageDeploymentDuration: calculateAverageDuration(allDeployments),
    mostFrequentLocation: getMostFrequentLocation(allDeployments)
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

  const recentDeployments = allDeployments
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 5);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Camera Location History Map for Mobile and Stationary Cameras</h1>
        <p className="text-muted-foreground">
          Track historical camera placements and deployment patterns across Davenport
        </p>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deployments</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeployments}</div>
            <p className="text-xs text-muted-foreground">
              All recorded camera deployments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueLocations}</div>
            <p className="text-xs text-muted-foreground">
              Different deployment sites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageDeploymentDuration}</div>
            <p className="text-xs text-muted-foreground">
              Days per deployment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Frequent</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-wrap">{stats.mostFrequentLocation.substring(0, 20)}{stats.mostFrequentLocation.length > 20 ? '...' : ''}</div>
            <p className="text-xs text-muted-foreground">
              Location with most deployments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Map */}
      <CameraMap />

      {/* Recent Deployments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDeployments.map((deployment) => (
              <div key={deployment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{deployment.address}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{deployment.type.replace('_', ' ')}</Badge>
                    <Badge variant={deployment.isActive ? "default" : "secondary"}>
                      {deployment.isActive ? 'Active' : 'Completed'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{deployment.schedule}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Started: {new Date(deployment.startDate).toLocaleDateString()}</p>
                  {deployment.endDate && (
                    <p>Ended: {new Date(deployment.endDate).toLocaleDateString()}</p>
                  )}
                  {deployment.weekOfYear && <p>Week: {deployment.weekOfYear}</p>}
                </div>
              </div>
            ))}
            {recentDeployments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No deployment history available</p>
                <p className="text-sm">Camera deployments will appear here once they are recorded</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}