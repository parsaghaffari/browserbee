import React from 'react';

export interface OllamaModel {
  id: string;
  name: string;
  contextWindow: number;
}

interface OllamaModelListProps {
  models: OllamaModel[];
  setModels: (models: OllamaModel[]) => void;
  newModel: { id: string; name: string; contextWindow: number };
  setNewModel: React.Dispatch<React.SetStateAction<{ id: string; name: string; contextWindow: number }>>;
  handleAddModel: () => void;
  handleRemoveModel: (id: string) => void;
  handleEditModel: (idx: number, field: string, value: any) => void;
}

export function OllamaModelList({
  models,
  setModels,
  newModel,
  setNewModel,
  handleAddModel,
  handleRemoveModel,
  handleEditModel
}: OllamaModelListProps) {
  return (
    <div className="form-control mb-4">
      <label className="label">
        <span className="label-text">Custom Ollama Models:</span>
      </label>
      <div className="mb-2 text-sm">
        Add your custom Ollama models here. Increasing the context window can help with rate limit errors but requires more VRAM.
      </div>
      <table className="table table-zebra w-full mb-2">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Context Window</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model, idx) => (
            <tr key={model.id}>
              <td>
                <input
                  className="input input-bordered input-sm w-full"
                  value={model.id}
                  onChange={e => handleEditModel(idx, 'id', e.target.value)}
                />
              </td>
              <td>
                <input
                  className="input input-bordered input-sm w-full"
                  value={model.name}
                  onChange={e => handleEditModel(idx, 'name', e.target.value)}
                />
              </td>
              <td>
                <input
                  className="input input-bordered input-sm w-full"
                  type="number"
                  value={model.contextWindow}
                  onChange={e => handleEditModel(idx, 'contextWindow', parseInt(e.target.value) || 32768)}
                  min="1000"
                  step="1000"
                />
              </td>
              <td>
                <button className="btn btn-sm btn-error" onClick={() => handleRemoveModel(model.id)}>Delete</button>
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <input
                className="input input-bordered input-sm w-full"
                value={newModel.id}
                onChange={e => setNewModel({ ...newModel, id: e.target.value })}
                placeholder="Model ID"
              />
            </td>
            <td>
              <input
                className="input input-bordered input-sm w-full"
                value={newModel.name}
                onChange={e => setNewModel({ ...newModel, name: e.target.value })}
                placeholder="Model Name"
              />
            </td>
            <td>
              <input
                className="input input-bordered input-sm w-full"
                type="number"
                value={newModel.contextWindow}
                onChange={e => setNewModel({ ...newModel, contextWindow: parseInt(e.target.value) || 32768 })}
                placeholder="32768"
                min="1000"
                step="1000"
              />
            </td>
            <td>
              <button className="btn btn-sm btn-primary" onClick={handleAddModel}>Add</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="text-xs text-gray-500 mt-1">
        <p>Default context window: 32768. Adjust based on your hardware capabilities.</p>
        <p>If you're experiencing rate limit errors, try increasing the context window.</p>
      </div>
    </div>
  );
}
