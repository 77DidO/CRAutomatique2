import { useEffect, useState } from 'react';

function MarkdownViewer({ url }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setContent('');
      return;
    }
    let ignore = false;
    setIsLoading(true);
    setError(null);
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Réponse réseau invalide');
        }
        return response.text();
      })
      .then((text) => {
        if (!ignore) {
          setContent(text);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError("Impossible de charger le résumé");
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [url]);

  if (!url) {
    return <p className="empty-placeholder">Aucun résumé disponible.</p>;
  }

  if (isLoading) {
    return <p>Chargement du résumé…</p>;
  }

  if (error) {
    return <p className="form__error">{error}</p>;
  }

  return <pre className="markdown-viewer">{content}</pre>;
}

export default MarkdownViewer;
