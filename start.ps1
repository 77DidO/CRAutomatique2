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

function Resolve-PowerShellCommand {
    if ($IsWindows) {
        $pwshPath = Get-ExecutablePath -CommandName 'pwsh'
        if ($pwshPath) {
            return $pwshPath
        }

        $powershellPath = Get-ExecutablePath -CommandName 'powershell'
        if ($powershellPath) {
            return $powershellPath
        }

        throw "Aucune installation de PowerShell n'a été trouvée (ni pwsh ni powershell.exe)."
    }

    $pwshPath = Get-ExecutablePath -CommandName 'pwsh'
    if (-not $pwshPath) {
        throw 'pwsh est requis pour lancer les services en parallèle.'
    }

    return $pwshPath
}

function Start-ServiceProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Directory,

        [Parameter(Mandatory = $true)]
        [string] $DisplayName
    )

    $fullPath = Join-Path -Path $PSScriptRoot -ChildPath $Directory

    if (-not (Test-Path -LiteralPath $fullPath -PathType Container)) {
        throw "Le dossier '$fullPath' est introuvable."
    }

    Write-Section "Démarrage du service $DisplayName"

    $psCommand = Resolve-PowerShellCommand
    $escapedPath = $fullPath -replace "'", "''"
    $commandScript = "Set-Location -LiteralPath '$escapedPath'; npm run dev"

    $arguments = @('-NoExit', '-Command', $commandScript)

    try {
        $process = Start-Process -FilePath $psCommand -ArgumentList $arguments -WorkingDirectory $fullPath -PassThru
        Write-Host "✅ Service $DisplayName lancé (PID $($process.Id))."
    }
    catch {
        Write-Warning "Impossible de lancer une nouvelle fenêtre PowerShell pour $DisplayName : $($_.Exception.Message)"
        Write-Warning 'Tentative de lancement via Start-Job (logs accessibles avec Receive-Job).'

        $job = Start-Job -ScriptBlock {
            param($PwshExecutable, $Command)
            & $PwshExecutable -NoExit -Command $Command
        } -ArgumentList $psCommand, $commandScript

        Write-Host "Job démarré pour $DisplayName (Id $($job.Id))."
    }
}

try {
    Start-ServiceProcess -Directory 'backend' -DisplayName 'backend'
    Start-ServiceProcess -Directory 'frontend' -DisplayName 'frontend'

    Write-Section 'Tous les services ont été lancés'
    Write-Host 'Les fenêtres ouvertes restent actives pour afficher les logs. Fermez-les manuellement pour arrêter les services.'
}
catch {
    Write-Error $_
    exit 1
}
