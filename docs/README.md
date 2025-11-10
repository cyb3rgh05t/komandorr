# Komandorr Documentation

This directory contains the source files for Komandorr's documentation, built with [MkDocs](https://www.mkdocs.org/) and [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/).

## Local Development

### Prerequisites

- Python 3.9+
- pip

### Setup

1. Install dependencies:

```bash
pip install -r docs/requirements.txt
```

2. Start development server:

```bash
mkdocs serve
```

3. Open browser to http://localhost:8000

The documentation will auto-reload when you make changes.

## Building

Build static site:

```bash
mkdocs build
```

Output will be in `site/` directory.

## Deployment

Documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

The deployment workflow is defined in `.github/workflows/docs.yml`.

### Manual Deployment

```bash
mkdocs gh-deploy
```

This will build the site and push to the `gh-pages` branch.

## Structure

```
docs/
├── index.md              # Homepage
├── about.md              # About page
├── changelog.md          # Changelog
├── getting-started/      # Getting started guides
│   ├── installation.md
│   ├── quickstart.md
│   ├── configuration.md
│   └── docker.md
├── features/             # Feature documentation
│   ├── dashboard.md
│   ├── services.md
│   ├── vod-streams.md
│   ├── traffic.md
│   ├── themes.md
│   ├── languages.md
│   └── authentication.md
├── configuration/        # Configuration guides
│   ├── environment.md
│   ├── services.md
│   ├── plex.md
│   └── traffic-agent.md
├── api/                  # API documentation
│   ├── overview.md
│   ├── services.md
│   ├── plex.md
│   ├── traffic.md
│   └── auth.md
├── guides/               # How-to guides
│   ├── troubleshooting.md
│   ├── development.md
│   └── contributing.md
├── stylesheets/          # Custom CSS
│   └── extra.css
├── javascripts/          # Custom JavaScript
│   └── extra.js
└── images/               # Images and screenshots
    ├── logo.svg          # SVG logo (current)
    ├── logo.png          # PNG logo (legacy)
    ├── favicon.svg       # SVG favicon (current)
    ├── favicon.png       # PNG favicon (legacy)
    └── screenshots/
```

## Writing Documentation

### Markdown Files

- Use proper headings hierarchy (# → ## → ###)
- Add blank lines around lists and code blocks
- Use fenced code blocks with language identifiers
- Link between pages using relative paths

### Code Blocks

Specify language for syntax highlighting:

````markdown
```python
def hello():
    print("Hello, World!")
```
````

### Admonitions

Use Material admonitions for notes/warnings:

```markdown
!!! note
This is a note.

!!! warning
This is a warning.

!!! tip
This is a tip.
```

### Buttons

Create buttons with:

```markdown
[Button Text](page.md){ .md-button }
[Primary Button](page.md){ .md-button .md-button--primary }
```

### Tables

Use standard Markdown tables:

```markdown
| Column 1 | Column 2 |
| -------- | -------- |
| Value 1  | Value 2  |
```

### Tabs

Use content tabs for alternatives:

```markdown
=== "Tab 1"
Content for tab 1

=== "Tab 2"
Content for tab 2
```

## Style Guide

- **Headings**: Title case for main headings
- **Code**: Use backticks for inline code
- **Links**: Descriptive link text (not "click here")
- **Lists**: Use `-` for unordered lists
- **Emphasis**: `**bold**` for important terms, `*italic*` for emphasis

## Testing

Before committing:

1. Test locally with `mkdocs serve`
2. Check all links work
3. Verify code examples are correct
4. Test on mobile viewport
5. Build with `mkdocs build --strict` to catch errors

## Resources

- [MkDocs Documentation](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- [Markdown Guide](https://www.markdownguide.org/)
