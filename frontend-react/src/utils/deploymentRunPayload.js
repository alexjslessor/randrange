const isPlainObject = (value) => (
  Boolean(value)
  && typeof value === 'object'
  && !Array.isArray(value)
);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const buildDeploymentRunBody = (formData = {}) => {
  if (!isPlainObject(formData) || !hasOwn(formData, 'parameters')) {
    return {};
  }

  const parameters = isPlainObject(formData.parameters)
    ? formData.parameters
    : {};

  return { parameters };
};

export { buildDeploymentRunBody };
