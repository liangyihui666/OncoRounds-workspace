param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    [Parameter(Mandatory = $true)]
    [string]$CaseId,
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,
    [Parameter(Mandatory = $true)]
    [string]$BaseName
)

$ErrorActionPreference = 'Stop'

function Get-LastMarkedObject {
    param(
        [string]$Text,
        [string]$Marker
    )

    $markerIndex = $Text.LastIndexOf($Marker, [System.StringComparison]::Ordinal)
    if ($markerIndex -lt 0) {
        throw "未找到标记：$Marker"
    }

    $start = $Text.IndexOf('{', $markerIndex)
    if ($start -lt 0) {
        throw "标记后未找到 JSON 根对象：$Marker"
    }

    $depth = 0
    for ($i = $start; $i -lt $Text.Length; $i++) {
        if ($Text[$i] -eq '{') {
            $depth++
        }
        elseif ($Text[$i] -eq '}') {
            $depth--
            if ($depth -eq 0) {
                return $Text.Substring($start, $i - $start + 1)
            }
        }
    }

    throw "JSON 根对象括号不完整：$Marker"
}

function Normalize-And-SaveJson {
    param(
        [string]$JsonText,
        [string]$DestinationPath
    )

    $fixed = $JsonText.Replace('予以"PD-1+AcP"方案', '予以“PD-1+AcP”方案')
    $fixed = $fixed.Replace('继续"PD-1+AcP 方案', '继续“PD-1+AcP 方案')
    $fixed = $fixed.Replace('患者三线"D+T"再挑战治疗影像学表现', '患者三线“D+T”再挑战治疗影像学表现')
    $fixed = [regex]::Replace(
        $fixed,
        '"case_id"\s*:\s*""',
        '"case_id": "' + $CaseId + '"',
        1
    )

    $object = $fixed | ConvertFrom-Json
    $formatted = $object | ConvertTo-Json -Depth 100
    Set-Content -LiteralPath $DestinationPath -Value $formatted -Encoding utf8
}

$text = Get-Content -LiteralPath $SourcePath -Raw
$questionJson = Get-LastMarkedObject -Text $text -Marker '【题目JSON】'
$detailJson = Get-LastMarkedObject -Text $text -Marker '【病例详情页JSON】'

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$questionPath = Join-Path $OutputDirectory "$BaseName-题目JSON.json"
$detailPath = Join-Path $OutputDirectory "$BaseName-病例详情页.json"

Normalize-And-SaveJson -JsonText $questionJson -DestinationPath $questionPath
Normalize-And-SaveJson -JsonText $detailJson -DestinationPath $detailPath

[pscustomobject]@{
    QuestionPath = $questionPath
    DetailPath = $detailPath
}
