/**
 * Admin Settings Page
 * 
 * Allows admins to configure platform settings without code changes.
 * Features:
 * - Tabbed interface (Commission, General, Payments, Notifications)
 * - Password confirmation for critical settings
 * - Real-time validation
 * - Impact analysis preview
 * - Audit log viewer
 */

import { useEffect, useState } from 'react';
import { Settings, DollarSign, AlertTriangle, Check, X, History, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const AdminSettings = () => {
  // State management
  const [settings, setSettings] = useState({
    commission_settings: [],
    general_settings: [],
    payment_settings: [],
    notification_settings: []
  });
  const [activeTab, setActiveTab] = useState('commission');
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Modal state for confirmation
  const [pendingChange, setPendingChange] = useState({
    setting: null,
    newValue: null,
    password: '',
    reason: ''
  });
  
  // Impact analysis state
  const [impactAnalysis, setImpactAnalysis] = useState(null);

  /**
   * Fetch all settings grouped by type on component mount
   */
  useEffect(() => {
    fetchSettings();
  }, []);

  /**
   * Fetch settings from backend
   */
  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/settings/grouped');
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch audit log history
   */
  const fetchAuditLog = async () => {
    try {
      const response = await api.get('/admin/settings/audit-log?limit=50');
      setAuditLogs(response.data);
      setShowAuditLog(true);
    } catch (error) {
      toast.error('Failed to load audit log');
    }
  };

  /**
   * Handle setting value change
   * Shows confirmation modal for critical settings
   */
  const handleSettingChange = async (setting, newValue) => {
    // Validate value first
    try {
      const validation = await api.get(
        `/admin/settings/${setting.setting_key}/validate?value=${encodeURIComponent(JSON.stringify(newValue))}`
      );
      
      if (!validation.data.is_valid) {
        toast.error(`Invalid value: ${validation.data.errors.join(', ')}`);
        return;
      }
    } catch (error) {
      toast.error('Validation failed');
      return;
    }

    // Check if requires confirmation
    if (setting.requires_confirmation) {
      // Get impact analysis
      try {
        const impact = await api.get(
          `/admin/settings/${setting.setting_key}/impact?value=${encodeURIComponent(JSON.stringify(newValue))}`
        );
        setImpactAnalysis(impact.data);
      } catch (error) {
        console.error('Failed to get impact analysis', error);
      }

      // Show confirmation modal
      setPendingChange({
        setting,
        newValue,
        password: '',
        reason: ''
      });
      setShowConfirmModal(true);
    } else {
      // Update directly (non-critical setting)
      updateSettingDirect(setting, newValue);
    }
  };

  /**
   * Update setting directly (no confirmation needed)
   */
  const updateSettingDirect = async (setting, newValue) => {
    try {
      await api.put(`/admin/settings/${setting.setting_key}`, {
        value: newValue,
        reason: null
      });
      
      toast.success(`${setting.setting_name} updated successfully`);
      fetchSettings(); // Refresh settings
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update setting');
    }
  };

  /**
   * Confirm and apply critical setting change
   * Requires password verification
   */
  const confirmSettingChange = async () => {
    if (!pendingChange.password) {
      toast.error('Password is required');
      return;
    }

    try {
      const response = await api.post('/admin/settings/confirm', {
        setting_key: pendingChange.setting.setting_key,
        new_value: pendingChange.newValue,
        password: pendingChange.password,
        reason: pendingChange.reason || null
      });

      toast.success(response.data.message);
      
      // Show impact summary if available
      if (response.data.impact && response.data.impact.warnings.length > 0) {
        toast(response.data.impact.warnings.join('\n'), {
          icon: '⚠️',
          duration: 5000
        });
      }

      // Reset modal and refresh
      setShowConfirmModal(false);
      setPendingChange({ setting: null, newValue: null, password: '', reason: '' });
      setImpactAnalysis(null);
      fetchSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update setting');
    }
  };

  /**
   * Cancel pending change
   */
  const cancelChange = () => {
    setShowConfirmModal(false);
    setPendingChange({ setting: null, newValue: null, password: '', reason: '' });
    setImpactAnalysis(null);
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Get current tab settings
  const getCurrentTabSettings = () => {
    switch (activeTab) {
      case 'commission':
        return settings.commission_settings;
      case 'general':
        return settings.general_settings;
      case 'payment':
        return settings.payment_settings;
      case 'notification':
        return settings.notification_settings;
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
              <Settings className="h-10 w-10 mr-3 text-primary-600" />
              Platform Settings
            </h1>
            <p className="text-gray-600">Configure your marketplace without touching code</p>
          </div>
          
          {/* Audit Log Button */}
          <button
            onClick={fetchAuditLog}
            className="btn-secondary flex items-center"
          >
            <History className="h-5 w-5 mr-2" />
            View Change History
          </button>
        </div>

        {/* Warning Banner for Critical Settings */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
          <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900">Be Careful with Critical Settings</p>
            <p className="text-sm text-yellow-700 mt-1">
              Settings marked with <Lock className="h-4 w-4 inline text-yellow-600" /> require password confirmation.
              All changes are logged and can be audited.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="card mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {/* Commission Tab */}
              <button
                onClick={() => setActiveTab('commission')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'commission'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Commission Settings
                {settings.commission_settings.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {settings.commission_settings.length}
                  </span>
                )}
              </button>

              {/* General Tab */}
              <button
                onClick={() => setActiveTab('general')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'general'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="h-5 w-5 mr-2" />
                General Settings
                {settings.general_settings.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {settings.general_settings.length}
                  </span>
                )}
              </button>

              {/* Payment Tab */}
              <button
                onClick={() => setActiveTab('payment')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'payment'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Payment Settings
                {settings.payment_settings.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {settings.payment_settings.length}
                  </span>
                )}
              </button>

              {/* Notification Tab */}
              <button
                onClick={() => setActiveTab('notification')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'notification'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="h-5 w-5 mr-2" />
                Notifications
                {settings.notification_settings.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {settings.notification_settings.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Settings List */}
          <div className="p-6">
            {getCurrentTabSettings().length === 0 ? (
              <div className="text-center py-12">
                <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No settings available in this category</p>
              </div>
            ) : (
              <div className="space-y-6">
                {getCurrentTabSettings().map((setting) => (
                  <SettingItem
                    key={setting.id}
                    setting={setting}
                    onUpdate={handleSettingChange}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <ConfirmationModal
            setting={pendingChange.setting}
            newValue={pendingChange.newValue}
            password={pendingChange.password}
            reason={pendingChange.reason}
            impactAnalysis={impactAnalysis}
            onPasswordChange={(e) => setPendingChange({ ...pendingChange, password: e.target.value })}
            onReasonChange={(e) => setPendingChange({ ...pendingChange, reason: e.target.value })}
            onConfirm={confirmSettingChange}
            onCancel={cancelChange}
          />
        )}

        {/* Audit Log Modal */}
        {showAuditLog && (
          <AuditLogModal
            logs={auditLogs}
            onClose={() => setShowAuditLog(false)}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Individual Setting Item Component
 * Renders appropriate input based on setting type
 */
const SettingItem = ({ setting, onUpdate }) => {
  const [localValue, setLocalValue] = useState(setting.setting_value);
  const [hasChanged, setHasChanged] = useState(false);

  // Render input based on value type
  const renderInput = () => {
    // Boolean toggle
    if (typeof setting.setting_value === 'boolean') {
      return (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={localValue}
            onChange={(e) => {
              setLocalValue(e.target.checked);
              setHasChanged(true);
            }}
            disabled={!setting.is_editable}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          <span className="ml-3 text-sm font-medium text-gray-700">
            {localValue ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      );
    }

    // Number input
    if (typeof setting.setting_value === 'number') {
      return (
        <input
          type="number"
          value={localValue}
          onChange={(e) => {
            setLocalValue(parseFloat(e.target.value));
            setHasChanged(true);
          }}
          min={setting.min_value}
          max={setting.max_value}
          step={setting.setting_key.includes('rate') ? 0.1 : 1}
          disabled={!setting.is_editable}
          className="input-field max-w-xs"
        />
      );
    }

    // Text input
    return (
      <input
        type="text"
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          setHasChanged(true);
        }}
        disabled={!setting.is_editable}
        className="input-field max-w-md"
      />
    );
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${hasChanged ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-grow">
          <div className="flex items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {setting.setting_name}
            </h3>
            {setting.requires_confirmation && (
              <Lock className="h-4 w-4 text-yellow-600 ml-2" title="Requires password confirmation" />
            )}
            {!setting.is_editable && (
              <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                Read-only
              </span>
            )}
          </div>
          
          {setting.setting_description && (
            <p className="text-sm text-gray-600 mb-3">{setting.setting_description}</p>
          )}

          {/* Validation constraints */}
          {(setting.min_value !== null || setting.max_value !== null) && (
            <p className="text-xs text-gray-500 mb-3">
              Valid range: {setting.min_value ?? 'any'} - {setting.max_value ?? 'any'}
            </p>
          )}

          {/* Input field */}
          <div className="mb-3">
            {renderInput()}
          </div>

          {/* Current value display */}
          <p className="text-xs text-gray-500">
            Current value: <span className="font-mono font-semibold">{JSON.stringify(setting.setting_value)}</span>
          </p>
        </div>

        {/* Save/Cancel buttons (shown when changed) */}
        {hasChanged && (
          <div className="ml-4 flex flex-col space-y-2">
            <button
              onClick={() => {
                onUpdate(setting, localValue);
                setHasChanged(false);
              }}
              className="btn-primary text-sm flex items-center px-3 py-2"
            >
              <Check className="h-4 w-4 mr-1" />
              Save
            </button>
            <button
              onClick={() => {
                setLocalValue(setting.setting_value);
                setHasChanged(false);
              }}
              className="btn-secondary text-sm flex items-center px-3 py-2"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Confirmation Modal Component
 * Shows impact analysis and requires password
 */
const ConfirmationModal = ({
  setting,
  newValue,
  password,
  reason,
  impactAnalysis,
  onPasswordChange,
  onReasonChange,
  onConfirm,
  onCancel
}) => {
  if (!setting) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Confirm Critical Change</h2>
              <p className="text-sm text-gray-600">This setting requires password verification</p>
            </div>
          </div>

          {/* Setting Info */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600 mb-2">Setting:</p>
            <p className="font-semibold text-lg mb-3">{setting.setting_name}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Current Value:</p>
                <p className="font-mono text-sm text-gray-900">{JSON.stringify(setting.setting_value)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">New Value:</p>
                <p className="font-mono text-sm text-green-600 font-semibold">{JSON.stringify(newValue)}</p>
              </div>
            </div>
          </div>

          {/* Impact Analysis */}
          {impactAnalysis && (
            <div className={`p-4 rounded-lg mb-4 ${
              impactAnalysis.estimated_impact === 'High' ? 'bg-red-50 border border-red-200' :
              impactAnalysis.estimated_impact === 'Medium' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <p className="font-semibold mb-2">Impact Analysis:</p>
              <p className="text-sm mb-2">
                <span className="font-medium">Estimated Impact:</span>{' '}
                <span className={`font-bold ${
                  impactAnalysis.estimated_impact === 'High' ? 'text-red-600' :
                  impactAnalysis.estimated_impact === 'Medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`}>
                  {impactAnalysis.estimated_impact}
                </span>
              </p>

              {/* Affected Entities */}
              {Object.keys(impactAnalysis.affected_entities).length > 0 && (
                <div className="mb-2">
                  <p className="text-sm font-medium mb-1">Affected:</p>
                  <ul className="text-sm space-y-1">
                    {Object.entries(impactAnalysis.affected_entities).map(([key, value]) => (
                      <li key={key} className="flex items-start">
                        <span className="text-gray-600">• {value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {impactAnalysis.warnings.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1 text-orange-700">⚠️ Warnings:</p>
                  <ul className="text-sm space-y-1">
                    {impactAnalysis.warnings.map((warning, index) => (
                      <li key={index} className="text-orange-700">• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Password Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={onPasswordChange}
              placeholder="Enter your password to confirm"
              className="input-field"
              autoFocus
            />
          </div>

          {/* Reason Input (optional) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Change (Optional)
            </label>
            <textarea
              value={reason}
              onChange={onReasonChange}
              placeholder="Why are you making this change?"
              rows="3"
              className="input-field"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!password}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Change
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Audit Log Modal Component
 * Shows history of all setting changes
 */
const AuditLogModal = ({ logs, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <History className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Settings Change History</h2>
                <p className="text-sm text-gray-600">Audit trail of all setting modifications</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Log Entries */}
        <div className="flex-grow overflow-y-auto p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No changes recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{log.setting_key}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()} by {log.changed_by_name || 'Unknown'}
                      </p>
                    </div>
                    {log.ip_address && (
                      <span className="text-xs text-gray-500 font-mono">{log.ip_address}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Old Value:</p>
                      <p className="font-mono text-sm text-red-600">
                        {log.old_value !== null ? JSON.stringify(log.old_value) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">New Value:</p>
                      <p className="font-mono text-sm text-green-600">
                        {JSON.stringify(log.new_value)}
                      </p>
                    </div>
                  </div>

                  {log.change_reason && (
                    <div className="bg-white p-2 rounded">
                      <p className="text-xs text-gray-500">Reason:</p>
                      <p className="text-sm text-gray-700">{log.change_reason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button onClick={onClose} className="btn-primary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
