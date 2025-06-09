import { geocodingService } from './server/geocoding.js';
import { storage } from './server/storage.js';

async function fixHistoricalGeocoding() {
  try {
    console.log('Fixing geocoding for historical deployments...');
    
    // Get all inactive deployments with incorrect coordinates
    const historicalDeployments = await storage.getHistoricalDeployments();
    
    for (const deployment of historicalDeployments) {
      console.log(`Geocoding: ${deployment.address}`);
      
      const geocodeResult = await geocodingService.geocodeAddress(deployment.address);
      
      if (geocodeResult) {
        await storage.updateCameraDeployment(deployment.id, {
          latitude: geocodeResult.latitude?.toString(),
          longitude: geocodeResult.longitude?.toString()
        });
        console.log(`Updated ${deployment.address}: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
      } else {
        console.log(`Failed to geocode: ${deployment.address}`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Historical geocoding fix completed');
  } catch (error) {
    console.error('Error fixing historical geocoding:', error);
  }
}

fixHistoricalGeocoding();