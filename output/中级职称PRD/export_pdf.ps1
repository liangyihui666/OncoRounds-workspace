$ErrorActionPreference='Stop'
$source=Join-Path $PSScriptRoot '医考Go_肿瘤中级职称_PRD_全新版.docx'
$target=Join-Path $PSScriptRoot 'qa/prd-new.pdf'
$word=$null
$doc=$null
try {
 $word=New-Object -ComObject Word.Application
 $word.Visible=$false
 $word.DisplayAlerts=0
 $doc=$word.Documents.Open($source,$false,$true)
 $doc.Repaginate()
 $doc.ExportAsFixedFormat($target,17)
 Write-Output ('Pages: '+$doc.ComputeStatistics(2))
} finally {
 if($null -ne $doc){$doc.Close(0)}
 if($null -ne $word){$word.Quit()}
}
