
import { Client, GeocodeResponse, GeocodeResult as GoogleGeocodeResult } from "@googlemaps/google-maps-services-js";
import dotenv from 'dotenv';
import { DAVENPORT_INTERSECTIONS } from './davenportCoordinates.js';

// Load environment variables from .env file
dotenv.config();

const googleMapsClient = new Client({});

// Test addresses from your codebase
const testAddresses: string[] = [
  "400 E Locust St, Davenport, IA 52803",
  "1 Radisson Pl, Davenport, IA 52801",
  "6700 division st & 2800 jersey ridge rd",
  "2600 E River Drive & 4300 Eastern Ave",
  "2800 Jersey Ridge Rd & 3100 Harrison St",
  "5800 Eastern Ave & 5500 Pine St",
  "700 W 53rd St & 2100 Marquette St",
  "1500 E Locust St & 3100 Harrison St",
  "E Kimberly Rd & N Brady St, Davenport, IA",
  "W River Dr & Perry St, Davenport, IA",
  "700 W 76th St, Davenport, IA 52806",
  "N Harrison St & W Central Park Ave, Davenport, IA",
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testGoogleMapsGeocoding() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("Error: GOOGLE_MAPS_API_KEY environment variable is not set.");
    console.error("Please add your Google Maps API key to the Secrets tab.");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("GOOGLE MAPS GEOCODING API TEST");
  console.log("=".repeat(60));
  console.log(`Testing ${testAddresses.length} addresses from Davenport codebase\n`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < testAddresses.length; i++) {
    const address = testAddresses[i];
    console.log(`[${i + 1}/${testAddresses.length}] Testing: "${address}"`);

    try {
      const response: GeocodeResponse = await googleMapsClient.geocode({
        params: {
          address: address,
          key: apiKey,
          components: { country: 'US', administrative_area: 'IA' }, // Restrict to Iowa, US
        },
        timeout: 10000, // 10 seconds timeout
      });

      if (response.data.results && response.data.results.length > 0) {
        const firstResult: GoogleGeocodeResult = response.data.results[0];
        const location = firstResult.geometry.location;
        const formattedAddress = firstResult.formatted_address;

        console.log(`✅ SUCCESS`);
        console.log(`   Latitude: ${location.lat}`);
        console.log(`   Longitude: ${location.lng}`);
        console.log(`   Formatted: "${formattedAddress}"`);
        
        // Check if it's within Davenport bounds (rough check)
        const isInDavenport = location.lat >= 41.46 && location.lat <= 41.61 && 
                             location.lng >= -90.68 && location.lng <= -90.50;
        console.log(`   In Davenport bounds: ${isInDavenport ? '✅ Yes' : '⚠️  No'}`);
        
        // Check against verified coordinates if available
        const normalizedAddress = address.toLowerCase()
          .replace(/\./g, '')
          .replace(/\s+/g, ' ')
          .replace(/\b(street|avenue|road|drive|boulevard)\b/g, (match) => {
            switch (match) {
              case 'street': return 'st';
              case 'avenue': return 'ave';
              case 'road': return 'rd';
              case 'drive': return 'dr';
              case 'boulevard': return 'blvd';
              default: return match;
            }
          })
          .trim();
        
        const verified = DAVENPORT_INTERSECTIONS[normalizedAddress];
        if (verified) {
          const latDiff = Math.abs(location.lat - verified.latitude);
          const lngDiff = Math.abs(location.lng - verified.longitude);
          console.log(`   Verified coordinates available:`);
          console.log(`     Expected: ${verified.latitude}, ${verified.longitude}`);
          console.log(`     Difference: ±${latDiff.toFixed(6)}, ±${lngDiff.toFixed(6)}`);
          console.log(`     Close match: ${(latDiff < 0.01 && lngDiff < 0.01) ? '✅ Yes' : '⚠️  No'}`);
        }
        
        if (response.data.results.length > 1) {
          console.log(`   Note: ${response.data.results.length} total results found`);
        }
        
        successCount++;
      } else {
        console.log(`❌ FAILED: No results found`);
        console.log(`   API Status: ${response.data.status}`);
        if (response.data.error_message) {
          console.log(`   Error: ${response.data.error_message}`);
        }
        failureCount++;
      }
    } catch (error: any) {
      console.log(`❌ ERROR: ${error.message}`);
      if (error.response?.data) {
        console.log(`   API Response:`, JSON.stringify(error.response.data, null, 2));
      }
      failureCount++;
    }

    console.log(""); // Empty line for readability
    
    // Add delay between requests to respect API rate limits
    if (i < testAddresses.length - 1) {
      await delay(200); // 200ms delay between requests
    }
  }

  console.log("=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total addresses tested: ${testAddresses.length}`);
  console.log(`Successful geocodes: ${successCount} (${((successCount / testAddresses.length) * 100).toFixed(1)}%)`);
  console.log(`Failed geocodes: ${failureCount} (${((failureCount / testAddresses.length) * 100).toFixed(1)}%)`);
  
  if (successCount > 0) {
    console.log("\n✅ Google Maps Geocoding API is working!");
    console.log("You can now consider migrating from OpenStreetMap to Google Maps for better accuracy.");
  } else {
    console.log("\n❌ All geocoding attempts failed. Please check:");
    console.log("- Google Maps API key is correct");
    console.log("- Geocoding API is enabled in Google Cloud Console");
    console.log("- API key has proper permissions");
    console.log("- Billing is set up (required for Google Maps APIs)");
  }
}

testGoogleMapsGeocoding().catch(error => {
  console.error("\n--- Unhandled Error in Test Script ---");
  console.error(error);
  process.exit(1);
});
