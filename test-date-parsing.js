// Test script to debug date parsing
const timestampStr = '07/Sep/2025:10:24:40 -0700';
const result = timestampStr.replace(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) (.+)/, '$2 $1, $3 $4:$5:$6 $7');

console.log('Original:', timestampStr);
console.log('Parsed:', result);
console.log('Date object:', new Date(result));
console.log('ISO string:', new Date(result).toISOString());

// Test with current date for comparison
const now = new Date();
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(now.getDate() - 7);

console.log('\nComparison:');
console.log('Current date:', now.toISOString());
console.log('7 days ago:', sevenDaysAgo.toISOString());
console.log('Log date > 7 days ago?', new Date(result) > sevenDaysAgo);
