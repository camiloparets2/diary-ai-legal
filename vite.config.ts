import { defineConfig, loadEnv } from 'vite';

const requiredProductionValues = [
  'VITE_OPERATOR_NAME',
  'VITE_SUPPORT_EMAIL',
  'VITE_MAILING_ADDRESS',
  'VITE_EFFECTIVE_DATE',
  'VITE_APPWRITE_ENDPOINT',
  'VITE_APPWRITE_PROJECT_ID',
  'VITE_APPWRITE_API_FUNCTION_ID',
] as const;

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  if (mode === 'production') {
    const missing = requiredProductionValues.filter((key) => !environment[key]?.trim());
    if (missing.length) throw new Error(`Legal-site production values are missing: ${missing.join(', ')}`);
    if (environment.VITE_LEGAL_REVIEWED !== 'true') {
      throw new Error('Set VITE_LEGAL_REVIEWED=true only after English and Spanish legal review is complete.');
    }
  }
  return { base: '/diary-ai-legal/' };
});
