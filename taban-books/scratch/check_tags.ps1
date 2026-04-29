
$content = Get-Content "frontend\src\pages\sales\Invoices\InvoiceDetail\InvoiceDetail.tsx" -Raw
$stack = @()
$lineNum = 0
foreach ($line in $content -split "`n") {
    $lineNum++
    $tags = [regex]::Matches($line, "<div(\s+[^>]*)?>|</div\s*>")
    foreach ($tag in $tags) {
        if ($tag.Value -match "<div") {
            if ($tag.Value -match "/>") {
                # Self-closing, do nothing
            } else {
                $stack += @{ line = $lineNum; tag = $tag.Value }
            }
        } else {
            if ($stack.Count -eq 0) {
                Write-Host "Extra closing tag at line $lineNum : $($tag.Value)"
            } else {
                $stack = $stack[0..($stack.Count - 2)]
            }
        }
    }
}
foreach ($item in $stack) {
    Write-Host "Unclosed tag at line $($item.line) : $($item.tag)"
}
