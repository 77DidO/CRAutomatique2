[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Section {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Message
    )

    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Get-ExecutablePath {
    param(
        [Parameter(Mandatory = $true)]
        [string] $CommandName
    )

    $commandInfo = Get-Command $CommandName -ErrorAction SilentlyContinue

    if (-not $commandInfo) {
        return $null
    }

    if ($commandInfo.Path) {
        return $commandInfo.Path
    }

    return $commandInfo.Source
}

function Ensure-NodeEnvironment {
    Write-Section 'Vérification de Node.js et npm'

    $nodePath = Get-ExecutablePath -CommandName 'node'
    if (-not $nodePath) {
        Write-Error 'Node.js est requis mais introuvable. Installez-le depuis https://nodejs.org/ puis relancez ce script.'
    }

    $npmCommand = if ($IsWindows) { 'npm.cmd' } else { 'npm' }
    $script:GlobalNpmPath = Get-ExecutablePath -CommandName $npmCommand

    if (-not $script:GlobalNpmPath) {
        Write-Error "npm est requis mais introuvable. Vérifiez votre installation Node.js et que $npmCommand est bien dans le PATH."
    }

    $nodeVersion = (& $nodePath --version).Trim()
    $npmVersion = (& $script:GlobalNpmPath --version).Trim()

    Write-Host "Node.js détecté : $nodeVersion"
    Write-Host "npm détecté    : $npmVersion"
}

function Install-Dependencies {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Directory
    )

    $fullPath = Join-Path -Path $PSScriptRoot -ChildPath $Directory

    Write-Section "Installation des dépendances pour $Directory"

    if (-not (Test-Path -Path $fullPath -PathType Container)) {
        Write-Error "Le dossier '$fullPath' est introuvable."
    }

    Push-Location $fullPath
    try {
        $process = Start-Process -FilePath $script:GlobalNpmPath -ArgumentList 'install' -NoNewWindow -Wait -PassThru

        if ($process.ExitCode -ne 0) {
            throw "Échec de l'installation des dépendances (code de sortie $($process.ExitCode))."
        }

        Write-Host '✅ Dépendances installées avec succès.'
    }
    finally {
        Pop-Location | Out-Null
    }
}

try {
    Ensure-NodeEnvironment

    Install-Dependencies -Directory 'backend'
    Install-Dependencies -Directory 'frontend'

    Write-Section 'Installation terminée'
    Write-Host '✅ Toutes les dépendances ont été installées avec succès.' -ForegroundColor Green
}
catch {
    Write-Error $_
    exit 1
}
