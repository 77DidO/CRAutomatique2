# Fonction pour créer et configurer l'environnement Python
function Setup-PythonEnvironment {
    Write-Section "Configuration de l'environnement Python"
    
    # Aller dans le dossier backend
    Push-Location "$PSScriptRoot\backend"
    
    try {
        # Créer l'environnement virtuel s'il n'existe pas
        if (-not (Test-Path ".venv")) {
            Write-Host "Création de l'environnement virtuel Python..."
            python -m venv .venv
        }
        
        # Activer l'environnement virtuel
        Write-Host "Activation de l'environnement virtuel..."
        .\.venv\Scripts\Activate.ps1
        
        # Installer/Mettre à jour pip
        Write-Host "Mise à jour de pip..."
        python -m pip install --upgrade pip
        
        # Installer les dépendances Python
        Write-Host "Installation des dépendances Python..."
        pip install torch openai-whisper
        
        # Vérifier l'installation
        Write-Host "Vérification de l'installation..."
        python -c "import whisper; print(f'Whisper installé avec succès, version: {whisper.__version__}')"
        
        # Mettre à jour le fichier .env
        $envContent = @"
DATA_ROOT=$PSScriptRoot\backend\data
WHISPER_PYTHON_PATH=$PSScriptRoot\backend\.venv\Scripts\python.exe
PYTHONPATH=$PSScriptRoot\backend\.venv\Lib\site-packages
FFMPEG_PATH=$env:USERPROFILE\scoop\apps\ffmpeg\current\bin\ffmpeg.exe
"@
        
        Set-Content -Path ".env" -Value $envContent
        Write-Host "Fichier .env mis à jour avec succès"
        
    } finally {
        # Revenir au dossier initial
        Pop-Location
    }
}

# Appeler la fonction dans le script principal
Setup-PythonEnvironment