import React from 'react';
import { ModelPricingTable } from '../ModelPricingTable';

interface PricingTabProps {
  getModelPricingData: () => any[];
}

export function PricingTab({ getModelPricingData }: PricingTabProps) {
  return (
    <div className="space-y-6">
      <ModelPricingTable getModelPricingData={getModelPricingData} />
    </div>
  );
}
