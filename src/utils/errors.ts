/**
 * Domain error for unsupported operating systems or features.
 */
export class FeatureNotImplementedError extends Error {
  constructor(message: string) {
    super(message);
  }
}
