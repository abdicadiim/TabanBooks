import re
import os

def fix_file(file_path):
    print(f"Fixing {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix implicitly any parameters in common patterns
    content = re.sub(r'\(event\)\s*=>', r'(event: any) =>', content)
    content = re.sub(r'\(e\)\s*=>', r'(e: any) =>', content)
    content = re.sub(r'\(creditId,\s*e\)\s*=>', r'(creditId: any, e: any) =>', content)
    content = re.sub(r'\(field,\s*value\)\s*=>', r'(field: any, value: any) =>', content)
    content = re.sub(r'\(dateString\)\s*=>', r'(dateString: any) =>', content)
    content = re.sub(r'\(amount\)\s*=>', r'(amount: any) =>', content)
    content = re.sub(r'\(creditsList\)\s*=>', r'(creditsList: any) =>', content)
    content = re.sub(r'\(sortOption\)\s*=>', r'(sortOption: any) =>', content)
    content = re.sub(r'\(format,\s*creditsToExport\)\s*=>', r'(format: any, creditsToExport: any) =>', content)
    content = re.sub(r'\(credit\)\s*=>', r'(credit: any) =>', content)
    content = re.sub(r'\(customView\)\s*=>', r'(customView: any) =>', content)
    content = re.sub(r'\(item\)\s*=>', r'(item: any) =>', content)
    content = re.sub(r'\{ onClose,\s*onSave \}', r'{ onClose, onSave }: any', content)
    content = re.sub(r'\(index\)\s*=>', r'(index: any) =>', content)
    content = re.sub(r'\(id,\s*field,\s*value\)\s*=>', r'(id: any, field: any, value: any) =>', content)
    content = re.sub(r'\(id\)\s*=>', r'(id: any) =>', content)
    content = re.sub(r'\(column\)\s*=>', r'(column: any) =>', content)

    # Fix useRef(null) -> useRef<any>(null)
    content = re.sub(r'useRef\(null\)', r'useRef<any>(null)', content)
    content = re.sub(r'useRef\(\{\}\)', r'useRef<any>({})', content)

    # Fix useState([]) -> useState<any[]>([])
    content = re.sub(r'useState\(\[\]\)', r'useState<any[]>([])', content)
    content = re.sub(r'useState\(null\)', r'useState<any>(null)', content)

    # Fix style properties that often error
    style_props = ['flexDirection', 'overflowY', 'overflowX', 'textAlign', 'position', 'textDecorationStyle', 'borderCollapse', 'whiteSpace', 'fontWeight', 'textTransform', 'cursor', 'display', 'justifyContent', 'alignItems', 'zIndex', 'flex']
    for prop in style_props:
        # Match prop: "value" and add as any
        pattern = rf'({prop}:\s*"[^"]*")'
        content = re.sub(pattern, r'\1 as any', content)

    # Special case for some numeric values in styles that might be strings
    content = re.sub(r'(colSpan=\{)"(\d+)"(\})', r'\1\2\3', content)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

files_to_fix = [
    r"c:\Users\Taban-pc\Downloads\TabanBooks\taban-books\frontend\src\features\purchases\vendor-credits\VendorCredits.tsx",
    r"c:\Users\Taban-pc\Downloads\TabanBooks\taban-books\frontend\src\pages\purchases\vendor-credits\VendorCredits.tsx"
]

for f in files_to_fix:
    if os.path.exists(f):
        fix_file(f)
    else:
        print(f"File not found: {f}")
