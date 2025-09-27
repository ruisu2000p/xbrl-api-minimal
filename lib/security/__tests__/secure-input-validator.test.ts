import { SecureInputValidator, ValidationError } from '../input-validator';

describe('SecureInputValidator regression', () => {
  const maliciousPath = '../etc/passwd';
  const maliciousSql = "SELECT * FROM users WHERE email = 'admin' OR '1'='1'";
  const maliciousXss = "<script>alert('xss')</script>";

  test('validatePathParameter consistently rejects directory traversal attempts', () => {
    expect(() => SecureInputValidator.validatePathParameter(maliciousPath)).toThrow(ValidationError);
    expect(() => SecureInputValidator.validatePathParameter(maliciousPath)).toThrow(ValidationError);
  });

  test('validateSearchQuery consistently rejects SQL injection patterns', () => {
    expect(() => SecureInputValidator.validateSearchQuery(maliciousSql)).toThrow(ValidationError);
    expect(() => SecureInputValidator.validateSearchQuery(maliciousSql)).toThrow(ValidationError);
  });

  test('validateSearchQuery consistently rejects XSS payloads', () => {
    expect(() => SecureInputValidator.validateSearchQuery(maliciousXss)).toThrow(ValidationError);
    expect(() => SecureInputValidator.validateSearchQuery(maliciousXss)).toThrow(ValidationError);
  });
});
