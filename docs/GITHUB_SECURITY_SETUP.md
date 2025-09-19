# GitHub Security Setup Guide

## Required Repository Settings

To enable security scanning features, you need to configure the following settings in your GitHub repository:

### 1. Enable GitHub Advanced Security Features

1. Go to your repository Settings
2. Navigate to "Code security and analysis"
3. Enable the following features:
   - **Dependency graph** - Required for dependency scanning
   - **Dependabot alerts** - Alerts for vulnerable dependencies
   - **Dependabot security updates** - Automatic security updates
   - **Code scanning** - Required for CodeQL and Trivy SARIF uploads
   - **Secret scanning** - Detects exposed secrets

### 2. Configure Actions Permissions

1. Go to Settings → Actions → General
2. Under "Workflow permissions", select:
   - **Read and write permissions**
   - **Allow GitHub Actions to create and approve pull requests** (optional)

### 3. Set up Required Secrets (Optional)

If you want Slack notifications for security issues:
1. Go to Settings → Secrets and variables → Actions
2. Add a new repository secret: `SLACK_WEBHOOK_URL`

## Workflow Permissions

The security-scan workflow requires the following permissions:

```yaml
permissions:
  contents: read          # Read repository content
  security-events: write  # Upload SARIF results
  actions: read          # Read workflow status
```

## Troubleshooting

### "Resource not accessible by integration" Error

This error occurs when the workflow doesn't have permission to upload security results.

**Solutions:**
1. Ensure the workflow has `security-events: write` permission
2. Verify that Code scanning is enabled in repository settings
3. For private repositories, ensure you have GitHub Advanced Security enabled

### Trivy Docker Scan Failures

If the Docker scan fails with "image not found":
1. Ensure Dockerfile exists in the repository root
2. Check that the Docker build succeeds locally
3. Review Docker build logs in the workflow run

## Security Tools Used

1. **npm audit** - Checks for vulnerable npm packages
2. **Trivy** - Vulnerability scanner for containers and filesystems
3. **CodeQL** - Semantic code analysis for security vulnerabilities
4. **Semgrep** - Static analysis for security patterns
5. **Custom Security Tests** - Application-specific security tests

## Viewing Security Results

Security scan results can be viewed in multiple locations:

1. **Security Tab** - Overview of all security findings
2. **Pull Request Comments** - Inline security feedback
3. **Actions Tab** - Detailed workflow run logs
4. **Code Scanning Alerts** - Under Security → Code scanning

## Best Practices

1. Run security scans on every pull request
2. Schedule daily scans for comprehensive coverage
3. Address critical and high severity issues promptly
4. Keep dependencies up to date with Dependabot
5. Review and update security policies regularly