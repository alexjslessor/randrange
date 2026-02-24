

const formatTimestamp = (
  value,
  {
    emptyValue = 'Unknown',
    invalidValue = 'Unknown',
    returnRawOnInvalid = false,
  } = {},
) => {
  if (!value) return emptyValue;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return returnRawOnInvalid ? String(value) : invalidValue;
  }
  return date.toLocaleString();
};

export { formatTimestamp };
