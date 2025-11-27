const fs = require('fs');
const path = '/Users/jg/Documents/github/Kill-Board-Game/KillBoard.drawio.svg';

const svgContent = fs.readFileSync(path, 'utf8');

// Regex to find all circles/ellipses
// <ellipse cx="320" cy="270" rx="10" ry="10" ... />
const circleRegex = /<ellipse cx="(\d+)" cy="(\d+)"/g;

let match;
const coords = [];
while ((match = circleRegex.exec(svgContent)) !== null) {
    coords.push({ x: parseInt(match[1]), y: parseInt(match[2]) });
}

console.log(`Found ${coords.length} circles`);
console.log(JSON.stringify(coords, null, 2));
