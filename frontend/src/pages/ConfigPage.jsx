import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Row, Stack } from 'react-bootstrap';
import { fetchConfig, updateConfig } from '../services/api.js';

function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig().then((data) => {
      setConfig(data);
      setDraft(data);
    });
  }, []);

  const hasChanged = useMemo(() => JSON.stringify(config) !== JSON.stringify(draft), [config, draft]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDraft((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleProviderChange = (providerKey, field) => (event) => {
    const { value } = event.target;
    setDraft((prev) => ({
      ...prev,
      providers: {
        ...(prev.providers || {}),
        [providerKey]: {
          ...(prev.providers?.[providerKey] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const next = await updateConfig(draft);
    setConfig(next);
    setDraft(next);
    setSaving(false);
  };

  if (!draft) {
    return <p>Chargement...</p>;
  }

  const providers = draft.providers || {};
  const chatgpt = providers.chatgpt || {};
  const ollama = providers.ollama || {};

  return (
    <Card className="shadow-sm border-0">
      <Card.Body>
        <Form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
          <div>
            <h4>Configuration</h4>
          </div>

          <Stack gap={3}>
            <div>
              <h5>Général</h5>
              <Stack gap={3} className="mt-3">
                <Form.Group controlId="defaultTemplate">
                  <Form.Label>Gabarit par défaut</Form.Label>
                  <Form.Control
                    type="text"
                    name="defaultTemplate"
                    value={draft.defaultTemplate || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
                <Form.Group controlId="participants">
                  <Form.Label>Participants par défaut</Form.Label>
                  <Form.Control
                    type="text"
                    name="participants"
                    value={(draft.participants || []).join(', ')}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        participants: event.target.value
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean)
                      }))
                    }
                  />
                  <Form.Text>Séparer les participants par une virgule</Form.Text>
                </Form.Group>
              </Stack>
            </div>

            <div>
              <h5>Pipeline</h5>
              <Stack gap={2} className="mt-3">
                <Form.Check
                  type="switch"
                  id="diarization"
                  name="diarization"
                  label="Activer la diarisation"
                  checked={draft.diarization}
                  onChange={handleChange}
                />
                <Form.Check
                  type="switch"
                  id="enableSummary"
                  name="enableSummary"
                  label="Générer la synthèse Markdown"
                  checked={draft.enableSummary}
                  onChange={handleChange}
                />
              </Stack>
            </div>

            <div>
              <h5>LLM</h5>
              <Stack gap={3} className="mt-3">
                <Form.Group controlId="llmProvider">
                  <Form.Label>Fournisseur</Form.Label>
                  <Form.Select name="llmProvider" value={draft.llmProvider} onChange={handleChange}>
                    <option value="chatgpt">ChatGPT (OpenAI)</option>
                    <option value="ollama">Ollama</option>
                  </Form.Select>
                </Form.Group>

                {draft.llmProvider === 'ollama' ? (
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <Form.Group controlId="ollamaModel">
                        <Form.Label>Modèle Ollama</Form.Label>
                        <Form.Control
                          type="text"
                          value={ollama.model || ''}
                          onChange={handleProviderChange('ollama', 'model')}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="ollamaCommand">
                        <Form.Label>Commande Ollama</Form.Label>
                        <Form.Control
                          type="text"
                          value={ollama.command || ''}
                          onChange={handleProviderChange('ollama', 'command')}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                ) : (
                  <Row className="g-3">
                    <Col xs={12} md={4}>
                      <Form.Group controlId="chatgptModel">
                        <Form.Label>Modèle ChatGPT</Form.Label>
                        <Form.Control
                          type="text"
                          value={chatgpt.model || ''}
                          onChange={handleProviderChange('chatgpt', 'model')}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Group controlId="chatgptApiKey">
                        <Form.Label>Clé API ChatGPT</Form.Label>
                        <Form.Control
                          type="password"
                          value={chatgpt.apiKey || ''}
                          onChange={handleProviderChange('chatgpt', 'apiKey')}
                          placeholder="sk-..."
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Group controlId="chatgptBaseUrl">
                        <Form.Label>Base URL (optionnel)</Form.Label>
                        <Form.Control
                          type="text"
                          value={chatgpt.baseUrl || ''}
                          onChange={handleProviderChange('chatgpt', 'baseUrl')}
                          placeholder="https://api.openai.com/v1"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}
              </Stack>
            </div>
          </Stack>

          <div className="d-flex justify-content-end">
            <Button type="submit" disabled={!hasChanged || saving}>
              {saving ? 'Enregistrement...' : 'Sauvegarder'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default ConfigPage;
