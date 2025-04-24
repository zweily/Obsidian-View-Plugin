// Cross-platform clean script for npm run clean
const fs = require('fs');
const path = require('path');

fs.readdirSync('.').forEach(file => {
  if (file.endsWith('.zip')) {
    try {
      fs.unlinkSync(file);
      console.log('Deleted', file);
    } catch (e) {
      console.error('Failed to delete', file, e);
    }
  }
});
