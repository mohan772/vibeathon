/**
 * Example Model
 * 
 * This is a sample model file to demonstrate the structure.
 * Models typically define data structures and schemas.
 */

export const ExampleModel = {
  id: Number,
  name: String,
  description: String,
  createdAt: Date,
  updatedAt: Date
};

// Example of a model constructor/factory
export const createExample = (name, description) => {
  return {
    id: Math.random(),
    name: name,
    description: description,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};
