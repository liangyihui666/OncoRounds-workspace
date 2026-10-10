$ErrorActionPreference = 'Stop'
$target = (Join-Path (Get-Location).Path 'competitor_qa.docx').ToLowerInvariant()
$word = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Word.Application')
$closed = $false
for ($i = $word.Documents.Count; $i -ge 1; $i--) {
    $doc = $word.Documents.Item($i)
    if ($doc.FullName.ToLowerInvariant() -eq $target) {
        $doc.Close($false)
        $closed = $true
    }
}
if ($word.Documents.Count -eq 0) {
    $word.Quit()
}
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Output "closed_target=$closed"
