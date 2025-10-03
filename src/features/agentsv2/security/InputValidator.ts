/**
 * A result object for validation operations.
 */
interface ValidationResult {
  valid: boolean;
  reason?: string;
  sanitized: string | null;
}

/**
 * Provides methods for validating and sanitizing user input to prevent
 * security vulnerabilities like prompt injection and cross-site scripting (XSS).
 */
export class InputValidator {
  /**
   * Validates user input for potential prompt injection attacks.
   * It checks for common patterns used to manipulate LLMs.
   * @param input The user input string to validate.
   * @returns A `ValidationResult` object.
   */
  validate(input: string): ValidationResult {
    // List of patterns that may indicate a prompt injection attempt.
    const dangerousPatterns = [
      /ignore (previous|all) instructions/i,
      /you are now/i,
      /system:\s*/i,
      /<\|im_start\|>/i,
      /\[INST\]/i,
      /\{\{/i, // Template injection
      /\/\*/i, // Block comments
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        return {
          valid: false,
          reason: `Potential prompt injection detected: matched ${pattern.toString()}`,
          sanitized: null,
        };
      }
    }

    // Sanitize the input to remove potentially harmful content like scripts.
    const sanitized = this.sanitize(input);

    return {
      valid: true,
      sanitized,
    };
  }

  /**
   * Sanitizes a string by removing HTML and script tags.
   * @param input The string to sanitize.
   * @returns The sanitized string.
   */
  private sanitize(input: string): string {
    // Remove script tags and their content.
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Remove all other HTML tags.
    sanitized = sanitized.replace(/<[^>]+>/g, '');
    // Trim whitespace from the beginning and end.
    return sanitized.trim();
  }
}