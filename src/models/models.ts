export interface ModelInfo {
  name: string;
  inputPrice: number;  // Price per million tokens
  outputPrice: number; // Price per million tokens
}

// Just define the model we're currently using
export const MODEL_INFO: ModelInfo = {
  name: "Claude 3.7 Sonnet",
  inputPrice: 3.0,
  outputPrice: 15.0
};
