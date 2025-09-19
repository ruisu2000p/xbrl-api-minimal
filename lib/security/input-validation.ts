/**
 * Input Validation and Sanitization Library
 * Prevents XSS, SQL Injection, and Path Traversal attacks
 */

import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

/**
 * Email validation schema
 */
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .toLowerCase()
  .transform(val => val.trim())

/**
 * Password validation schema
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')

/**
 * API Key name validation
 */
export const apiKeyNameSchema = z.string()
  .min(1, 'Name is required')
  .max(50, 'Name too long')
  .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name contains invalid characters')
  .transform(val => val.trim())

/**
 * Company ID validation (for XBRL data)
 */
export const companyIdSchema = z.string()
  .regex(/^[A-Z0-9]{8}$/, 'Invalid company ID format')

/**
 * Fiscal year validation
 */
export const fiscalYearSchema = z.enum([
  'FY2015', 'FY2016', 'FY2017', 'FY2018', 'FY2019',
  'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025'
])

/**
 * Document type validation
 */
export const documentTypeSchema = z.enum([
  'PublicDoc', 'PublicDoc_markdown', 'AuditDoc', 'all'
])

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'div', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  })
}

/**
 * Sanitize user input for display
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Validate and sanitize file paths to prevent path traversal
 */
export function validatePath(path: string): boolean {
  // Check for path traversal attempts
  if (path.includes('..') || path.includes('//')) {
    return false
  }

  // Check for absolute paths
  if (/^[A-Za-z]:/.test(path) || path.startsWith('/')) {
    return false
  }

  // Check for special characters that could be used in attacks
  if (/[<>"|?*\0]/.test(path)) {
    return false
  }

  // Validate path format for XBRL documents
  const validPathPattern = /^FY\d{4}\/[A-Z0-9_]+\/(PublicDoc|AuditDoc)(_markdown)?\/[^\/]+\.md$/
  return validPathPattern.test(path)
}

/**
 * Validate URL to prevent SSRF attacks
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return false
    }

    // Block private IP ranges
    const hostname = parsed.hostname
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return false
    }

    // Block metadata endpoints
    if (hostname === '169.254.169.254') {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Escape special characters for SQL queries (additional protection)
 */
export function escapeSQL(str: string): string {
  return str
    .replace(/'/g, "''") // Escape single quotes
    .replace(/"/g, '""') // Escape double quotes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/%/g, '\\%') // Escape wildcards
    .replace(/_/g, '\\_')
}

/**
 * Validate pagination parameters
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(100).default(20)
})

/**
 * Create a sanitized error message (no sensitive info)
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return 'Validation failed: ' + error.errors.map(e => e.message).join(', ')
  }

  // Never expose internal error details
  return 'An error occurred. Please try again.'
}