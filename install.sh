#!/usr/bin/env bash

set -u

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

install_dir "backend"
install_dir "frontend"

echo "✅ Toutes les dépendances ont été installées avec succès."
