import { storage } from "./storage";
import { geocodingService } from "./geocoding";
import type { InsertStationaryCamera } from "@shared/schema";

interface RedLightCameraData {
  address: string;
  type: string;
  description: string;
  schedule: string;
  status: 'active' | 'unconfirmed';
}

const redLightCameras: RedLightCameraData[] = [
  {
    address: "Harrison Street & 35th Street",
    type: "red_light",
    description: "Red light camera for southbound (SB) traffic.",
    schedule: "24/7",
    status: "active"
  },
  {
    address: "Brady Street & Kimberly Road",
    type: "red_light", 
    description: "Red light camera for northbound (NB) traffic.",
    schedule: "24/7",
    status: "active"
  },
  {
    address: "Kimberly Road & Brady Street",
    type: "red_light",
    description: "Red light camera for eastbound (EB) traffic.", 
    schedule: "24/7",
    status: "active"
  },
  {
    address: "Welcome Way & Kimberly Road",
    type: "red_light",
    description: "Red light camera for southbound (SB) traffic.",
    schedule: "24/7", 
    status: "active"
  },
  {
    address: "Locust Street & Lincoln Avenue",
    type: "red_light",
    description: "Red light camera for eastbound (EB) and westbound (WB) traffic.",
    schedule: "Not provided",
    status: "unconfirmed"
  }
];

export async function populateStationaryCameras(): Promise<void> {
  console.log('Starting to populate stationary cameras...');
  
  try {
    // Check if cameras already exist - only skip if we have all 5 cameras
    const existingCameras = await storage.getAllStationaryCameras();
    if (existingCameras.length >= 5) {
      console.log(`Found ${existingCameras.length} existing stationary cameras. All cameras already populated.`);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const cameraData of redLightCameras) {
      try {
        console.log(`Geocoding address: ${cameraData.address}`);
        
        // Geocode the address
        const geocodeResult = await geocodingService.geocodeAddress(cameraData.address);
        
        if (!geocodeResult) {
          console.warn(`Failed to geocode address: ${cameraData.address}`);
          errorCount++;
          continue;
        }

        console.log(`Geocoded ${cameraData.address}: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);

        // Prepare camera data for insertion
        const stationaryCamera: InsertStationaryCamera = {
          address: cameraData.address,
          type: cameraData.type,
          description: cameraData.description,
          schedule: cameraData.schedule,
          latitude: geocodeResult.latitude.toString(),
          longitude: geocodeResult.longitude.toString(),
          status: cameraData.status,
          installDate: null // No install date provided
        };

        // Insert the camera
        const createdCamera = await storage.createStationaryCamera(stationaryCamera);
        console.log(`Created stationary camera: ${createdCamera.address} (ID: ${createdCamera.id})`);
        successCount++;

        // Add delay between geocoding requests to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing camera ${cameraData.address}:`, error);
        errorCount++;
      }
    }

    console.log(`Stationary camera population complete!`);
    console.log(`✓ Successfully created: ${successCount} cameras`);
    if (errorCount > 0) {
      console.log(`✗ Failed to create: ${errorCount} cameras`);
    }

  } catch (error) {
    console.error('Error populating stationary cameras:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  populateStationaryCameras()
    .then(() => {
      console.log('Population script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Population script failed:', error);
      process.exit(1);
    });
}