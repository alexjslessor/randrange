import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Box,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';

const SUPPORTED_PARAM_TYPES = new Set([
  'string',
  'number',
  'integer',
  'boolean',
  'array',
  'object',
]);

const isPlainObject = (value) => (
  Boolean(value)
  && typeof value === 'object'
  && !Array.isArray(value)
);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const collectSchemaTypes = (schema) => {
  const types = [];
  const collect = (candidate) => {
    if (typeof candidate === 'string') {
      types.push(candidate);
      return;
    }
    if (Array.isArray(candidate)) {
      candidate.forEach((entry) => collect(entry));
    }
  };

  collect(schema?.type);

  if (Array.isArray(schema?.anyOf)) {
    schema.anyOf.forEach((entry) => {
      if (isPlainObject(entry)) {
        collect(entry.type);
      }
    });
  }

  if (Array.isArray(schema?.oneOf)) {
    schema.oneOf.forEach((entry) => {
      if (isPlainObject(entry)) {
        collect(entry.type);
      }
    });
  }

  return [...new Set(types)];
};

const resolveEnumValues = (schema) => {
  if (Array.isArray(schema?.enum) && schema.enum.length) {
    return schema.enum;
  }

  if (Array.isArray(schema?.anyOf)) {
    for (const option of schema.anyOf) {
      if (Array.isArray(option?.enum) && option.enum.length) {
        return option.enum;
      }
    }
  }

  if (Array.isArray(schema?.oneOf)) {
    for (const option of schema.oneOf) {
      if (Array.isArray(option?.enum) && option.enum.length) {
        return option.enum;
      }
    }
  }

  return [];
};

const resolvePrimaryType = (schema) => {
  const types = collectSchemaTypes(schema);
  const nullable = types.includes('null');
  const primaryType = types.find((type) => type !== 'null' && SUPPORTED_PARAM_TYPES.has(type)) || 'string';
  return {
    type: primaryType,
    nullable,
  };
};

const normalizeFields = (parameterSchema) => {
  if (!isPlainObject(parameterSchema)) {
    return [];
  }

  const properties = isPlainObject(parameterSchema.properties)
    ? parameterSchema.properties
    : {};
  const required = new Set(
    Array.isArray(parameterSchema.required)
      ? parameterSchema.required
      : [],
  );

  return Object.entries(properties).map(([name, schema]) => {
    const safeSchema = isPlainObject(schema) ? schema : {};
    const enumValues = resolveEnumValues(safeSchema);
    const typeInfo = resolvePrimaryType(safeSchema);

    return {
      name,
      label: safeSchema.title || name,
      description: safeSchema.description || '',
      required: required.has(name),
      defaultValue: safeSchema.default,
      enumValues,
      isEnum: enumValues.length > 0,
      ...typeInfo,
    };
  });
};

const toJsonString = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return '';
  }
};

const toInitialDraftValue = (field, value) => {
  if (value === undefined || value === null) {
    return '';
  }

  if (field.isEnum) {
    return String(value);
  }

  if (field.type === 'boolean') {
    if (value === true) return 'true';
    if (value === false) return 'false';
    return '';
  }

  if (field.type === 'object' || field.type === 'array') {
    return toJsonString(value);
  }

  return String(value);
};

const parseDraftValue = (field, draftValue) => {
  const isBlank = draftValue === '' || draftValue === undefined || draftValue === null;

  if (isBlank) {
    if (field.required) {
      if (field.nullable) {
        return {
          hasValue: true,
          value: null,
        };
      }
      return {
        hasValue: false,
        error: 'Required parameter',
      };
    }
    return {
      hasValue: false,
    };
  }

  if (field.isEnum) {
    const match = field.enumValues.find((option) => String(option) === String(draftValue));
    if (match === undefined) {
      return {
        hasValue: false,
        error: 'Select one of the supported values',
      };
    }
    return {
      hasValue: true,
      value: match,
    };
  }

  if (field.type === 'boolean') {
    if (draftValue === 'true' || draftValue === true) {
      return {
        hasValue: true,
        value: true,
      };
    }
    if (draftValue === 'false' || draftValue === false) {
      return {
        hasValue: true,
        value: false,
      };
    }
    return {
      hasValue: false,
      error: 'Select true or false',
    };
  }

  if (field.type === 'integer') {
    const normalized = String(draftValue).trim();
    if (!/^[-+]?\d+$/.test(normalized)) {
      return {
        hasValue: false,
        error: 'Enter a valid integer',
      };
    }
    return {
      hasValue: true,
      value: Number.parseInt(normalized, 10),
    };
  }

  if (field.type === 'number') {
    const normalized = String(draftValue).trim();
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      return {
        hasValue: false,
        error: 'Enter a valid number',
      };
    }
    return {
      hasValue: true,
      value: parsed,
    };
  }

  if (field.type === 'object' || field.type === 'array') {
    try {
      const parsed = JSON.parse(String(draftValue));
      const isExpectedType = field.type === 'array'
        ? Array.isArray(parsed)
        : isPlainObject(parsed);
      if (!isExpectedType) {
        return {
          hasValue: false,
          error: field.type === 'array'
            ? 'Provide a JSON array'
            : 'Provide a JSON object',
        };
      }
      return {
        hasValue: true,
        value: parsed,
      };
    } catch (error) {
      return {
        hasValue: false,
        error: 'Provide valid JSON',
      };
    }
  }

  return {
    hasValue: true,
    value: String(draftValue),
  };
};

