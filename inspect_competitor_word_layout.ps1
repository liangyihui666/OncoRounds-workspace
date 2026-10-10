$ErrorActionPreference = 'Stop'
$docx = Join-Path (Get-Location).Path 'competitor_qa.docx'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx, $false, $true)
    $doc.Repaginate()
    $pages = $doc.ComputeStatistics(2)
    $paragraphs = $doc.Paragraphs.Count
    $tables = $doc.Tables.Count
    $inlineShapes = $doc.InlineShapes.Count
    Write-Output "pages=$pages paragraphs=$paragraphs tables=$tables inlineShapes=$inlineShapes"
    $doc.Close($false)
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
