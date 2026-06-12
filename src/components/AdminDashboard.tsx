import React, { useState, useEffect } from 'react';
import { ragApi } from '../api/rag.api';
import { Database, FileText, Server, Users } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await ragApi.getAdminStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500">Loading platform statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-red-500">Failed to load statistics. Are you an admin?</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Platform Admin Dashboard
          </h1>
          <p className="text-gray-500 mt-2">Global telemetry across all RAG SaaS tenants.</p>
        </div>

        {/* Global Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <FileText size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Documents</p>
              <h3 className="text-2xl font-bold">{stats.totalDocuments}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Database size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Vector Chunks</p>
              <h3 className="text-2xl font-bold">{stats.totalChunks}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
            <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
              <Server size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Chat Sessions</p>
              <h3 className="text-2xl font-bold">{stats.totalSessions}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
            <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
              <Database size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Blocked Requests</p>
              <h3 className="text-2xl font-bold">{stats.blockedRequests}</h3>
            </div>
          </div>
        </div>

        {/* Security Audit Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Server size={20} className="text-gray-400" /> 
              Recent Security Audit Logs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                  <th className="px-6 py-4 font-medium">Tenant ID</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentAudits?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No audit logs found.</td>
                  </tr>
                ) : (
                  stats.recentAudits?.map((log: any) => (
                    <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                      <td className="px-6 py-4">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{log.clientId}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {log.action}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tenant Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users size={20} className="text-gray-400" /> 
              Tenant Analytics
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Tenant ID</th>
                  <th className="px-6 py-4 font-medium">Uploaded Documents</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.documentsByTenant.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No tenants have uploaded documents yet.</td>
                  </tr>
                ) : (
                  stats.documentsByTenant.map((tenant: any) => (
                    <tr key={tenant.clientId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {tenant.clientId}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                          {tenant.count} files
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"></div>
                          Active
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
