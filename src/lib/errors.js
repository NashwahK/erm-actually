export class ErmError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ErmError';
    this.code = code;
  }
}

export const missingApiKey = () =>
  new ErmError('No Fact Check API key set. Add one on the Settings page.', 'MISSING_API_KEY');

export const providerError = (status) =>
  new ErmError(
    status === 400 || status === 403
      ? 'The Fact Check API rejected the API key. Check it on the Settings page.'
      : `The Fact Check API returned HTTP ${status}.`,
    status === 400 || status === 403 ? 'INVALID_API_KEY' : 'PROVIDER_ERROR',
  );
