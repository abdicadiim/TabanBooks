const fs = require('fs');
const path = 'taban-books/frontend/src/pages/sales/Quotes/QuoteDetail/QuoteDetail.tsx';
let content = fs.readFileSync(path, 'utf8');
let lines = content.split('\n');

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<<<<<<< Updated upstream')) startIdx = i;
    if (lines[i].includes('>>>>>>> Stashed changes')) endIdx = i;
}

if (startIdx !== -1 && endIdx !== -1) {
    const newLines = [
        '                {/* Quote Information Grid */}',
        '                <div className="space-y-4 mb-6">',
        '                  <div className="grid grid-cols-2 gap-4">',
        '                    <div className="flex flex-col">',
        '                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quote Number</span>',
        '                      <span className="text-sm text-gray-900">{quote.quoteNumber || quote.id}</span>'
    ];
    lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log("Successfully resolved conflict.");
} else {
    console.log("Could not find markers. Start: " + startIdx + ", End: " + endIdx);
}