const evaluateDraftValues = (fields, draftValues) => {
  const parameters = {};
  const errors = {};

  fields.forEach((field) => {
    const parsed = parseDraftValue(field, draftValues[field.name]);
    if (parsed.error) {
      errors[field.name] = parsed.error;
      return;
    }
    if (parsed.hasValue) {
      parameters[field.name] = parsed.value;
    }
  });

  return {
    parameters,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

const renderEnumLabel = (option) => (
  typeof option === 'string'
    ? option
    : JSON.stringify(option)
);

export default function DeploymentParamsForm({
  parameterSchema = null,
  initialParameters = {},
  disabled = false,
  fieldSx = undefined,
  onChange,
}) {
  const fields = useMemo(
    () => normalizeFields(parameterSchema),
    [parameterSchema],
  );

  const [draftValues, setDraftValues] = useState({});

  useEffect(() => {
    const nextDraftValues = {};
    const safeInitialParameters = isPlainObject(initialParameters)
      ? initialParameters
      : {};

    fields.forEach((field) => {
      const rawValue = hasOwn(safeInitialParameters, field.name)
        ? safeInitialParameters[field.name]
        : field.defaultValue;
      nextDraftValues[field.name] = toInitialDraftValue(field, rawValue);
    });

    setDraftValues(nextDraftValues);
  }, [fields, initialParameters]);

  const evaluation = useMemo(
    () => evaluateDraftValues(fields, draftValues),
    [fields, draftValues],
  );

  useEffect(() => {
    if (!onChange) {
      return;
    }

    onChange({
      parameters: evaluation.parameters,
      isValid: evaluation.isValid,
      errors: evaluation.errors,
    });
  }, [evaluation, onChange]);

  if (!fields.length) {
    return null;
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.2 }}>
      <Box>
        <Typography variant="subtitle2">
          Deployment Parameters
        </Typography>
        <Typography variant="caption" color="text.secondary">
          These values will be sent as `parameters` with this run.
        </Typography>
      </Box>

      {fields.map((field) => {
        const errorText = evaluation.errors[field.name] || '';
        const helperText = errorText || field.description || ' ';
        const commonLabel = field.required ? `${field.label} *` : field.label;

        if (field.isEnum) {
          return (
            <FormControl
              key={field.name}
              fullWidth
              error={Boolean(errorText)}
              sx={fieldSx}
            >
              <InputLabel id={`${field.name}-enum-label`}>
                {commonLabel}
              </InputLabel>
              <Select
                labelId={`${field.name}-enum-label`}
                name={field.name}
                value={draftValues[field.name] ?? ''}
                label={commonLabel}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setDraftValues((previous) => ({
                    ...previous,
                    [field.name]: nextValue,
                  }));
                }}
                disabled={disabled}
              >
                {!field.required || field.nullable ? (
                  <MenuItem value="">
                    <em>Not set</em>
                  </MenuItem>
                ) : null}
                {field.enumValues.map((option) => (
                  <MenuItem key={`${field.name}-${String(option)}`} value={String(option)}>
                    {renderEnumLabel(option)}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{helperText}</FormHelperText>
            </FormControl>
          );
        }

        if (field.type === 'boolean') {
          return (
            <FormControl
              key={field.name}
              fullWidth
              error={Boolean(errorText)}
              sx={fieldSx}
            >
              <InputLabel id={`${field.name}-boolean-label`}>
                {commonLabel}
              </InputLabel>
              <Select
                labelId={`${field.name}-boolean-label`}
                name={field.name}
                value={draftValues[field.name] ?? ''}
                label={commonLabel}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setDraftValues((previous) => ({
                    ...previous,
                    [field.name]: nextValue,
                  }));
                }}
                disabled={disabled}
              >
                {!field.required || field.nullable ? (
                  <MenuItem value="">
                    <em>Not set</em>
                  </MenuItem>
                ) : null}
                <MenuItem value="true">true</MenuItem>
                <MenuItem value="false">false</MenuItem>
              </Select>
              <FormHelperText>{helperText}</FormHelperText>
            </FormControl>
          );
        }

        const isJsonType = field.type === 'object' || field.type === 'array';

        return (
          <TextField
            key={field.name}
            name={field.name}
            label={commonLabel}
            value={draftValues[field.name] ?? ''}
            onChange={(event) => {
              const nextValue = event.target.value;
              setDraftValues((previous) => ({
                ...previous,
                [field.name]: nextValue,
              }));
            }}
            disabled={disabled}
            required={field.required && !field.nullable}
            fullWidth
            multiline={isJsonType}
            minRows={isJsonType ? 4 : undefined}
            type={field.type === 'integer' || field.type === 'number' ? 'number' : 'text'}
            error={Boolean(errorText)}
            helperText={helperText}
            sx={fieldSx}
            inputProps={
              field.type === 'integer'
                ? { step: 1 }
                : field.type === 'number'
                  ? { step: 'any' }
                  : undefined
            }
          />
        );
      })}
    </Box>
  );
}
