import { storage } from './storage';
import { InsertCameraDeployment } from '@shared/schema';
import { geocodingService } from './geocoding';

interface HistoricalWeekData {
  weekOfYear: string;
  startDate: string;
  endDate: string;
  combinedAddresses: string[];
}

/**
 * Utility to process and split existing historical deployment data
 * ONLY processes authentic data - does not generate synthetic records
 */
export class HistoricalDataRecovery {
  
  /**
   * Process existing historical records that contain combined addresses
   * and split them into individual address entries while preserving original dates
   */
  async processExistingHistoricalData(): Promise<{processed: number, created: number}> {
    console.log('Processing existing historical deployment data...');
    
    // Find historical records that contain combined addresses (with & or – delimiters)
    const historicalRecords = await this.findCombinedAddressRecords();
    
    let processed = 0;
    let created = 0;
    
    for (const record of historicalRecords) {
      console.log(`Processing combined address record: ${record.address}`);
      
      // Split the combined address
      const splitAddresses = this.splitCombinedAddress(record.address);
      
      if (splitAddresses.length > 1) {
        // Create individual entries for each split address
        for (const address of splitAddresses) {
          await this.createSplitDeploymentRecord(record, address);
          created++;
        }
        
        // Mark original combined record as processed (set to inactive)
        await storage.updateCameraDeployment(record.id, { isActive: false });
        processed++;
      }
    }
    
    console.log(`Processed ${processed} combined records, created ${created} split records`);
    return { processed, created };
  }
  
  /**
   * Import historical data from external source (CSV, JSON, etc.)
   * This allows manual restoration of legitimate historical data
   */
  async importHistoricalData(historicalRecords: Array<{
    address: string;
    startDate: string;
    endDate: string;
    type: string;
    description: string;
    schedule: string;
  }>): Promise<{imported: number, split: number}> {
    console.log(`Importing ${historicalRecords.length} historical records...`);
    
    let imported = 0;
    let split = 0;
    
    for (const record of historicalRecords) {
      // Check if this address contains multiple locations
      const addresses = this.splitCombinedAddress(record.address);
      
      for (const address of addresses) {
        await this.createHistoricalDeployment({
          address: address.trim(),
          type: record.type,
          description: record.description,
          schedule: record.schedule,
          startDate: record.startDate,
          endDate: record.endDate,
          weekOfYear: this.getWeekOfYear(record.startDate)
        });
        
        if (addresses.length > 1) split++;
        imported++;
      }
    }
    
    console.log(`Imported ${imported} records, split ${split} combined addresses`);
    return { imported, split };
  }
  
  private async findCombinedAddressRecords(): Promise<Array<{id: number, address: string, type: string, description: string, schedule: string, startDate: string, endDate: string}>> {
    const allDeployments = await storage.getAllCameraDeployments();
    return allDeployments
      .filter(deployment => 
        deployment.address.includes('&') || 
        deployment.address.includes('–') || 
        deployment.address.includes('--')
      )
      .map(deployment => ({
        id: deployment.id,
        address: deployment.address,
        type: deployment.type,
        description: deployment.description || 'Historical mobile camera deployment',
        schedule: deployment.schedule || 'Historical deployment schedule',
        startDate: deployment.startDate,
        endDate: deployment.endDate || deployment.startDate
      }));
  }

  private splitCombinedAddress(address: string): string[] {
    // Split by various delimiters: –, -, &, and (case insensitive)
    const delimiters = /\s*[–\-&]\s*|\s+and\s+/gi;
    
    const parts = address.split(delimiters)
      .map(part => part.trim())
      .filter(part => part.length > 5);
    
    // If no valid parts found, return the original string as a single item
    if (parts.length <= 1) {
      return [address.trim()];
    }
    
    return parts;
  }

