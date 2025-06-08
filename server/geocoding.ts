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
      // Add delay to respect rate limits (1 request per second)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clean and format address for Davenport, Iowa
      const cleanAddress = this.formatDavenportAddress(address);
      
      const params = new URLSearchParams({
        q: cleanAddress,
        format: 'json',
        limit: '1',
        countrycodes: 'us'
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        console.error('Geocoding API error:', response.status);
        return null;
      }

      const data: NominatimResponse[] = await response.json();
      
      if (data.length === 0) {
        console.warn(`No geocoding results found for address: ${address}`);
        return null;
      }

      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name
      };

    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  private formatDavenportAddress(address: string): string {
    // Clean up common address formats from the scraper
    let cleanAddress = address.trim();
    
    // Handle intersection format (e.g., "5800 Eastern Ave & 1900 Brady St")
    if (cleanAddress.includes('&') || cleanAddress.includes('–') || cleanAddress.includes('-')) {
      // For intersections, try to use the first address with better formatting
      const parts = cleanAddress.split(/[&–-]/).map(p => p.trim());
      if (parts.length >= 2) {
        // Try the first address first, then fall back to intersection format
        const firstAddress = parts[0].trim();
        // If first part looks like a complete address, use it
        if (this.isCompleteAddress(firstAddress)) {
          cleanAddress = firstAddress;
        } else {
          // Use intersection format
          const street1 = this.extractStreetName(parts[0]);
          const street2 = this.extractStreetName(parts[1]);
          cleanAddress = `${street1} and ${street2}`;
        }
      } else {
        cleanAddress = this.extractStreetName(parts[0]);
      }
    }

    // Add Davenport, Iowa if not present
    if (!cleanAddress.toLowerCase().includes('davenport') && !cleanAddress.toLowerCase().includes('iowa')) {
      cleanAddress += ', Davenport, Iowa, USA';
    }

    console.log(`Formatted address: "${address}" -> "${cleanAddress}"`);
    return cleanAddress;
  }

  private isCompleteAddress(address: string): boolean {
    // Check if address contains a number (house number) and street type
    const hasNumber = /\d+/.test(address);
    const hasStreetType = /(st|street|ave|avenue|rd|road|blvd|boulevard|way|dr|drive)/i.test(address);
    return hasNumber && hasStreetType && address.length > 10;
  }

  private extractStreetName(addressPart: string): string {
    // Extract just the street name from an address like "5800 Eastern Ave"
    const parts = addressPart.trim().split(/\s+/);
    if (parts.length >= 2) {
      // Remove the house number, keep the street name
      return parts.slice(1).join(' ');
    }
    return addressPart;
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