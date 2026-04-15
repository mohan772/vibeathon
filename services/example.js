/**
 * Example Service
 * 
 * This is a sample service file to demonstrate the structure.
 * Services typically contain business logic and data processing.
 */

export const getExampleData = () => {
  return {
    id: 1,
    title: 'Example Service',
    description: 'This is an example service file'
  };
};

export const processData = (input) => {
  // Add your business logic here
  return {
    processed: true,
    input: input,
    processedAt: new Date().toISOString()
  };
};