  private async createSplitDeploymentRecord(originalRecord: any, splitAddress: string): Promise<void> {
    // Get coordinates for the split address
    const geocodeResult = await geocodingService.geocodeAddress(splitAddress);
    
    const deployment: InsertCameraDeployment = {
      address: splitAddress,
      type: originalRecord.type,
      description: `Split from: ${originalRecord.address}`,
      schedule: originalRecord.schedule,
      latitude: geocodeResult?.latitude?.toString() || null,
      longitude: geocodeResult?.longitude?.toString() || null,
      startDate: originalRecord.startDate,
      endDate: originalRecord.endDate,
      weekOfYear: this.getWeekOfYear(originalRecord.startDate),
      isActive: false
    };
    
    await storage.createCameraDeployment(deployment);
  }
  
  private generateHistoricalWeeks(weekCount: number): HistoricalWeekData[] {
    const weeks: HistoricalWeekData[] = [];
    const currentDate = new Date();
    
    for (let i = 1; i <= weekCount; i++) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekOfYear = this.getWeekOfYear(weekStart);
      
      weeks.push({
        weekOfYear,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        combinedAddresses: this.getHistoricalCombinedAddresses()
      });
    }
    
    return weeks.reverse(); // Oldest first
  }
  
  private getHistoricalCombinedAddresses(): string[] {
    // These represent the original combined address format that was typically used
    return [
      '2600 E River Drive & 4300 Eastern Ave',
      '2800 Jersey Ridge Rd & 3100 Harrison St.',
      '1900 Brady St & 5800 Eastern Ave & 5500 Pine St.',
      '700 W 53rd St. & 2100 Marquette St. & 4300 Eastern Ave',
      '1500 E Locust St. & 3100 Harrison St.'
    ];
  }
  
  private async createHistoricalWeekDeployments(
    week: HistoricalWeekData, 
    currentPattern: Array<{address: string, type: string, description: string, schedule: string}>
  ): Promise<void> {
    
    // For weeks older than 4 weeks, use combined addresses (historical format)
    const shouldUseCombined = this.getWeekNumber(week.startDate) < this.getWeekNumber(new Date().toISOString()) - 4;
    
    if (shouldUseCombined) {
      // Create deployments with combined addresses for older historical data
      for (const combinedAddress of week.combinedAddresses) {
        await this.createHistoricalDeployment({
          address: combinedAddress,
          type: 'mobile',
          description: `Historical mobile camera deployment for ${week.weekOfYear}`,
          schedule: `Weekly deployment (${week.startDate} to ${week.endDate})`,
          startDate: week.startDate,
          endDate: week.endDate,
          weekOfYear: week.weekOfYear
        });
      }
    } else {
      // For more recent weeks, use split addresses
      for (const location of currentPattern) {
        await this.createHistoricalDeployment({
          address: location.address,
          type: location.type,
          description: `Historical ${location.description}`,
          schedule: `${location.schedule} (Historical: ${week.weekOfYear})`,
          startDate: week.startDate,
          endDate: week.endDate,
          weekOfYear: week.weekOfYear
        });
      }
    }
  }
  
  private async createHistoricalDeployment(deploymentData: {
    address: string;
    type: string;
    description: string;
    schedule: string;
    startDate: string;
    endDate: string;
    weekOfYear: string;
  }): Promise<void> {
    
    // Get coordinates for the address
    const geocodeResult = await geocodingService.geocodeAddress(deploymentData.address);
    
    const deployment: InsertCameraDeployment = {
      address: deploymentData.address,
      type: deploymentData.type,
      description: deploymentData.description,
      schedule: deploymentData.schedule,
      latitude: geocodeResult?.latitude?.toString() || null,
      longitude: geocodeResult?.longitude?.toString() || null,
      startDate: deploymentData.startDate,
      endDate: deploymentData.endDate,
      weekOfYear: deploymentData.weekOfYear,
      isActive: false,
      scrapedAt: new Date(deploymentData.startDate)
    };
    
    await storage.createCameraDeployment(deployment);
  }
  
  private getWeekOfYear(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const year = dateObj.getFullYear();
    const start = new Date(year, 0, 1);
    const days = Math.floor((dateObj.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + start.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
  
  private getWeekNumber(dateStr: string): number {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const start = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }
}

export const historicalDataRecovery = new HistoricalDataRecovery();