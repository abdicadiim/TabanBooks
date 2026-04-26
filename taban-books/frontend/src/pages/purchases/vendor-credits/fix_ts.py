import re
import sys

file_path = r"c:\Users\Taban-pc\Downloads\TabanBooks\taban-books\frontend\src\pages\purchases\vendor-credits\NewVendorCredit.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix useRef
content = re.sub(r'const (vendorRef|currencyRef|accountsPayableRef|taxExclusiveRef|taxLevelRef|uploadMenuRef|fileInputRef|bulkActionsRef|addNewRowRef) = useRef\(null\);', r'const \1 = useRef<any>(null);', content)
content = re.sub(r'const (itemRefs|rowMenuRefs) = useRef\({}\);', r'const \1 = useRef<any>({});', content)

# Fix selectedVendor
if 'const selectedVendor' not in content:
    content = content.replace(
        '  // Get billing address from selected vendor',
        '  const selectedVendor = vendors.find(v => (v.displayName || v.name) === formData.vendorName);\n\n  // Get billing address from selected vendor'
    )

# Fix styles (flexDirection, overflowY, textAlign, resize)
content = re.sub(r'(flexDirection:\s*"(?:column|row)")(?![^}]*as any)', r'\1 as any', content)
content = re.sub(r'(overflowY:\s*"(?:auto|hidden)")(?![^}]*as any)', r'\1 as any', content)
content = re.sub(r'(textAlign:\s*"(?:left|center|right)")(?![^}]*as any)', r'\1 as any', content)
content = re.sub(r'(resize:\s*"(?:none|both|horizontal|vertical|block|inline)")(?![^}]*as any)', r'\1 as any', content)

# Fix property '_id', 'id', 'vendor_id'
# (acc._id || acc.id) -> (acc._id || acc.id) since we already type acc as any? Wait, acc was typed as any: (acc: any)
# Why did it error on `acc._id`? Wait, error 770 is at line 770. Let's see what is at 770.

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Applied automated fixes")
