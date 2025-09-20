#!/usr/bin/env bash

set -u

PYTHON_CMD=""

ensure_python() {
  echo "==> Vérification de Python et pip"

  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      PYTHON_CMD="$candidate"
      break
    fi
  done

  if [ -z "$PYTHON_CMD" ]; then
    echo "Erreur : Python 3 est requis mais introuvable. Installez-le puis relancez ce script."
    exit 1
  fi

  python_version="$($PYTHON_CMD --version 2>&1)"
  echo "Python détecté  : $python_version"

  if ! pip_version="$($PYTHON_CMD -m pip --version 2>&1)"; then
    echo "Erreur : pip est requis mais introuvable. Installez le paquet python3-pip ou équivalent puis relancez ce script."
    exit 1
  fi

  echo "pip détecté     : $pip_version"
}

install_whisper() {
  echo "==> Installation de la CLI Whisper"

  if [ -z "$PYTHON_CMD" ]; then
    echo "Erreur : Python doit être détecté avant d'installer Whisper."
    exit 1
  fi

  if $PYTHON_CMD -m pip show openai-whisper >/dev/null 2>&1; then
    echo "✅ Whisper est déjà installé via pip."
    return
  fi

  echo "Mise à niveau de pip..."
  if ! $PYTHON_CMD -m pip install --upgrade pip; then
    echo "❌ Échec de la mise à niveau de pip."
    exit 1
  fi

  echo "Installation de openai/whisper..."
  if $PYTHON_CMD -m pip install --upgrade 'git+https://github.com/openai/whisper.git'; then
    echo "✅ Whisper a été installé avec succès."
  else
    echo "❌ Échec de l'installation de Whisper. Consultez les logs ci-dessus."
    exit 1
  fi
}

install_dir() {
  local dir="$1"
  echo "==> Installation des dépendances pour $dir"

  if [ ! -d "$dir" ]; then
    echo "Erreur : le dossier $dir est introuvable."
    exit 1
  fi

  pushd "$dir" >/dev/null || {
    echo "Erreur : impossible d'entrer dans le dossier $dir."
    exit 1
  }

  if npm install; then
    echo "✅ Dépendances installées pour $dir."
  else
    echo "❌ Échec de l'installation des dépendances dans $dir."
    popd >/dev/null
    exit 1
  fi

  popd >/dev/null
}

ensure_python
install_dir "backend"
install_dir "frontend"
install_whisper

echo "✅ Toutes les dépendances ont été installées avec succès."
