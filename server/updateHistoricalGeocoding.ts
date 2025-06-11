
import { storage } from './storage';
import { geocodingService } from './geocoding';

interface UpdateResult {
  total: number;
  updated: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export async function updateHistoricalDeploymentGeocoding(): Promise<UpdateResult> {
  console.log('Starting historical deployment geocoding update...');
  
  const result: UpdateResult = {
    total: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Get all deployments
    const allDeployments = await storage.getAllCameraDeployments();
    const currentDeployments = await storage.getCurrentDeployments();
    
    // Create a set of current deployment IDs to exclude them
    const currentDeploymentIds = new Set(currentDeployments.map(d => d.id));
    
    // Filter to only historical (inactive) deployments
    const historicalDeployments = allDeployments.filter(deployment => 
      !currentDeploymentIds.has(deployment.id)
    );
    
    result.total = historicalDeployments.length;
    console.log(`Found ${result.total} historical deployments to process`);
    
    if (result.total === 0) {
      console.log('No historical deployments found to update');
      return result;
    }

    // Process each historical deployment
    for (const deployment of historicalDeployments) {
      try {
        console.log(`Processing deployment ${deployment.id}: ${deployment.address}`);
        
        // Check if deployment already has valid coordinates
        const hasValidCoords = deployment.latitude && 
                              deployment.longitude && 
                              !isNaN(parseFloat(deployment.latitude)) && 
                              !isNaN(parseFloat(deployment.longitude));
        
        // Always try to get fresh geocoding for better accuracy
        console.log(`Geocoding address: ${deployment.address}`);
        const geocodeResult = await geocodingService.geocodeAddress(deployment.address);
        
        if (geocodeResult) {
          // Update the deployment with new coordinates
          await storage.updateCameraDeployment(deployment.id, {
            latitude: geocodeResult.latitude.toString(),
            longitude: geocodeResult.longitude.toString()
          });
          
          result.updated++;
          console.log(`✅ Updated ${deployment.address} with coordinates: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
          
          if (hasValidCoords) {
            console.log(`   (Previous coords: ${deployment.latitude}, ${deployment.longitude})`);
          }
        } else {
          result.failed++;
          const errorMsg = `Failed to geocode: ${deployment.address}`;
          result.errors.push(errorMsg);
          console.log(`❌ ${errorMsg}`);
        }
        
        // Add delay between requests to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 250)); // 250ms delay
        
      } catch (error) {
        result.failed++;
        const errorMsg = `Error processing deployment ${deployment.id} (${deployment.address}): ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('HISTORICAL GEOCODING UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total historical deployments: ${result.total}`);
    console.log(`Successfully updated: ${result.updated}`);
    console.log(`Failed to update: ${result.failed}`);
    console.log(`Success rate: ${result.total > 0 ? ((result.updated / result.total) * 100).toFixed(1) : 0}%`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (result.updated > 0) {
      console.log('\n✅ Historical geocoding update completed successfully!');
      console.log('The historical camera locations map should now show more accurate coordinates.');
    }
    
    return result;
    
  } catch (error) {
    console.error('Error updating historical deployment geocoding:', error);
    throw error;
  }
}

// Allow running this script directly
if (require.main === module) {
  updateHistoricalDeploymentGeocoding()
    .then(result => {
      console.log('\nUpdate completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Update failed:', error);
      process.exit(1);
    });
}
