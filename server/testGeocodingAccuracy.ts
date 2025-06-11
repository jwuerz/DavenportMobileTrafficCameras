import { geocodingService } from "./geocoding";

const testAddresses: string[] = [
  "400 E Locust St, Davenport, IA 52803",
  "1 Radisson Pl, Davenport, IA 52801",
  "6700 division st & 2800 jersey ridge rd",
  "E Kimberly Rd & N Brady St, Davenport, IA",
  "W River Dr & Perry St, Davenport, IA",
  "700 W 76th St, Davenport, IA 52806",
  "4550 Middle Rd, Bettendorf, IA 52722",
  "226 18th St, Rock Island, IL 61201",
  "N Harrison St & W Central Park Ave, Davenport, IA",
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testGeocoding() {
  for (const address of testAddresses) {
    console.log(`Testing address: ${address}`);
    try {
      const result = await geocodingService.geocodeAddress(address);
      if (result) {
        console.log(`Result: { latitude: ${result.latitude}, longitude: ${result.longitude}, formattedAddress: '${result.formattedAddress}' }`);
      } else {
        console.log("Result: null");
      }
    } catch (error) {
      console.error(`Error geocoding address "${address}":`, error);
      console.log("Result: Error during geocoding");
    }
    console.log("---");
    await delay(1000); // 1-second delay
  }
}

testGeocoding().catch(error => {
  console.error("An unexpected error occurred during the test script:", error);
  process.exit(1);
});
