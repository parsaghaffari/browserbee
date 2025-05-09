---
sidebar_position: 5
---

# Deployment Guide

This guide will walk you through the process of deploying the BrowserBee documentation to GitHub Pages.

## Prerequisites

Before you begin, make sure you have:

1. A GitHub account
2. Git installed on your local machine
3. Node.js and npm installed
4. Access to the BrowserBee repository

## Setting Up GitHub Pages

GitHub Pages is a static site hosting service that takes HTML, CSS, and JavaScript files directly from a repository on GitHub and publishes a website.

### Configure docusaurus.config.js

The `docusaurus.config.js` file has already been configured for GitHub Pages deployment with the following settings:

```javascript
module.exports = {
  // ...
  url: 'https://parsaghaffari.github.io',
  baseUrl: '/browserbee/',
  organizationName: 'parsaghaffari', // GitHub username
  projectName: 'browserbee', // GitHub repository name
  // ...
};
```

If you're deploying to a different GitHub account, you'll need to update these values accordingly.

## Deployment Process

### Manual Deployment

1. Build the documentation site
   ```bash
   cd docs
   npm run build
   ```

2. Deploy to GitHub Pages
   ```bash
   npm run deploy
   ```

   This command will:
   - Build the website
   - Create a `gh-pages` branch if it doesn't exist
   - Push the built files to the `gh-pages` branch

3. Configure GitHub Repository Settings
   - Go to your GitHub repository
   - Navigate to Settings > Pages
   - Ensure the source is set to the `gh-pages` branch
   - Your site will be published at `https://[username].github.io/browserbee/`

### Automated Deployment with GitHub Actions

You can also set up GitHub Actions to automatically deploy your documentation whenever changes are pushed to the main branch.

1. Create a GitHub Actions workflow file at `.github/workflows/documentation.yml`:

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths: ['docs/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
          cache: npm
          cache-dependency-path: docs/package-lock.json

      - name: Install dependencies
        run: cd docs && npm ci

      - name: Build website
        run: cd docs && npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/build
          user_name: github-actions[bot]
          user_email: github-actions[bot]@users.noreply.github.com
```

2. Push this file to your repository
3. GitHub Actions will automatically deploy your documentation when changes are pushed to the main branch

## Customizing the Documentation

### Changing the Theme

You can customize the look and feel of your documentation by editing the `docs/src/css/custom.css` file.

### Adding Custom Pages

To add custom pages:

1. Create a new markdown file in the `docs/docs` directory
2. Add front matter with a sidebar position:
   ```
   ---
   sidebar_position: 6
   ---
   ```
3. Add your content using Markdown

### Adding Images

To add images to your documentation:

1. Place your images in the `docs/static/img` directory
2. Reference them in your markdown files:
   ```markdown
   ![Alt text](/img/your-image.png)
   ```

## Troubleshooting

### Deployment Fails

If deployment fails, check:

1. Your GitHub repository settings
2. The `docusaurus.config.js` configuration
3. GitHub Actions logs (if using automated deployment)

### Broken Links

If you have broken links in your documentation:

1. Run `npm run build` locally to check for broken links
2. Fix any broken links reported in the console
3. Redeploy the documentation

## Updating the Documentation

To update the documentation:

1. Make your changes to the markdown files
2. Build and test locally:
   ```bash
   cd docs
   npm run start
   ```
3. Deploy the changes using one of the methods above

## Additional Resources

- [Docusaurus Documentation](https://docusaurus.io/docs)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Markdown Guide](https://www.markdownguide.org/)
