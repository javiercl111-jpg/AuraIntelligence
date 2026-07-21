import React from 'react';
import type { ValidationReport } from '../types';

interface GenerationWarningsCardProps {
  validation: ValidationReport | null;
}

export const GenerationWarningsCard: React.FC<GenerationWarningsCardProps> = ({ validation }) => {
  if (!validation || (validation.warnings.length === 0 && validation.violations.length === 0)) {
    return (
      <div className="bg-green-50 rounded-lg p-4 mt-6 border border-green-200">
        <p className="text-sm text-green-800 font-medium">Zero Trust Validation Passed: No warnings or violations detected.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden mt-6">
      <div className="border-b border-red-200 bg-red-50 px-6 py-4">
        <h3 className="text-lg font-semibold text-red-900">Zero Trust Validation Report</h3>
        <p className="text-sm text-red-700 mt-1">Score: {validation.score}/100</p>
      </div>

      <div className="p-6 space-y-6">
        {validation.violations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-800 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Violations (High Severity)
            </h4>
            <ul className="space-y-2">
              {validation.violations.map((violation, idx) => (
                <li key={idx} className="bg-red-50 text-red-700 p-3 rounded text-sm border border-red-100">
                  <span className="font-bold mr-2">[{violation.ruleId}]</span>
                  {violation.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-yellow-800 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Warnings (Medium/Low Severity)
            </h4>
            <ul className="space-y-2">
              {validation.warnings.map((warning, idx) => (
                <li key={idx} className="bg-yellow-50 text-yellow-800 p-3 rounded text-sm border border-yellow-100">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {validation.recommendations.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
            <ul className="list-disc pl-5 space-y-1">
              {validation.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-gray-600">{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
