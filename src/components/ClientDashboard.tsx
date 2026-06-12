import React, { useState, useEffect } from 'react';
import { ragApi } from '../api/rag.api';
import { FileText, Server, Clock } from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await ragApi.getClientStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch client stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500">Loading your analytics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-red-500">Failed to load analytics.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
            Client Dashboard
          </h1>
          <p className="text-gray-500 mt-2">Analytics and usage for your organization.</p>
        </div>

        {/* Global Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <FileText size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Documents Uploaded</p>
              <h3 className="text-2xl font-bold">{stats.totalDocuments}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
            <div className="p-4 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl">
              <Server size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Chat Sessions</p>
              <h3 className="text-2xl font-bold">{stats.totalSessions}</h3>
            </div>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock size={20} className="text-gray-400" /> 
              Recently Uploaded Documents
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Filename</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentDocs?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">You haven't uploaded any documents yet.</td>
                  </tr>
                ) : (
                  stats.recentDocs?.map((doc: any) => (
                    <tr key={doc.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {doc.filename}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                          doc.status === 'ready' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {new Date(doc.createdAt).toLocaleDateString()}
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
