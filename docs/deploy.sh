#!/bin/bash

# Build the documentation site
npm run build

# Deploy to GitHub Pages
# Note: Replace 'parsaghaffari' with your GitHub username
GIT_USER=parsaghaffari USE_SSH=true npm run deploy
