import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { checkDatabaseHealth } from '../lib/supabase';

export default function DatabaseHealthCheck() {
  const [health, setHealth] = useState<{
    isHealthy: boolean;
    tables: Record<string, boolean>;
    errors: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const healthStatus = await checkDatabaseHealth();
      setHealth(healthStatus);
    } catch (err) {
      console.error('Health check failed:', err);
      setHealth({
        isHealthy: false,
        tables: {},
        errors: ['Database connection failed']
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  if (loading) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
          <span className="text-blue-300 font-medium">Checking system health...</span>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300 font-medium">System health check unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-xl p-6 mb-6 ${
      health.isHealthy 
        ? 'bg-green-500/10 border-green-500/20' 
        : 'bg-red-500/10 border-red-500/20'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {health.isHealthy ? (
            <CheckCircle className="w-6 h-6 text-green-400" />
          ) : (
            <XCircle className="w-6 h-6 text-red-400" />
          )}
          <div>
            <h3 className={`text-lg font-bold ${
              health.isHealthy ? 'text-green-300' : 'text-red-300'
            }`}>
              <Shield className="w-5 h-5 inline mr-2" />
              System Status: {health.isHealthy ? 'All Systems Operational' : 'Issues Detected'}
            </h3>
            <p className="text-sm text-slate-400">
              Database connectivity and core features
            </p>
          </div>
        </div>
        <button
          onClick={checkHealth}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Recheck
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {Object.entries(health.tables).map(([table, isHealthy]) => (
          <div
            key={table}
            className={`flex items-center gap-2 p-3 rounded-lg ${
              isHealthy 
                ? 'bg-green-500/20 text-green-300' 
                : 'bg-red-500/20 text-red-300'
            }`}
          >
            {isHealthy ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium capitalize">
              {table.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      {health.errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h4 className="font-bold text-red-300">System Issues:</h4>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {health.errors.map((error, index) => (
              <li key={index} className="text-sm text-red-400">
                {error.replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, '[ID]')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}