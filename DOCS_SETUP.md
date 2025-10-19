# Documentation Setup Guide

The 2FA Authentication Service documentation site has been created using **MkDocs Material**.

## What's Included

### Complete Documentation

✅ **Home Page** - Beautiful landing page with feature cards
✅ **Getting Started** - Quick start, installation, zero-budget deployment
✅ **Architecture** - System overview, auth flow, database schema, security
✅ **API Reference** - Complete OpenAPI spec with Swagger UI
  - Authentication endpoints
  - Two-factor authentication endpoints
  - Interactive API explorer

✅ **Integration Guides** - Code examples for:
  - React / Next.js
  - Vue.js
  - Node.js / Express
  - Python / Flask
  - React Native

✅ **Reference** - Error codes and troubleshooting
✅ **FAQ** - Comprehensive frequently asked questions
✅ **Changelog** - Version history and release notes

### Features

- 🎨 Beautiful Material Design theme with dark mode
- 🔍 Full-text search
- 📊 Mermaid diagrams for architecture visualization
- 🔌 Interactive Swagger API documentation
- 📱 Mobile-responsive
- ⚡ Fast static site generation

## Viewing Documentation Locally

### Option 1: Using Python Virtual Environment (Recommended)

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r docs/requirements.txt

# Serve documentation
mkdocs serve

# Open http://localhost:8000 in your browser
```

### Option 2: View Built Site

The documentation has already been built to the `site/` directory (ignored by git). You can:

```bash
# Serve the built site
cd site
python3 -m http.server 8000

# Open http://localhost:8000 in your browser
```

## Deploying to GitHub Pages

### Step 1: Push to GitHub

```bash
# Make sure you're in a git repository
git init  # If not already initialized

# Add all files
git add .

# Commit
git commit -m "Add comprehensive documentation site"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** > **Pages** (in left sidebar)
3. Under **Source**, select:
   - **Source**: Deploy from a branch
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
4. Click **Save**

### Step 3: Trigger Deployment

The documentation will automatically deploy when you push to `main` branch. To trigger it manually:

1. Go to **Actions** tab in your repository
2. Click **Deploy Documentation** workflow
3. Click **Run workflow** > **Run workflow**

After a few minutes, your documentation will be live at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

### Step 4: (Optional) Custom Domain

If you want to use a custom domain (e.g., docs.yourdomain.com):

1. Edit `.github/workflows/docs.yml` and uncomment the `cname` line:
   ```yaml
   cname: docs.yourdomain.com  # Your custom domain
   ```

2. Add a CNAME record in your DNS:
   ```
   Type: CNAME
   Name: docs (or whatever subdomain)
   Value: YOUR_USERNAME.github.io
   ```

3. In GitHub Settings > Pages, enter your custom domain

## Automated Deployment

The workflow (`.github/workflows/docs.yml`) is configured to automatically deploy when:

- You push changes to `main` branch
- Changes are made to `docs/**` or `mkdocs.yml`

No manual deployment needed!

## Building Locally

```bash
# Activate virtual environment (if using)
source venv/bin/activate

# Build static site
mkdocs build

# Output will be in ./site directory
```

## Documentation Structure

```
docs/
├── index.md                    # Home page
├── getting-started/
│   ├── quick-start.md         # 5-minute Docker setup
│   ├── installation.md        # Complete installation guide
│   └── zero-budget.md         # $0/month deployment
├── architecture/
│   ├── overview.md            # System architecture with diagrams
│   ├── authentication-flow.md # Auth flow diagrams
│   ├── database-schema.md     # Database ERD
│   └── security.md            # Security architecture
├── api/
│   ├── index.md               # API documentation landing page
│   ├── openapi.yaml           # Complete OpenAPI 3.0 spec
│   ├── authentication.md      # Auth endpoints
│   └── two-factor.md          # 2FA endpoints
├── guides/
│   └── integration.md         # Framework integration examples
├── reference/
│   └── error-codes.md         # Error reference
├── faq.md                     # FAQ
└── changelog.md               # Version history
```

## Adding More Documentation

You can add more documentation pages by:

1. Create new `.md` files in `docs/` directory
2. Add them to navigation in `mkdocs.yml`:
   ```yaml
   nav:
     - Home: index.md
     - Your New Section:
       - Page Title: path/to/page.md
   ```

3. Build and test locally:
   ```bash
   mkdocs serve
   ```

4. Push to GitHub - automatic deployment!

### Suggested Additional Pages

The navigation includes placeholders for these pages that you may want to add:

**API Documentation:**
- `api/webhooks.md` - Webhook endpoints
- `api/api-keys.md` - API key management endpoints
- `api/health.md` - Health check endpoints

**Guides:**
- `guides/totp-setup.md` - TOTP setup guide
- `guides/sms-setup.md` - SMS 2FA setup
- `guides/email-setup.md` - Email 2FA setup
- `guides/api-keys.md` - API key usage
- `guides/webhooks.md` - Webhook integration
- `guides/trusted-devices.md` - Trusted devices

**Development:**
- `development/contributing.md` - Contributing guidelines
- `development/backend.md` - Backend development
- `development/frontend.md` - Frontend development
- `development/testing.md` - Testing guide
- `development/code-style.md` - Code style guide

**Deployment:**
- `deployment/docker.md` - Docker deployment (copy from DEPLOYMENT.md)
- `deployment/cloud-platforms.md` - Cloud platform guides
- `deployment/ssl.md` - SSL/HTTPS setup
- `deployment/monitoring.md` - Monitoring and observability

**Reference:**
- `reference/environment-variables.md` - All environment variables
- `reference/configuration.md` - Configuration reference

You can copy these from existing markdown files or create new ones.

## Markdown Features

### Admonitions (Callouts)

```markdown
!!! note "Optional Title"
    This is a note.

!!! warning
    This is a warning.

!!! success
    Success message!

!!! danger
    Danger warning!
```

### Mermaid Diagrams

```markdown
\`\`\`mermaid
graph LR
    A[Client] --> B[Server]
    B --> C[Database]
\`\`\`
```

### Code Blocks with Line Numbers

```markdown
\`\`\`python linenums="1"
def hello_world():
    print("Hello, World!")
\`\`\`
```

### Tabs

```markdown
=== "Python"
    \`\`\`python
    print("Hello")
    \`\`\`

=== "JavaScript"
    \`\`\`javascript
    console.log("Hello")
    \`\`\`
```

## Troubleshooting

### "Documentation not showing up on GitHub Pages"

1. Check Actions tab - workflow should have run successfully
2. Verify `gh-pages` branch was created
3. Check Settings > Pages - should be deploying from `gh-pages` branch
4. Wait a few minutes for DNS propagation

### "Build failing in GitHub Actions"

1. Check Actions tab for error logs
2. Test build locally: `mkdocs build`
3. Make sure `docs/requirements.txt` is committed
4. Check that all referenced files exist

### "Broken links"

The build output will show warnings for broken links. Fix by either:
- Creating the missing file
- Removing the link
- Updating the link to point to existing file

## Next Steps

1. ✅ Push to GitHub
2. ✅ Enable GitHub Pages
3. ✅ Share your documentation URL!

Your documentation will be live at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

## Support

- **MkDocs Material Docs**: https://squidfunk.github.io/mkdocs-material/
- **MkDocs Docs**: https://www.mkdocs.org/
- **GitHub Pages Docs**: https://docs.github.com/en/pages

Enjoy your beautiful documentation site! 🎉
