import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

interface StationaryCamera {
  id: number;
  address: string;
  type: string;
  description: string;
  schedule: string;
  latitude: string | null;
  longitude: string | null;
  installDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Custom marker colors for different deployment statuses
const createCustomMarker = (color: string) => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path fill="${color}" stroke="#000" stroke-width="1" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 7.5 12.5 28.5 12.5 28.5s12.5-21 12.5-28.5C25 5.6 19.4 0 12.5 0z"/>
        <circle fill="#fff" cx="12.5" cy="12.5" r="7"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

const currentMarker = createCustomMarker('#ef4444'); // Red for current
const historicalMarker = createCustomMarker('#6b7280'); // Gray for historical
const stationaryMarker = createCustomMarker('#ea580c'); // Orange for stationary cameras

// Davenport, Iowa coordinates
const DAVENPORT_CENTER: [number, number] = [41.5236, -90.5776];

function MapUpdater({ deployments }: { deployments: CameraDeployment[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (deployments.length > 0) {
      const validDeployments = deployments.filter(d => d.latitude && d.longitude);
      if (validDeployments.length > 0) {
        const bounds = validDeployments.map(d => [
          parseFloat(d.latitude!), 
          parseFloat(d.longitude!)
        ] as [number, number]);
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [deployments, map]);

  return null;
}

export default function CameraMap() {
  const isMobile = useIsMobile();
  const [selectedTab, setSelectedTab] = useState('current');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  // Fetch current deployments
  const { data: currentDeployments = [], isLoading: currentLoading } = useQuery({
    queryKey: ['deployments', 'current'],
    queryFn: () => fetch('/api/deployments/current').then(res => res.json()),
    enabled: selectedTab === 'current'
  });

  // Fetch historical deployments
  const { data: historicalDeployments = [], isLoading: historicalLoading } = useQuery({
    queryKey: ['deployments', 'historical'],
    queryFn: () => fetch('/api/deployments/historical').then(res => res.json()),
    enabled: selectedTab === 'historical'
  });

  // Fetch deployments by date range
  const { data: rangeDeployments = [], isLoading: rangeLoading } = useQuery({
    queryKey: ['deployments', 'range', dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    enabled: selectedTab === 'range' && !!dateRange.from && !!dateRange.to,
    queryFn: async () => {
      if (!dateRange.from || !dateRange.to) return [];
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      const response = await fetch(`/api/deployments/range?startDate=${startDate}&endDate=${endDate}`);
      return response.json();
    }
  });

  // Fetch stationary cameras (for historical view)
  const { data: stationaryCameras = [], isLoading: stationaryLoading } = useQuery<StationaryCamera[]>({
    queryKey: ['stationary-cameras'],
    queryFn: () => fetch('/api/stationary-cameras').then(res => res.json()),
    enabled: selectedTab === 'historical'
  });

  const getDisplayData = () => {
    switch (selectedTab) {
      case 'current':
        return { deployments: currentDeployments, loading: currentLoading, stationary: [] };
      case 'historical':
        return { deployments: historicalDeployments, loading: historicalLoading || stationaryLoading, stationary: stationaryCameras };
      case 'range':
        return { deployments: rangeDeployments, loading: rangeLoading, stationary: [] };
      default:
        return { deployments: [], loading: false, stationary: [] };
    }
  };

  const { deployments, loading, stationary } = getDisplayData();

  const validDeployments = deployments.filter((d: CameraDeployment) => 
    d.latitude && d.longitude && !isNaN(parseFloat(d.latitude)) && !isNaN(parseFloat(d.longitude))
  );

  const validStationaryCameras = stationary.filter((s: StationaryCamera) => 
    s.latitude && s.longitude && !isNaN(parseFloat(s.latitude)) && !isNaN(parseFloat(s.longitude))
  );

  const getMarkerIcon = (deployment: CameraDeployment) => {
    if (selectedTab === 'historical') {
      return deployment.isActive ? currentMarker : historicalMarker;
    }
    return currentMarker;
  };

  const getStationaryMarkerIcon = (camera: StationaryCamera) => {
    return stationaryMarker;
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mobile': return 'bg-blue-500';
      case 'red_light': return 'bg-red-500';
      case 'fixed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Camera Location History Map</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <TabsTrigger value="current">{isMobile ? 'Current Mobile' : 'Current Mobile Camera Locations'}</TabsTrigger>
              <TabsTrigger value="historical">{isMobile ? 'Historical' : 'Total Historical Camera Locations'}</TabsTrigger>
              {!isMobile && <TabsTrigger value="range">Date Range</TabsTrigger>}
            </TabsList>
            
            {isMobile && (
              <div className="flex gap-2">
                <Button
                  variant={selectedTab === 'range' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTab('range')}
                  className="flex-1"
                >
                  Date Range
                </Button>
              </div>
            )}

            {selectedTab === 'range' && (
              <div className={`flex gap-4 items-center ${isMobile ? 'flex-col' : 'flex-row'}`}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`${isMobile ? 'w-full' : 'w-[240px]'} justify-start text-left font-normal`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, isMobile ? "MMM d, yyyy" : "PPP") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`${isMobile ? 'w-full' : 'w-[240px]'} justify-start text-left font-normal`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, isMobile ? "MMM d, yyyy" : "PPP") : "Pick end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <TabsContent value={selectedTab} className="space-y-4">
              <div className={`${isMobile ? 'h-[400px]' : 'h-[600px]'} w-full rounded-lg overflow-hidden border`}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p>Loading camera locations...</p>
                    </div>
                  </div>
                ) : (
                  <MapContainer
                    center={DAVENPORT_CENTER}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapUpdater deployments={validDeployments} />
                    
                    {validDeployments.map((deployment: CameraDeployment) => (
                      <Marker
                        key={`deployment-${deployment.id}-${deployment.startDate}`}
                        position={[parseFloat(deployment.latitude!), parseFloat(deployment.longitude!)]}
                        icon={getMarkerIcon(deployment)}
                      >
                        <Popup>
                          <div className="space-y-2">
                            <h3 className="font-semibold">{deployment.address}</h3>
                            <div className="flex gap-2">
                              <Badge className={getTypeColor(deployment.type)}>
                                {deployment.type.replace('_', ' ')}
                              </Badge>
                              <Badge variant={deployment.isActive ? "default" : "secondary"}>
                                {deployment.isActive ? 'Current' : 'Historical'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{deployment.description}</p>
                            <p className="text-sm"><strong>Schedule:</strong> {deployment.schedule}</p>
                            <div className="text-xs text-gray-500">
                              <p><strong>Start:</strong> {deployment.startDate}</p>
                              {deployment.endDate && <p><strong>End:</strong> {deployment.endDate}</p>}
                              {deployment.weekOfYear && <p><strong>Week:</strong> {deployment.weekOfYear}</p>}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {validStationaryCameras.map((camera: StationaryCamera) => (
                      <Marker
                        key={`stationary-${camera.id}`}
                        position={[parseFloat(camera.latitude!), parseFloat(camera.longitude!)]}
                        icon={getStationaryMarkerIcon(camera)}
                      >
                        <Popup>
                          <div className="space-y-2">
                            <h3 className="font-semibold">{camera.address}</h3>
                            <div className="flex gap-2">
                              <Badge className="bg-orange-600 text-white">
                                {camera.type.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline">
                                Stationary
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{camera.description}</p>
                            <p className="text-sm"><strong>Schedule:</strong> {camera.schedule}</p>
                            <div className="text-xs text-gray-500">
                              <p><strong>Status:</strong> {camera.status}</p>
                              {camera.installDate && <p><strong>Installed:</strong> {camera.installDate}</p>}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {validDeployments.length + (selectedTab === 'historical' ? validStationaryCameras.length : 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedTab === 'current' ? 'Active Locations' : 'Total Camera Locations'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {validDeployments.filter((d: CameraDeployment) => d.type === 'mobile').length}
                    </div>
                    <p className="text-xs text-muted-foreground">Mobile Cameras</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {selectedTab === 'historical' ? validStationaryCameras.length : deployments.filter((d: CameraDeployment) => !d.latitude || !d.longitude).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedTab === 'historical' ? 'Red Light Cameras' : 'Locations Without Coordinates'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {selectedTab === 'historical' && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span>Current Mobile Camera Locations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                    <span>Historical Mobile Camera Locations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-600 rounded-full"></div>
                    <span>Red Light Cameras (Stationary)</span>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}