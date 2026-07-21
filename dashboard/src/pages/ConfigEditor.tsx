import { useState, useEffect } from 'react';
import { api } from '../api';

export default function ConfigEditor() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    api.getConfig()
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        setToast({ msg: err.message, type: 'error' });
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateConfig(config);
      setToast({ msg: 'Configuration saved successfully', type: 'success' });
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to save configuration', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleChange = (section: string, key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  if (loading) return <div>Loading configuration...</div>;
  if (!config) return <div>Failed to load configuration.</div>;

  const renderField = (section: string, key: string, val: any) => {
    const isBool = typeof val === 'boolean';
    const isNum = typeof val === 'number';

    if (isBool) {
      return (
        <select
          value={val ? 'true' : 'false'}
          onChange={(e) => handleChange(section, key, e.target.value === 'true')}
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      );
    }

    return (
      <input
        type={isNum ? 'number' : 'text'}
        value={val || ''}
        onChange={(e) => handleChange(section, key, isNum ? Number(e.target.value) : e.target.value)}
        placeholder={`Enter ${key}`}
      />
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Configuration</h1>
        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          padding: '12px 24px',
          borderRadius: '8px',
          background: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {Object.entries(config).map(([section, settings]: [string, any]) => {
          if (typeof settings !== 'object' || settings === null) return null;
          return (
            <div key={section} className="glass-card">
              <h3 style={{ textTransform: 'capitalize', color: 'var(--primary)', marginBottom: '16px' }}>
                {section}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {Object.entries(settings).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    {renderField(section, key, val)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
