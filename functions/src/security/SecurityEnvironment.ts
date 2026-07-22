export const SecurityEnvironment = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

export type SecurityEnvironment =
  (typeof SecurityEnvironment)[keyof typeof SecurityEnvironment];
