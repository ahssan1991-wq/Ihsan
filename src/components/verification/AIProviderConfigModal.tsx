/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Cpu,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { AIProviderConfig, AIProviderType, AITaskType } from '../../types';
import { getStoredAIConfig, saveStoredAIConfig, executeAIEngineeringTask } from '../../services/aiProviderService';

interface AIProviderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIProviderConfigModal: React.FC<AIProviderConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AIProviderConfig>(() => getStoredAIConfig());
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string; provider: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredAIConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await executeAIEngineeringTask(
        AITaskType.MATERIAL_IDENTIFICATION,
        {
          manufacturer: 'Rosemount / Emerson',
          model: '3051S',
          partNumber: '3051S2TG4A2B11A1AB4'
        }
      );
      if (res.success) {
        setTestResult({
          success: true,
          msg: `Connection verified! Task completed in sub-second using provider: ${res.providerUsed}`,
          provider: res.providerUsed
        });
      } else {
        setTestResult({
          success: false,
          msg: res.error || 'Failed to communicate with AI Provider.',
          provider: res.providerUsed
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: err?.message || 'Error executing AI test call.',
        provider: config.activeProvider
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-industrial-850 rounded-2xl border border-industrial-200 dark:border-industrial-750 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-industrial-200 dark:border-industrial-750 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-industrial-900 dark:text-white">
                AI Engineering Provider Configuration
              </h3>
              <p className="text-xs text-industrial-500">
                Configure models, temperature, and fallback resilience
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-industrial-400 hover:text-industrial-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Active Provider Selector */}
          <div>
            <label className="font-bold text-industrial-800 dark:text-industrial-200 block mb-1.5">
              Active AI Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['automatic', 'gemini', 'openai', 'disabled'] as AIProviderType[]).map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setConfig({ ...config, activeProvider: prov })}
                  className={`py-2 px-2.5 rounded-xl font-bold border capitalize transition-colors cursor-pointer text-center ${
                    config.activeProvider === prov
                      ? 'bg-brand-600 text-white border-brand-700 shadow-xs'
                      : 'bg-industrial-50 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 border-industrial-200 dark:border-industrial-700'
                  }`}
                >
                  {prov}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-industrial-400 mt-1">
              "Automatic" defaults to server-side resilient Gemini with multi-model failover.
            </p>
          </div>

          {/* Model Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">
                Gemini Model
              </label>
              <select
                value={config.geminiModel || 'gemini-3.8-flash'}
                onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Fast)</option>
                <option value="gemini-flash-latest">gemini-flash-latest</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex Reasoning)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">
                OpenAI Model (If Active)
              </label>
              <select
                value={config.openaiModel || 'gpt-4o-mini'}
                onChange={(e) => setConfig({ ...config, openaiModel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Default)</option>
                <option value="gpt-4o">gpt-4o (Full Reasoning)</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>
            </div>
          </div>

          {/* Temperature & Token Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-industrial-600 dark:text-industrial-300">
                  Temperature ({config.temperature ?? 0.2})
                </label>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.temperature ?? 0.2}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-[10px] text-industrial-400">Lower = More deterministic engineering facts</span>
            </div>

            <div>
              <label className="font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">
                Max Output Tokens
              </label>
              <input
                type="number"
                value={config.maxTokens ?? 2048}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value, 10) || 2048 })}
                className="w-full px-3 py-1.5 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
              />
            </div>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div className={`p-3 rounded-xl border flex items-start gap-2 ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'}`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              <div>
                <span className="font-bold block">{testResult.success ? 'Provider Test Passed' : 'Provider Test Failed'}</span>
                <span className="text-[11px]">{testResult.msg}</span>
              </div>
            </div>
          )}

          {savedSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold text-center">
              Configuration successfully saved!
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-industrial-200 dark:border-industrial-750">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="py-2 px-3 rounded-xl bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 text-industrial-700 dark:text-industrial-200 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing Provider...' : 'Test AI Connection'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-3 rounded-xl text-industrial-600 dark:text-industrial-300 hover:bg-industrial-100"
              >
                Close
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded-xl font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-xs"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
