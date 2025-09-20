[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$IsWindows = [Environment]::OSVersion.Platform -eq 'Win32NT'

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

function Ensure-PythonEnvironment {
    Write-Section 'Vérification de Python et pip'

    $candidates = @('python', 'python3')
    foreach ($candidate in $candidates) {
        $commandInfo = Get-Command $candidate -ErrorAction SilentlyContinue
        if (-not $commandInfo) {
            continue
        }

        $commandPath = if ($commandInfo.Path) { $commandInfo.Path } else { $commandInfo.Source }
        if ($commandPath -and $commandPath -like '*WindowsApps*') {
            Write-Host "Commande $candidate ignorée car elle pointe vers le lanceur Windows Store ($commandPath)."
            continue
        }

        $script:PythonCommand = $candidate
        break
    }

    if (-not $script:PythonCommand) {
        Write-Error 'Python 3 est requis mais introuvable. Installez-le depuis https://www.python.org/downloads/ puis relancez ce script.'
    }

    $pythonVersion = (& $script:PythonCommand --version 2>&1).Trim()
    Write-Host "Python détecté : $pythonVersion"

    $pipVersionOutput = & $script:PythonCommand -m pip --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'pip est requis mais introuvable. Vérifiez votre installation Python et activez l''option "Add python.exe to PATH".'
    }

    Write-Host "pip détecté    : $($pipVersionOutput.Trim())"
}

function Install-WhisperCLI {
    Write-Section 'Installation de la CLI Whisper'

    if (-not $script:PythonCommand) {
        Write-Error 'Python doit être détecté avant d''installer Whisper.'
    }

    & $script:PythonCommand -m pip show openai-whisper *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Host '✅ Whisper est déjà installé via pip.'
        return
    }

    Write-Host 'Mise à niveau de pip...'
    & $script:PythonCommand -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'Échec de la mise à niveau de pip. Consultez les messages ci-dessus.'
    }

    Write-Host 'Installation de openai/whisper...'
    & $script:PythonCommand -m pip install --upgrade git+https://github.com/openai/whisper.git
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'Échec de l''installation de Whisper. Consultez les messages ci-dessus.'
    }

    Write-Host '✅ Whisper a été installé avec succès.'
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

    Ensure-PythonEnvironment

    Install-Dependencies -Directory 'backend'
    Install-Dependencies -Directory 'frontend'

    Install-WhisperCLI

    Write-Section 'Installation terminée'
    Write-Host '✅ Toutes les dépendances ont été installées avec succès.' -ForegroundColor Green
}
catch {
    Write-Error $_
    exit 1
}
