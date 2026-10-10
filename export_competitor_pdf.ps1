$ErrorActionPreference = 'Stop'
$docx = Join-Path (Get-Location).Path 'competitor_qa.docx'
$pdf = Join-Path (Get-Location).Path 'competitor_qa.pdf'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx, $false, $true)
    $doc.SaveAs2($pdf, 17)
    $doc.Close($false)
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
Write-Output $pdf
