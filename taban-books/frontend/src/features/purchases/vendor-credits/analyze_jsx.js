
import fs from 'fs';

const filePath = 'c:\\Users\\Taban-pc\\Downloads\\TabanBooks\\taban-books\\frontend\\src\\features\\purchases\\vendor-credits\\NewVendorCredit.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

let balance = 0;
let fragmentBalance = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Simple regex for opening and closing tags (this is very crude but might help)
    const openTags = line.match(/<[a-zA-Z0-9]+[^>]*>/g) || [];
    const closeTags = line.match(/<\/[a-zA-Z0-9]+>/g) || [];
    const openFragments = line.match(/<>/g) || [];
    const closeFragments = line.match(/<\/>/g) || [];
    
    // Ignore self-closing tags
    const openTagFiltered = openTags.filter(t => !t.endsWith('/>'));

    const diff = openTagFiltered.length - closeTags.length;
    const fragmentDiff = openFragments.length - closeFragments.length;
    
    balance += diff;
    fragmentBalance += fragmentDiff;
    
    if (i >= 2440 && i <= 2480) {
        console.log(`${i + 1}: Balance=${balance}, FragmentBalance=${fragmentBalance} | ${line.trim()}`);
    }
}
