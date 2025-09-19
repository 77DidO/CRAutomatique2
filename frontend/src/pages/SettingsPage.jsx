import { useCallback, useEffect, useState } from 'react';
import ConfigForm from '../components/ConfigForm.jsx';
import TemplatesEditor from '../components/TemplatesEditor.jsx';
import { fetchConfig, updateConfig, updateTemplates } from '../services/api.js';

function SettingsPage() {
  const [config, setConfig] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [templatesSaved, setTemplatesSaved] = useState(false);

  const loadConfig = useCallback(() => {
    fetchConfig()
      .then((data) => {
        setConfig(data);
        setTemplates(data.templates || []);
      })
      .catch(() => {
        setConfig(null);
        setTemplates([]);
      });
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleConfigSubmit = async (nextConfig) => {
    setIsSavingConfig(true);
    setConfigSaved(false);
    try {
      const saved = await updateConfig(nextConfig);
      setConfig(saved);
      setTemplates(saved.templates || templates);
      setConfigSaved(true);
    } catch (error) {
      alert('Impossible de mettre à jour la configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTemplatesSubmit = async (nextTemplates) => {
    setIsSavingTemplates(true);
    setTemplatesSaved(false);
    try {
      const saved = await updateTemplates(nextTemplates);
      setTemplates(saved);
      setTemplatesSaved(true);
      loadConfig();
    } catch (error) {
      alert('Impossible de sauvegarder les modèles.');
    } finally {
      setIsSavingTemplates(false);
    }
  };

  return (
    <div className="page">
      <h1>Paramètres</h1>
      {!config && <p>Chargement de la configuration…</p>}
      {config && (
        <>
          <ConfigForm
            config={config}
            templates={templates}
            onSubmit={handleConfigSubmit}
            isSaving={isSavingConfig}
          />
          {configSaved && <p className="form__success">Configuration mise à jour.</p>}

          <TemplatesEditor
            templates={templates}
            onSubmit={handleTemplatesSubmit}
            isSaving={isSavingTemplates}
          />
          {templatesSaved && <p className="form__success">Modèles enregistrés.</p>}
        </>
      )}
    </div>
  );
}

export default SettingsPage;
