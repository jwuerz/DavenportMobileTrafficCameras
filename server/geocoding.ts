
import { getVerifiedCoordinates, isWithinDavenport } from './davenportCoordinates.js';
import { Client, GeocodeResponse, GeocodeResult as GoogleGeocodeResult } from "@googlemaps/google-maps-services-js";

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export class GeocodingService {
  private googleMapsClient: Client;
  private apiKey: string;

  constructor() {
    this.googleMapsClient = new Client({});
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('GOOGLE_MAPS_API_KEY not found, geocoding will be limited to verified coordinates');
    }
  }

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      console.log(`Geocoding address: ${address}`);
      
      // First, check if we have verified coordinates for this Davenport intersection
      const verified = getVerifiedCoordinates(address);
      if (verified) {
        console.log(`Using verified coordinates for: ${address}`);
        return {
          latitude: verified.latitude,
          longitude: verified.longitude,
          formattedAddress: verified.address
        };
      }
      
      // If no API key, return null for non-verified addresses
      if (!this.apiKey) {
        console.log(`No Google Maps API key available for: ${address}`);
        return null;
      }
      
      // Check if it's an intersection format
      if (address.includes('&')) {
        return await this.geocodeIntersection(address);
      }
      
      // For single addresses, try direct geocoding
      return await this.tryGoogleGeocoding(address);
      
    } catch (error) {
      console.error(`Geocoding error for ${address}:`, error);
      return null;
    }
  }

  private async geocodeIntersection(address: string): Promise<GeocodeResult | null> {
    // Parse intersection (e.g., "5800 Eastern Ave & 1900 Brady St.")
    const parts = address.split('&').map(part => part.trim());
    if (parts.length !== 2) {
      return null;
    }

    console.log(`Parsing intersection: ${parts[0]} & ${parts[1]}`);
    
    // Extract street names from each part
    const street1 = this.extractStreetName(parts[0]);
    const street2 = this.extractStreetName(parts[1]);
    
    console.log(`Extracted streets: "${street1}" and "${street2}"`);

    // Try various intersection query formats with better Davenport specificity
    const queries = [
      `${street1} and ${street2}, Davenport, Scott County, Iowa, USA`,
      `intersection of ${street1} and ${street2}, Davenport, Iowa, USA`,
      `${street1} & ${street2}, Davenport, Scott County, IA`,
      `${parts[0]} and ${parts[1]}, Davenport, Scott County, Iowa`,
      `${street1} and ${street2}, Davenport, IA 52801`,
      `${parts[0]}, Davenport, Scott County, Iowa`,
      `${parts[1]}, Davenport, Scott County, Iowa`
    ];

    for (const query of queries) {
      const result = await this.tryGoogleGeocoding(query);
      if (result) {
        console.log(`Successfully geocoded with query: ${query}`);
        return result;
      }
      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`All intersection geocoding attempts failed for: ${address}`);
    return null;
  }

  private extractStreetName(addressPart: string): string {
    // Remove house numbers and extract just the street name
    // "5800 Eastern Ave" -> "Eastern Ave"
    // "1900 Brady St." -> "Brady St"
    let cleaned = addressPart.replace(/^\d+\s+/, '').replace(/\.$/, '').trim();
    
    // Normalize common abbreviations for Google Maps
    cleaned = cleaned.replace(/\bSt\b/gi, 'Street')
                    .replace(/\bAve\b/gi, 'Avenue')
                    .replace(/\bRd\b/gi, 'Road')
                    .replace(/\bDr\b/gi, 'Drive')
                    .replace(/\bBlvd\b/gi, 'Boulevard');
    
    return cleaned;
  }

  private isWithinDavenportBounds(latitude: number, longitude: number): boolean {
    return isWithinDavenport(latitude, longitude);
  }

  private async tryGoogleGeocoding(query: string): Promise<GeocodeResult | null> {
    try {
      console.log(`Trying Google geocoding for: ${query}`);
      
      const response: GeocodeResponse = await this.googleMapsClient.geocode({
        params: {
          address: query,
          key: this.apiKey,
          components: { country: 'US', administrative_area: 'IA' }, // Restrict to Iowa, US
        },
        timeout: 10000, // 10 seconds timeout
      });

      if (response.data.results && response.data.results.length > 0) {
        // Look for the best result in Davenport area
        for (const result of response.data.results) {
          const location = result.geometry.location;
          const formattedAddress = result.formatted_address;

          // Check if result is within Davenport boundaries
          if (this.isWithinDavenportBounds(location.lat, location.lng)) {
            console.log(`Found valid Davenport location: ${location.lat}, ${location.lng}`);
            console.log(`Address: ${formattedAddress}`);
            return {
              latitude: location.lat,
              longitude: location.lng,
              formattedAddress: formattedAddress
            };
          }
        }

        // If no results in Davenport bounds, take the first result if it mentions Davenport
        const firstResult = response.data.results[0];
        if (firstResult.formatted_address.toLowerCase().includes('davenport')) {
          console.log(`Using first result mentioning Davenport: ${firstResult.geometry.location.lat}, ${firstResult.geometry.location.lng}`);
          return {
            latitude: firstResult.geometry.location.lat,
            longitude: firstResult.geometry.location.lng,
            formattedAddress: firstResult.formatted_address
          };
        }
      }

      console.log(`No valid Davenport results found for: ${query}`);
      return null;

    } catch (error: any) {
      console.error(`Google geocoding error for ${query}:`, error);
      
      // Handle specific Google Maps API errors
      if (error.response?.data?.error_message) {
        console.error(`Google API Error: ${error.response.data.error_message}`);
      }
      
      return null;
    }
  }

  async batchGeocode(addresses: string[]): Promise<Map<string, GeocodeResult>> {
    const results = new Map<string, GeocodeResult>();
    
    for (const address of addresses) {
      // Add delay to respect Google Maps API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const result = await this.geocodeAddress(address);
      if (result) {
        results.set(address, result);
      }
    }
    
    return results;
  }
}

export const geocodingService = new GeocodingService();
