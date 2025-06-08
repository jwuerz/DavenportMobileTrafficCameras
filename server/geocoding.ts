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
  
  // Known Davenport coordinates for common streets (fallback data)
  private readonly davenportCoordinates = new Map<string, GeocodeResult>([
    ['eastern ave', { latitude: 41.5236, longitude: -90.5200, formattedAddress: 'Eastern Ave, Davenport, IA' }],
    ['brady st', { latitude: 41.5300, longitude: -90.5500, formattedAddress: 'Brady St, Davenport, IA' }],
    ['division st', { latitude: 41.5150, longitude: -90.5600, formattedAddress: 'Division St, Davenport, IA' }],
    ['jersey ridge rd', { latitude: 41.5400, longitude: -90.5300, formattedAddress: 'Jersey Ridge Rd, Davenport, IA' }],
    ['marquette st', { latitude: 41.5180, longitude: -90.5650, formattedAddress: 'Marquette St, Davenport, IA' }],
    ['53rd st', { latitude: 41.4950, longitude: -90.5800, formattedAddress: '53rd St, Davenport, IA' }],
    ['harrison st', { latitude: 41.5100, longitude: -90.5750, formattedAddress: 'Harrison St, Davenport, IA' }],
    ['river drive', { latitude: 41.5350, longitude: -90.5100, formattedAddress: 'River Drive, Davenport, IA' }]
  ]);

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      // Add delay to respect rate limits (1 request per second)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try multiple geocoding strategies
      const strategies = [
        this.formatDavenportAddress(address),
        this.formatAsIntersection(address),
        this.formatAsFirstAddressOnly(address)
      ];

      for (const cleanAddress of strategies) {
        console.log(`Trying geocoding strategy: "${cleanAddress}"`);
        
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
          continue;
        }

        const data: NominatimResponse[] = await response.json();
        
        if (data.length > 0) {
          const result = data[0];
          console.log(`Geocoding success with strategy "${cleanAddress}":`, result.lat, result.lon);
          return {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            formattedAddress: result.display_name
          };
        }

        // Add delay between attempts
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.warn(`No geocoding results found for address after all strategies: ${address}, using fallback`);
      return this.getFallbackCoordinates(address);

    } catch (error) {
      console.error('Geocoding error:', error);
      return this.getFallbackCoordinates(address);
    }
  }

  private getFallbackCoordinates(address: string): GeocodeResult {
    const addressLower = address.toLowerCase();
    
    // Check for specific streets and return appropriate coordinates
    if (addressLower.includes('eastern ave')) {
      return { latitude: 41.5236, longitude: -90.5200, formattedAddress: 'Eastern Ave, Davenport, IA' };
    }
    if (addressLower.includes('brady st')) {
      return { latitude: 41.5300, longitude: -90.5500, formattedAddress: 'Brady St, Davenport, IA' };
    }
    if (addressLower.includes('division st')) {
      return { latitude: 41.5150, longitude: -90.5600, formattedAddress: 'Division St, Davenport, IA' };
    }
    if (addressLower.includes('jersey ridge rd')) {
      return { latitude: 41.5400, longitude: -90.5300, formattedAddress: 'Jersey Ridge Rd, Davenport, IA' };
    }
    if (addressLower.includes('marquette st')) {
      return { latitude: 41.5180, longitude: -90.5650, formattedAddress: 'Marquette St, Davenport, IA' };
    }
    if (addressLower.includes('53rd st')) {
      return { latitude: 41.4950, longitude: -90.5800, formattedAddress: '53rd St, Davenport, IA' };
    }
    if (addressLower.includes('harrison st')) {
      return { latitude: 41.5100, longitude: -90.5750, formattedAddress: 'Harrison St, Davenport, IA' };
    }
    if (addressLower.includes('river drive')) {
      return { latitude: 41.5350, longitude: -90.5100, formattedAddress: 'River Drive, Davenport, IA' };
    }
    
    // Default to Davenport city center
    return {
      latitude: 41.5236,
      longitude: -90.5776,
      formattedAddress: 'Davenport, IA (approximate)'
    };
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

  private formatAsIntersection(address: string): string {
    // Format as simple intersection for Davenport
    let cleanAddress = address.trim();
    
    if (cleanAddress.includes('&') || cleanAddress.includes('–') || cleanAddress.includes('-')) {
      const parts = cleanAddress.split(/[&–-]/).map(p => p.trim());
      if (parts.length >= 2) {
        const street1 = this.extractStreetName(parts[0]);
        const street2 = this.extractStreetName(parts[1]);
        return `${street1} and ${street2}, Davenport, Iowa, USA`;
      }
    }
    
    return `${cleanAddress}, Davenport, Iowa, USA`;
  }

  private formatAsFirstAddressOnly(address: string): string {
    // Use just the first address part
    let cleanAddress = address.trim();
    
    if (cleanAddress.includes('&') || cleanAddress.includes('–') || cleanAddress.includes('-')) {
      const parts = cleanAddress.split(/[&–-]/).map(p => p.trim());
      cleanAddress = parts[0];
    }
    
    return `${cleanAddress}, Davenport, Iowa, USA`;
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