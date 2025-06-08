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
    
    // Handle intersection format (e.g., "5800 Eastern Ave – 1900 Brady St")
    if (cleanAddress.includes('–') || cleanAddress.includes('-')) {
      // Take the first address for geocoding
      cleanAddress = cleanAddress.split(/[–-]/)[0].trim();
    }

    // Add Davenport, Iowa if not present
    if (!cleanAddress.toLowerCase().includes('davenport') && !cleanAddress.toLowerCase().includes('iowa')) {
      cleanAddress += ', Davenport, Iowa, USA';
    }

    return cleanAddress;
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