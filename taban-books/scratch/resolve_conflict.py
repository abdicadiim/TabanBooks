import sys
import os

path = r'c:\Users\Taban-pc\Music\TabanBooks\taban-books\frontend\src\pages\sales\Quotes\QuoteDetail\QuoteDetail.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '<<<<<<< Updated upstream' in line:
        start_idx = i
    if '>>>>>>> Stashed changes' in line:
        end_idx = i

if start_idx != -1 and end_idx != -1:
    new_content = [
        '                {/* Quote Information Grid */}\n',
        '                <div className="space-y-4 mb-6">\n',
        '                  <div className="grid grid-cols-2 gap-4">\n',
        '                    <div className="flex flex-col">\n',
        '                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quote Number</span>\n',
        '                      <span className="text-sm text-gray-900">{quote.quoteNumber || quote.id}</span>\n'
    ]
    lines[start_idx:end_idx+1] = new_content
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Successfully resolved conflict.")
else:
    print(f"Could not find markers. Start: {start_idx}, End: {end_idx}")
