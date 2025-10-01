const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/server/api/services/holiday-seed.service.ts', 'utf8');

// Replace PUBLIC with OTHER
content = content.replace(/type: 'PUBLIC'/g, "type: 'OTHER'");

// Remove isRecurring references
content = content.replace(/,\s*isRecurring:\s*true/g, '');

// Write back to file
fs.writeFileSync('src/server/api/services/holiday-seed.service.ts', content);

console.log('Fixed holiday service file');
