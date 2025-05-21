import React from 'react';

export interface Model {
  id: string;
  name: string;
  isReasoningModel?: boolean;
}

interface ModelListProps {
  models: Model[];
  setModels: (models: Model[]) => void;
  newModel: { id: string; name: string; isReasoningModel: boolean };
  setNewModel: React.Dispatch<React.SetStateAction<{ id: string; name: string; isReasoningModel: boolean }>>;
  handleAddModel: () => void;
  handleRemoveModel: (id: string) => void;
  handleEditModel: (idx: number, field: string, value: any) => void;
}

export function ModelList({
  models,
  setModels,
  newModel,
  setNewModel,
  handleAddModel,
  handleRemoveModel,
  handleEditModel
}: ModelListProps) {
  return (
    <div className="form-control mb-4">
      <label className="label">
        <span className="label-text">Model List:</span>
      </label>
      <table className="table table-zebra w-full mb-2">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Reasoning Model?</th>
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
                  type="checkbox"
                  checked={!!model.isReasoningModel}
                  onChange={e => handleEditModel(idx, 'isReasoningModel', e.target.checked)}
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
                type="checkbox"
                checked={!!newModel.isReasoningModel}
                onChange={e => setNewModel({ ...newModel, isReasoningModel: e.target.checked })}
              />
            </td>
            <td>
              <button className="btn btn-sm btn-primary" onClick={handleAddModel}>Add</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
