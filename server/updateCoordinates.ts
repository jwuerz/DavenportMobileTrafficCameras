import { storage } from './storage';
import { geocodingService } from './geocoding';

export async function updateDeploymentCoordinates(): Promise<void> {
  console.log('Starting coordinate update for existing deployments...');
  
  try {
    // Get all deployments without coordinates
    const deployments = await storage.getAllCameraDeployments();
    const deploymentsNeedingCoords = deployments.filter(d => !d.latitude || !d.longitude);
    
    console.log(`Found ${deploymentsNeedingCoords.length} deployments needing coordinates`);
    
    for (const deployment of deploymentsNeedingCoords) {
      console.log(`Updating coordinates for: ${deployment.address}`);
      
      // Get coordinates using our improved geocoding service
      const geocodeResult = await geocodingService.geocodeAddress(deployment.address);
      
      if (geocodeResult) {
        // Update the deployment with coordinates
        await storage.updateCameraDeployment(deployment.id, {
          latitude: geocodeResult.latitude.toString(),
          longitude: geocodeResult.longitude.toString()
        });
        
        console.log(`Updated ${deployment.address} with coordinates: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
      }
    }
    
    console.log('Coordinate update completed');
  } catch (error) {
    console.error('Error updating coordinates:', error);
  }
}