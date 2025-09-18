$ErrorActionPreference = 'Stop'

function Install-Dependencies {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Directory
    )

    Write-Host "==> Installation des dépendances pour $Directory"

    if (-not (Test-Path -Path $Directory -PathType Container)) {
        Write-Error "Erreur : le dossier $Directory est introuvable."
        exit 1
    }

    Push-Location $Directory
    try {
        $process = Start-Process -FilePath 'npm' -ArgumentList 'install' -NoNewWindow -Wait -PassThru

        if ($process.ExitCode -ne 0) {
            Write-Error "❌ Échec de l'installation des dépendances dans $Directory."
            exit $process.ExitCode
        }

        Write-Host "✅ Dépendances installées pour $Directory."
    }
    catch {
        Write-Error "Erreur inattendue : $($_.Exception.Message)"
        exit 1
    }
    finally {
        Pop-Location | Out-Null
    }
}

Install-Dependencies -Directory 'backend'
Install-Dependencies -Directory 'frontend'

Write-Host '✅ Toutes les dépendances ont été installées avec succès.'
