# GitHub Pages Deployment Guide

This document explains how to deploy the ombudsman-reports-app to GitHub Pages using the automated workflow.

## Prerequisites

1. **Repository on GitHub**: Ensure your repository is hosted on GitHub
2. **GitHub Pages enabled**: Enable GitHub Pages in your repository settings
3. **Actions permissions**: Ensure GitHub Actions has permissions to deploy to Pages

## Setup Instructions

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to `Settings` → `Pages`
3. Under "Source", select "GitHub Actions"
4. Save the settings

### 2. Configure Repository Permissions

1. Go to `Settings` → `Actions` → `General`
2. Under "Workflow permissions", select "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"
4. Save the settings

### 3. Verify Deployment Configuration

The repository includes the following files for GitHub Pages deployment:

- **`.github/workflows/deploy.yml`**: GitHub Actions workflow for automated deployment
- **`next.config.js`**: Next.js configuration with GitHub Pages settings
- **`public/.nojekyll`**: File to bypass Jekyll processing on GitHub Pages

## Deployment Process

### Automatic Deployment

The app will automatically deploy to GitHub Pages when:
- Code is pushed to the `master` or `main` branch
- A pull request is merged into the main branch

### Manual Deployment

You can also trigger a deployment manually:
1. Go to the `Actions` tab in your GitHub repository
2. Select the "Deploy to GitHub Pages" workflow
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

## Accessing Your Deployed App

Once deployed, your app will be available at:
```
https://[your-username].github.io/ombudsman-reports-app/
```

Replace `[your-username]` with your actual GitHub username.

## Workflow Details

The GitHub Actions workflow performs these steps:

1. **Checkout code**: Downloads the repository code
2. **Setup Node.js**: Installs Node.js 18
3. **Install dependencies**: Runs `npm ci` to install packages
4. **Build application**: Runs `npm run build` to create static files
5. **Deploy to Pages**: Uploads the `out/` directory to GitHub Pages

## Configuration Files

### `.github/workflows/deploy.yml`
- Defines the automated deployment pipeline
- Triggers on pushes to main/master branches
- Builds the Next.js app and deploys to GitHub Pages

### `next.config.js`
- Configured for static export (`output: 'export'`)
- Sets base path for GitHub Pages subdirectory
- Optimizes images for static deployment

### `public/.nojekyll`
- Prevents GitHub from processing files with Jekyll
- Ensures Next.js files are served correctly

## Troubleshooting

### Common Issues

1. **404 errors**: Ensure the base path is correctly configured in `next.config.js`
2. **CSS/JS not loading**: Check that `assetPrefix` is set correctly
3. **Workflow fails**: Verify GitHub Actions permissions in repository settings

### Checking Deployment Status

1. Go to the `Actions` tab in your repository
2. Click on the latest workflow run
3. Check the build and deployment logs for any errors

### Local Testing

To test the GitHub Pages build locally:
```bash
npm run build
npx serve out
```

This will serve the static files locally to verify they work correctly.

## Environment Variables

If your app uses environment variables:
1. Go to `Settings` → `Secrets and variables` → `Actions`
2. Add your environment variables as repository secrets
3. Reference them in the workflow file if needed

## Custom Domain (Optional)

To use a custom domain:
1. Add a `CNAME` file to the `public/` directory with your domain
2. Configure your domain's DNS to point to GitHub Pages
3. Enable custom domain in repository settings

## Support

For issues with GitHub Pages deployment, check:
- [GitHub Pages documentation](https://docs.github.com/en/pages)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
- Repository's Actions tab for workflow run details