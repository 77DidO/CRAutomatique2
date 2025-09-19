import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const contentCache = new Map();

function MarkdownReport({ resourceUrl = null, preview = false }) {
  const [status, setStatus] = useState(resourceUrl ? 'idle' : 'missing');
  const [content, setContent] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [resourceUrl, preview]);

  useEffect(() => {
    if (!resourceUrl) {
      setStatus('missing');
      setContent('');
      return undefined;
    }

    if (contentCache.has(resourceUrl)) {
      setContent(contentCache.get(resourceUrl));
      setStatus('success');
      return undefined;
    }

    const controller = new AbortController();
    setStatus('loading');
    fetch(resourceUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch markdown');
        }
        return response.text();
      })
      .then((text) => {
        contentCache.set(resourceUrl, text);
        setContent(text);
        setStatus('success');
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return;
        }
        setContent('');
        setStatus('error');
      });

    return () => {
      controller.abort();
    };
  }, [resourceUrl]);

  const containerClassName = useMemo(() => {
    const classes = ['markdown-report'];
    if (preview) {
      classes.push('markdown-report--preview');
      if (!expanded) {
        classes.push('markdown-report--clamped');
      }
    }
    return classes.join(' ');
  }, [preview, expanded]);

  if (!resourceUrl) {
    return (
      <div className="markdown-report markdown-report--empty">
        <p className="text-base-content/70 m-0">Compte rendu indisponible.</p>
      </div>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="markdown-report markdown-report--loading">
        <p className="text-base-content/70 m-0">Chargement du compte rendu…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="markdown-report markdown-report--error">
        <p className="error-text m-0">Impossible de charger le compte rendu pour le moment.</p>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div className="markdown-report__content prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
      {preview && (
        <div className="markdown-report__actions">
          <button
            type="button"
            className="markdown-report__toggle"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? 'Réduire' : 'Lire la suite'}
          </button>
        </div>
      )}
    </div>
  );
}

MarkdownReport.propTypes = {
  resourceUrl: PropTypes.string,
  preview: PropTypes.bool
};

export default MarkdownReport;
