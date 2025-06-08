import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, MapPin, Calendar, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface DeploymentAnalysis {
  totalDeployments: number;
  currentActiveDeployments: number;
  uniqueAddresses: number;
  duplicateAddresses: Array<{
    address: string;
    count: number;
    deployments: Array<{
      id: number;
      startDate: string;
      endDate: string | null;
      isActive: boolean;
      weekOfYear: string | null;
    }>;
  }>;
  missingCoordinates: Array<{
    id: number;
    address: string;
    startDate: string;
    latitude: string | null;
    longitude: string | null;
  }>;
  overlappingActive: Array<{
    address: string;
    activeDeployments: any[];
  }>;
  summary: {
    hasDuplicates: boolean;
    hasOverlappingActive: boolean;
    missingCoordinatesCount: number;
  };
}

export default function DeploymentAnalysis() {
  const { data: analysis, isLoading } = useQuery<DeploymentAnalysis>({
    queryKey: ['/api/deployments/analyze']
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const cleanupMutation = useMutation(
    () => fetch('/api/deployments/cleanup', { method: 'POST' }).then(res => res.json()),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/deployments/analyze'] });
        toast({
          title: "Cleanup Successful",
          description: "Duplicate deployments have been removed.",
        })
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Cleanup Failed",
          description: "Failed to remove duplicate deployments.",
        })
      }
    }
  );


  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Analyzing deployment data...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load deployment analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Deployment Analysis</h1>
          <p className="text-muted-foreground">
            Analyze camera deployment data for duplicates and configuration issues
          </p>
        </div>

        {analysis?.summary.hasDuplicates && (
          <Button 
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {cleanupMutation.isPending ? 'Cleaning...' : 'Clean Duplicates'}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deployments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalDeployments}</div>
            <p className="text-xs text-muted-foreground">All recorded deployments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Addresses</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.uniqueAddresses}</div>
            <p className="text-xs text-muted-foreground">Different locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.currentActiveDeployments}</div>
            <p className="text-xs text-muted-foreground">Active deployments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analysis.summary.hasDuplicates ? 1 : 0) + 
               (analysis.summary.hasOverlappingActive ? 1 : 0) + 
               (analysis.summary.missingCoordinatesCount > 0 ? 1 : 0)}
            </div>
            <p className="text-xs text-muted-foreground">Configuration issues</p>
          </CardContent>
        </Card>
      </div>

      {/* Duplicate Addresses */}
      {analysis.duplicateAddresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Duplicate Addresses ({analysis.duplicateAddresses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.duplicateAddresses.map((duplicate, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{duplicate.address}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {duplicate.count} deployments found
                  </p>
                  <div className="grid gap-2">
                    {duplicate.deployments.map((deployment) => (
                      <div key={deployment.id} className="flex items-center justify-between text-sm border-l-2 border-blue-200 pl-3">
                        <div>
                          <span className="font-medium">ID: {deployment.id}</span>
                          <span className="mx-2">•</span>
                          <span>Started: {new Date(deployment.startDate).toLocaleDateString()}</span>
                          {deployment.endDate && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Ended: {new Date(deployment.endDate).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={deployment.isActive ? "default" : "secondary"}>
                            {deployment.isActive ? 'Active' : 'Completed'}
                          </Badge>
                          {deployment.weekOfYear && (
                            <Badge variant="outline">{deployment.weekOfYear}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Coordinates */}
      {analysis.missingCoordinates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Missing Coordinates ({analysis.missingCoordinates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.missingCoordinates.map((deployment) => (
                <div key={deployment.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{deployment.address}</p>
                    <p className="text-sm text-muted-foreground">
                      ID: {deployment.id} • Started: {new Date(deployment.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Lat: {deployment.latitude || 'Missing'} • Lng: {deployment.longitude || 'Missing'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overlapping Active Deployments */}
      {analysis.overlappingActive.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Overlapping Active Deployments ({analysis.overlappingActive.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.overlappingActive.map((overlap, index) => (
                <div key={index} className="border rounded-lg p-4 bg-red-50">
                  <h4 className="font-semibold mb-2">{overlap.address}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {overlap.activeDeployments.length} active deployments (should be 1)
                  </p>
                  <div className="grid gap-2">
                    {overlap.activeDeployments.map((deployment) => (
                      <div key={deployment.id} className="text-sm border-l-2 border-red-300 pl-3">
                        ID: {deployment.id} • Started: {new Date(deployment.startDate).toLocaleDateString()}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Clear */}
      {analysis.duplicateAddresses.length === 0 && 
       analysis.missingCoordinates.length === 0 && 
       analysis.overlappingActive.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
            <p className="text-muted-foreground">
              All deployment data appears to be correctly configured
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}