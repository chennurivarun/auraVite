import React from 'react';

export default function ProgressBar({ currentStep = 1, totalSteps = 1 }) {
  // Ensure valid numbers
  const safeCurrentStep = Math.max(1, Math.min(currentStep || 1, totalSteps || 1));
  const safeTotalSteps = Math.max(1, totalSteps || 1);
  const percentage = (safeCurrentStep / safeTotalSteps) * 100;
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
