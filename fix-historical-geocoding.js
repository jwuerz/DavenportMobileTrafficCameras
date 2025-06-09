import { geocodingService } from './server/geocoding.js';
import { storage } from './server/storage.js';

async function fixHistoricalGeocoding() {
  console.log('Fixing geocoding for historical deployments...');
  
  // Get all historical deployments (inactive)
  const historicalDeployments = await storage.getHistoricalDeployments();
  console.log(`Found ${historicalDeployments.length} historical deployments to check`);
  
  let fixed = 0;
  let verified = 0;
  
  for (const deployment of historicalDeployments) {
    console.log(`\nChecking: ${deployment.address}`);
    console.log(`Current coordinates: ${deployment.latitude}, ${deployment.longitude}`);
    
    // Re-geocode with improved Davenport-specific query
    const newResult = await geocodingService.geocodeAddress(deployment.address);
    
    if (newResult) {
      const latDiff = Math.abs(parseFloat(deployment.latitude) - newResult.latitude);
      const lonDiff = Math.abs(parseFloat(deployment.longitude) - newResult.longitude);
      
      // If coordinates differ significantly (more than 0.01 degrees ≈ 1km)
      if (latDiff > 0.01 || lonDiff > 0.01) {
        console.log(`❌ Significant difference detected!`);
        console.log(`  Old: ${deployment.latitude}, ${deployment.longitude}`);
        console.log(`  New: ${newResult.latitude}, ${newResult.longitude}`);
        console.log(`  Formatted address: ${newResult.formattedAddress}`);
        
        // Update the deployment with corrected coordinates
        await storage.updateCameraDeployment(deployment.id, {
          latitude: newResult.latitude.toString(),
          longitude: newResult.longitude.toString()
        });
        
        console.log(`✅ Updated coordinates for: ${deployment.address}`);
        fixed++;
      } else {
        console.log(`✅ Coordinates verified as accurate`);
        verified++;
      }
    } else {
      console.log(`⚠️  Could not re-geocode: ${deployment.address}`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n=== GEOCODING FIX COMPLETE ===`);
  console.log(`Fixed: ${fixed} deployments`);
  console.log(`Verified: ${verified} deployments`);
  console.log(`Total processed: ${historicalDeployments.length} deployments`);
}

// Run the fix
fixHistoricalGeocoding().catch(console.error);