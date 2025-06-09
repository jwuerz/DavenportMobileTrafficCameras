interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

export class GeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';
  private readonly userAgent = 'DavenportCameraAlerts/1.0';

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      console.log(`Geocoding address: ${address}`);
      
      // Check if it's an intersection format first
      if (address.includes('&')) {
        return await this.geocodeIntersection(address);
      }
      
      // For single addresses, try normal geocoding
      return await this.tryDirectGeocoding(address);
      
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
      `${street1} and ${street2}, Davenport, IA 52802`,
      `${street1} and ${street2}, Davenport, IA 52803`,
      `${street1} and ${street2}, Davenport, IA 52804`,
      `${parts[0]}, Davenport, Scott County, Iowa`,
      `${parts[1]}, Davenport, Scott County, Iowa`
    ];

    for (const query of queries) {
      const result = await this.tryDirectGeocoding(query);
      if (result) {
        console.log(`Successfully geocoded with query: ${query}`);
        return result;
      }
      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`All intersection geocoding attempts failed for: ${address}`);
    return null;
  }

  private extractStreetName(addressPart: string): string {
    // Remove house numbers and extract just the street name
    // "5800 Eastern Ave" -> "Eastern Ave"
    // "1900 Brady St." -> "Brady St"
    let cleaned = addressPart.replace(/^\d+\s+/, '').replace(/\.$/, '').trim();
    
    // Normalize common abbreviations
    cleaned = cleaned.replace(/\bSt\b/gi, 'Street')
                    .replace(/\bAve\b/gi, 'Avenue')
                    .replace(/\bRd\b/gi, 'Road')
                    .replace(/\bDr\b/gi, 'Drive')
                    .replace(/\bBlvd\b/gi, 'Boulevard');
    
    return cleaned;
  }

  private isWithinDavenport(latitude: number, longitude: number): boolean {
    // Davenport, Iowa approximate boundaries
    // Latitude: ~41.46 to 41.61
    // Longitude: ~-90.68 to -90.50
    return latitude >= 41.46 && latitude <= 41.61 && 
           longitude >= -90.68 && longitude <= -90.50;
  }

  private async tryDirectGeocoding(query: string): Promise<GeocodeResult | null> {
    try {
      console.log(`Trying to geocode: ${query}`);
      
      const url = `${this.baseUrl}?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=us`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        console.error(`Geocoding API error: ${response.status}`);
        return null;
      }

      const results: NominatimResponse[] = await response.json();
      
      if (results.length === 0) {
        console.log(`No results for: ${query}`);
        return null;
      }

      // Look for the best result in Davenport area
      for (const result of results) {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        // Check if result is in Davenport area
        // Davenport bounds: roughly 41.45-41.65 lat, -90.75 to -90.40 lon
        if (lat >= 41.45 && lat <= 41.65 && lon >= -90.75 && lon <= -90.40) {
          // Additional check: result should mention Davenport or Iowa
          const displayName = result.display_name.toLowerCase();
          if (displayName.includes('davenport') || displayName.includes('iowa')) {
            console.log(`Found valid Davenport location: ${lat}, ${lon}`);
            console.log(`Address: ${result.display_name}`);
            return {
              latitude: lat,
              longitude: lon,
              formattedAddress: result.display_name
            };
          }
        }
      }

      console.log(`No valid Davenport results found for: ${query}`);
      return null;

    } catch (error) {
      console.error(`Direct geocoding error for ${query}:`, error);
      return null;
    }
  }

  async batchGeocode(addresses: string[]): Promise<Map<string, GeocodeResult>> {
    const results = new Map<string, GeocodeResult>();
    
    for (const address of addresses) {
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await this.geocodeAddress(address);
      if (result) {
        results.set(address, result);
      }
    }
    
    return results;
  }
}

export const geocodingService = new GeocodingService();