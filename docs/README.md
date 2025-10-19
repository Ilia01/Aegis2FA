# Documentation

This directory contains the source files for the 2FA Authentication Service documentation website.

## Local Development

### Prerequisites

- Python 3.8+
- pip

### Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Serve documentation locally
mkdocs serve
```

The documentation will be available at http://localhost:8000

### Build

```bash
# Build static site
mkdocs build

# Output will be in ./site directory
```

## Deployment

Documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

The deployment workflow is defined in `.github/workflows/docs.yml`.

## Structure

```
docs/
├── index.md                    # Home page
├── getting-started/            # Quick start guides
│   ├── quick-start.md
│   ├── installation.md
│   └── zero-budget.md
├── architecture/               # System architecture
│   ├── overview.md
│   ├── authentication-flow.md
│   ├── database-schema.md
│   └── security.md
├── api/                        # API documentation
│   ├── index.md
│   ├── openapi.yaml
│   ├── authentication.md
│   └── two-factor.md
├── guides/                     # Integration guides
│   └── integration.md
├── reference/                  # Reference documentation
│   └── error-codes.md
├── faq.md                      # FAQ
└── changelog.md                # Changelog
```

## Writing Documentation

### Markdown Extensions

We use [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) with these extensions:

- **Admonitions**: `!!! note`, `!!! warning`, `!!! success`
- **Code blocks**: Syntax highlighting with line numbers
- **Mermaid diagrams**: Flowcharts, sequence diagrams, ER diagrams
- **Tabs**: Content in tabs
- **Tables**: GitHub-flavored tables

### Examples

#### Admonitions

```markdown
!!! note "Optional Title"
    This is a note admonition.

!!! warning
    This is a warning.

!!! success
    Operation completed successfully!
```

#### Mermaid Diagrams

```markdown
\`\`\`mermaid
graph LR
    A[Client] --> B[Server]
    B --> C[Database]
\`\`\`
```

#### Code Blocks

```markdown
\`\`\`typescript
const example = "code"
\`\`\`
```

#### Tabs

```markdown
=== "Tab 1"
    Content for tab 1

=== "Tab 2"
    Content for tab 2
```

## Contributing

1. Make changes to markdown files in `docs/`
2. Test locally with `mkdocs serve`
3. Commit and push to `main` branch
4. GitHub Actions will automatically build and deploy

## Links

- **Live Documentation**: https://Ilia01.github.io/Aegis2FA
- **MkDocs Material**: https://squidfunk.github.io/mkdocs-material/
- **Material Icons**: https://pictogrammers.com/library/mdi/
