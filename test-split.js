// Test the splitting logic
function splitLocationString(locationString) {
  const delimiters = /\s*[–\-&]\s*|\s+and\s+/gi;
  
  const parts = locationString.split(delimiters)
    .map(part => part.trim())
    .filter(part => part.length > 5);
  
  if (parts.length <= 1) {
    return [locationString.trim()];
  }
  
  return parts;
}

// Test cases from the logs
const testCases = [
  "Monday: 2600 E River Drive – 4300 Eastern Ave",
  "Tuesday: 2800 Jersey Ridge Rd – 3100 Harrison St.",
  "Wednesday: 1900 Brady St – 5800 Eastern Ave – 5500 Pine St.",
  "Thursday:  700 W 53rd St. – 2100 Marquette St. – 4300 Eastern Ave",
  "Friday: 1500 E Locust St. – 3100 Harrison St."
];

testCases.forEach(testCase => {
  // Extract the part after the colon (like the scraper does)
  const locationsPart = testCase.substring(testCase.indexOf(':') + 1).trim();
  const result = splitLocationString(locationsPart);
  console.log(`Original: ${locationsPart}`);
  console.log(`Split into: ${JSON.stringify(result)}`);
  console.log(`Count: ${result.length}`);
  console.log('---');
});