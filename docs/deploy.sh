#!/bin/bash

# Build the documentation site
npm run build

# Deploy to GitHub Pages
GIT_USER=parsaghaffari npm run deploy
