import { Client, GeocodeResponse, GeocodeResult as GoogleGeocodeResult } from "@googlemaps/google-maps-services-js";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const googleMapsClient = new Client({});

const testAddress = "400 E Locust St, Davenport, IA 52803";

async function testGoogleGeocoding() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("Error: GOOGLE_MAPS_API_KEY environment variable is not set.");
    process.exit(1);
  }

  console.log(`Testing Google Geocoding API with address: "${testAddress}"`);

  try {
    const response: GeocodeResponse = await googleMapsClient.geocode({
      params: {
        address: testAddress,
        key: apiKey,
      },
      timeout: 5000, // milliseconds
    });

    console.log("\n--- Full Google Maps API Response ---");
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.results && response.data.results.length > 0) {
      const firstResult: GoogleGeocodeResult = response.data.results[0];
      const location = firstResult.geometry.location;
      const formattedAddress = firstResult.formatted_address;

      console.log("\n--- Extracted Geocoding Result ---");
      console.log(`Latitude: ${location.lat}`);
      console.log(`Longitude: ${location.lng}`);
      console.log(`Formatted Address: "${formattedAddress}"`);
      
      if (response.data.results.length > 1) {
        console.log(`\nNote: Google API returned ${response.data.results.length} results. Displaying the first one.`);
      }

    } else {
      console.log("\n--- No Results ---");
      console.log("Google Maps API returned no results for the address.");
      if (response.data.status) {
        console.log(`API Status: ${response.data.status}`);
        if (response.data.error_message) {
          console.log(`API Error Message: ${response.data.error_message}`);
        }
      }
    }
  } catch (error: any) {
    console.error("\n--- Error during Google Geocoding ---");
    if (error.isAxiosError && error.response) {
      console.error("Axios Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

testGoogleGeocoding().catch(error => {
  console.error("\n--- Unhandled Error in Test Script ---");
  console.error(error);
  process.exit(1);
});
