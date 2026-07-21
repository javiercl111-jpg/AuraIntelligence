import React from 'react';
import type { GenerationTrace } from '../types';

interface GenerationTraceCardProps {
  traces: GenerationTrace[];
}

export const GenerationTraceCard: React.FC<GenerationTraceCardProps> = ({ traces }) => {
  if (!traces || traces.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-6">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Explainable Generation Trace</h3>
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          Zero Trust Evidence
        </span>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Artifact</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Section</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reasoning</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {traces.map((trace) => (
                <tr key={trace.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    <span className="font-medium">{trace.artifactType}</span>
                    <div className="text-xs text-gray-500 mt-0.5">from {trace.derivedFrom}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <span className="bg-gray-100 rounded px-2 py-1 text-xs">{trace.section}</span>
                    <div className="text-xs text-gray-500 mt-1">{trace.transformation}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">{trace.reason}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {(trace.confidence * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
