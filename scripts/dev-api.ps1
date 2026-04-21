$ErrorActionPreference = "Stop"

function Resolve-JavaHome {
  if ($env:JAVA_HOME) {
    $javaExe = Join-Path $env:JAVA_HOME "bin\java.exe"
    if (Test-Path $javaExe) {
      return $env:JAVA_HOME
    }
  }

  $directCandidates = @(
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot",
    "C:\Program Files\Java\jdk-21"
  )

  foreach ($candidate in $directCandidates) {
    if (Test-Path (Join-Path $candidate "bin\java.exe")) {
      return $candidate
    }
  }

  $wildcardCandidates = @(
    "C:\Program Files\Eclipse Adoptium\jdk-21*",
    "C:\Program Files\Java\jdk-21*"
  )

  foreach ($pattern in $wildcardCandidates) {
    $matches = Get-ChildItem -Path $pattern -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
    foreach ($match in $matches) {
      $home = $match.FullName
      if (Test-Path (Join-Path $home "bin\java.exe")) {
        return $home
      }
    }
  }

  throw "No se encontro Java 21. Instala JDK 21 o define JAVA_HOME."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$resolvedJavaHome = Resolve-JavaHome
$env:JAVA_HOME = $resolvedJavaHome

$javaBin = Join-Path $env:JAVA_HOME "bin"
if (-not $env:Path.StartsWith("$javaBin;", [System.StringComparison]::OrdinalIgnoreCase)) {
  $env:Path = "$javaBin;$env:Path"
}

Write-Host "Usando JAVA_HOME=$env:JAVA_HOME"

Push-Location $repoRoot
try {
  & ".\apps\api\gradlew.bat" "-p" "apps/api" "bootRun"
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
