import re

file_path = r"c:\Users\Taban-pc\Downloads\TabanBooks\taban-books\frontend\src\pages\purchases\vendor-credits\NewVendorCredit.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r"          \{\/\* Item Table \*\/\}.*?Maximum File Size: 10MB\n\s*</div>\n\s*</div>\n\s*<input[^>]+/>\n\s*</div>\n\s*</div>", re.DOTALL)

with open(r"c:\Users\Taban-pc\Downloads\TabanBooks\taban-books\frontend\src\pages\purchases\vendor-credits\NewVendorCredit_Replacement.tsx", "r", encoding="utf-8") as f:
    new_content = f.read()

match = pattern.search(content)
if match:
    new_content = content[:match.start()] + new_content + content[match.end():]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Success: Replacement made.")
else:
    print("Error: Could not find target pattern in NewVendorCredit.tsx")
