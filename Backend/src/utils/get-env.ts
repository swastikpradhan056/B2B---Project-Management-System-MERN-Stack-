export const getEnv = (key: string, defaultvalue: string = ""): string => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultvalue) {
      return defaultvalue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};
