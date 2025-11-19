# 🔒 Security Policy

## Supported Versions

Currently supported versions of Zone01 Admin Dashboard:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 2.x.x   | ✅ Yes             | Current (Stack Auth) |
| 1.x.x   | ⚠️ Limited support | Legacy (NextAuth v5) |
| < 1.0   | ❌ No              | Deprecated |

---

## 🐛 Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. **DO NOT** open a public issue

Security vulnerabilities should not be disclosed publicly until they have been addressed.

### 2. Report privately

Send a detailed report to: **maximedubs@proton.me**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information

### 3. What to expect

- **Initial Response**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2-4 weeks
  - Low: Next release cycle

### 4. Disclosure Policy

- We will acknowledge your report within 48 hours
- We will provide regular updates on the fix progress
- We will credit you in the security advisory (unless you prefer to remain anonymous)
- We will coordinate with you on the public disclosure timeline

---

## 🛡️ Security Best Practices

When deploying and maintaining this application:

### Environment Variables

- ⚠️ **NEVER** commit `.env` files to version control
- ✅ Use environment-specific variables (dev, staging, prod)
- ✅ Rotate secrets regularly (every 90 days recommended)
- ✅ Use strong, randomly generated secrets (32+ characters)
- ✅ Limit access to production environment variables

### Authentication

- ✅ Stack Auth handles OAuth securely
- ✅ Sessions are stored in HTTP-only cookies
- ✅ JWT tokens are validated on every request
- ⚠️ Regularly review user roles and permissions
- ⚠️ Implement rate limiting on authentication endpoints

### Database

- ✅ Use SSL/TLS connections (enforced by Neon)
- ✅ Apply principle of least privilege for DB users
- ✅ Regular backups (automated by Neon)
- ⚠️ Sanitize all user inputs
- ⚠️ Use parameterized queries (enforced by Drizzle ORM)

### API Security

- ✅ CORS configured appropriately
- ✅ Rate limiting on sensitive endpoints
- ✅ Input validation with Zod schemas
- ✅ CSRF protection (Next.js built-in)
- ⚠️ Monitor API usage and anomalies

### Dependencies

- ✅ Regularly update dependencies: `pnpm update`
- ✅ Monitor security advisories: GitHub Dependabot
- ✅ Review CVEs before updating
- ⚠️ Audit dependencies: `pnpm audit`

---

## 🔍 Known Security Considerations

### Current Setup

1. **Stack Auth Integration**
   - OAuth tokens managed by Stack Auth
   - Server-side session validation
   - Automatic token refresh

2. **Database Access**
   - Connection pooling via Neon
   - SSL enforced
   - No direct DB exposure

3. **API Routes**
   - Protected by authentication middleware
   - Rate limiting via Vercel
   - Input validation

### Potential Risks

1. **Cron Job Security**
   - Protected by `CRON_SECRET` header
   - Consider IP whitelisting for production

2. **Zone01 API Token**
   - Stored as environment variable
   - Rotate if compromised
   - Monitor usage

---

## 🚨 Security Incidents

If you believe you've found evidence of a security breach:

1. **Immediate Actions**
   - Change all passwords and secrets
   - Revoke compromised API tokens
   - Review access logs
   - Notify affected users

2. **Contact**
   - Email: maximedubs@proton.me
   - Include: Timeline, affected systems, potential impact

3. **Post-Incident**
   - Document the incident
   - Update security measures
   - Conduct a security review

---

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Stack Auth Security](https://docs.stack-auth.com/security)
- [Vercel Security](https://vercel.com/docs/security)

---

## 🏆 Security Hall of Fame

We appreciate responsible disclosure. Contributors who report valid security issues will be credited here:

*No vulnerabilities reported yet. Be the first!*

---

## 📝 Updates to this Policy

This security policy may be updated. Check the git history for changes:

```bash
git log -- SECURITY.md
```

Last updated: 2025-01-19

---

<div align="center">

**🔒 Security is everyone's responsibility**

Report issues responsibly • Keep secrets secret • Stay updated

</div>
