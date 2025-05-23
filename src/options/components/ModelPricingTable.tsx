import React from 'react';
import { Model } from './ModelList';

interface ModelPricing extends Model {
  provider: string;
  inputPrice: number;
  outputPrice: number;
}

interface ModelPricingTableProps {
  getModelPricingData: () => ModelPricing[];
}

export function ModelPricingTable({ getModelPricingData }: ModelPricingTableProps) {
  return (
    <div className="card bg-base-100 shadow-md mb-6">
      <div className="card-body">
        <h2 className="card-title text-xl">Model Pricing</h2>
        <p className="mb-4">
          This table shows the relative costs of different LLM models, sorted from cheapest to most expensive.
          Prices are in USD per 1 million tokens.
        </p>
        
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Model</th>
                <th>Provider</th>
                <th>Input Price</th>
                <th>Output Price</th>
              </tr>
            </thead>
            <tbody>
              {getModelPricingData().map((model) => (
                <tr key={`${model.provider}-${model.id}`}>
                  <td>{model.name}</td>
                  <td>{model.provider}</td>
                  <td>${model.inputPrice.toFixed(2)}</td>
                  <td>${model.outputPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <p className="text-sm text-gray-500 mt-2">
          * Prices are per 1 million tokens. Actual costs may vary based on usage.
        </p>
      </div>
    </div>
  );
}
