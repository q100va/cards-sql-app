// Middleware to sanitize the request body based on a provided schema.
export default function sanitizeBody(schema) {
  return (req, res, next) => {
    try {
      // Sanitize the request body according to the schema.
      const sanitized = sanitizeObject(req.body, schema);
      req.body = sanitized;
      next();
    } catch (err) {
      // Log the error details on the server.
      console.error('Sanitization error:', err);
      // Return a generic error message to prevent information leakage.
      res.status(400).send('Недопустимое значение параметра.');
    }
  };
}
/**
 * Recursively sanitizes an object using the provided schema.
 * @param {Object} obj - The object to sanitize.
 * @param {Object} schema - The schema definition for the object.
 * @returns {Object} - The sanitized object.
 */
const sanitizeObject = (obj, schema) => {
  // Ensure the input is a non-null object.
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('Invalid data type; object expected.');
  }
  const result = {};
  // Iterate over each schema key to sanitize the corresponding value.
  Object.keys(schema).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = sanitizeValue(obj[key], schema[key]);
    } else if (schema[key].required) {
      // Throw an error if a required field is missing.
      throw new Error(`Missing required field: ${key}`);
    } else {
      // Set non-required missing fields to null.
      result[key] = null;
    }
  });
  return result;
};
/**
 * Sanitizes an array using a provided schema for its items.
 * @param {Array} arr - The array to sanitize.
 * @param {Object} itemSchema - The schema for each item in the array.
 * @returns {Array} - The sanitized array.
 */
const sanitizeArray = (arr, itemSchema) => {
  if (!Array.isArray(arr)) {
    throw new Error('Expected an array.');
  }
  // Return a new array mapping each item through the sanitizeValue function.
  return arr.map((item) => sanitizeValue(item, itemSchema));
};
/**
 * Sanitizes a string value based on maximum length and allowance for empty strings.
 * @param {*} value - The value to sanitize.
 * @param {number} maxLength - Maximum allowed length for the string.
 * @param {boolean} allowEmpty - Whether empty strings are allowed.
 * @returns {string} - The sanitized string.
 */
const sanitizeString = (value, maxLength, allowEmpty, enumValues) => {
  // Convert the input to a string and trim whitespace.
  let str = typeof value === 'string' ? value.trim() : String(value).trim();
  // Truncate the string if it exceeds the maxLength.
  if (maxLength && str.length > maxLength) {
    str = str.substring(0, maxLength);
  }
  // Throw an error if empty strings are not allowed.
  if (!allowEmpty && str.length === 0) {
    throw new Error('Empty string not allowed.');
  }
// Throw an error if value is not allowed for enum type.
  if (enumValues && !enumValues.includes(str)) {
    throw new Error(`Invalid value for field: ${str}`);
  }
  return str;
};
/**
 * Sanitizes a value based on provided options including type, constraints, and nested schemas.
 * @param {*} value - The value to sanitize.
 * @param {Object} [options={}] - Options defining expected type and constraints.
 * @returns {*} - The sanitized value.
 */
const sanitizeValue = (value, options = {}) => {
  const {
    type = 'string',     // Expected type of the value.
    maxLength,           // Maximum length for strings.
    min,                 // Minimum value for numbers.
    max,                 // Maximum value for numbers.
    allowEmpty = false,  // Whether empty strings are allowed.
    allowNull = false,   // Whether null values are permitted.
    schema,              // Schema for nested objects.
    itemsSchema,         // Schema for array items.
    enumValues           // Array of allowed values for enum type.
  } = options;
  // Check if the value is missing and handle accordingly.
  if (value === undefined || value === null) {
    if (allowNull) return null;
    throw new Error('Value is required.');
  }
  // Process the value based on its expected type.
  switch (type) {
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`Expected object but got ${typeof value}`);
      }
      if (!schema) {
        throw new Error('Schema is required for object type.');
      }
      return sanitizeObject(value, schema);
    case 'array':
      if (!Array.isArray(value)) {
        throw new Error(`Expected array but got ${typeof value}`);
      }
      if (!itemsSchema) {
        throw new Error('itemsSchema is required for array type.');
      }
      return sanitizeArray(value, itemsSchema);
    case 'string':
      return sanitizeString(value, maxLength, allowEmpty, enumValues);
    case 'number': {
      // Accept number or string that can convert to a valid number.
      if (typeof value !== 'number' && typeof value !== 'string') {
        throw new Error(`Expected number-compatible value but got ${typeof value}`);
      }
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error('Invalid number.');
      }
      // Check numerical boundaries if provided.
      if (min !== undefined && num < min) {
        throw new Error(`Number must be >= ${min}`);
      }
      if (max !== undefined && num > max) {
        throw new Error(`Number must be <= ${max}`);
      }
      return num;
    }
    case 'boolean': {
      // If already a boolean, return it directly.
      if (typeof value === 'boolean') return value;
      // Map acceptable string/numeric representations to boolean.
      const boolMap = {
        'true': true,
        '1': true,
        'false': false,
        '0': false,
      };
      // Normalize string input to lowercase.
      const normalized = typeof value === 'string' ? value.toLowerCase() : value;
      if (Object.prototype.hasOwnProperty.call(boolMap, normalized)) {
        return boolMap[normalized];
      }
      throw new Error('Invalid boolean.');
    }
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
};
/*
Example schema with a nested object and an array:
const schema = {
  name: { type: 'string', maxLength: 50, required: true },
  age: { type: 'number', min: 0, max: 120, required: true },
  address: {
    type: 'object',
    required: true,
    schema: {
      street: { type: 'string', required: true },
      city: { type: 'string', required: true },
    },
  },
  tags: {
    type: 'array',
    required: false,
    itemsSchema: { type: 'string', maxLength: 20, allowEmpty: false },
  },
};
*/
