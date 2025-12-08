# GitHub Repository Setup Guide

This guide will help you create a GitHub repository for your Performance Ranking App and push your code to it.

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Fill in the repository details:
   - **Repository name**: `performance-ranking-app` (or any name you prefer)
   - **Description**: "Progressive Web App for live performance ranking at musical ensemble contests"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

## Step 2: Connect Your Local Repository to GitHub

After creating the repository, GitHub will show you commands to push your existing repository. Run these commands in your project directory:

```bash
cd /home/user/performance-ranking-app

# Add GitHub as a remote
git remote add origin https://github.com/YOUR_USERNAME/performance-ranking-app.git

# Push your code to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Verify

1. Refresh your GitHub repository page
2. You should see all your project files
3. Your README.md will be displayed on the repository homepage

## Alternative: Using SSH

If you have SSH keys set up with GitHub:

```bash
cd /home/user/performance-ranking-app

# Add GitHub as a remote (SSH)
git remote add origin git@github.com:YOUR_USERNAME/performance-ranking-app.git

# Push your code to GitHub
git push -u origin main
```

## Making Future Changes

After your repository is set up, you can make changes and push them:

```bash
# Make your changes to files...

# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "Description of changes"

# Push to GitHub
git push
```

## Troubleshooting

### Authentication Issues

If you get authentication errors when pushing:

1. **HTTPS**: You may need to use a Personal Access Token instead of your password
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Generate a new token with `repo` scope
   - Use the token as your password when prompted

2. **SSH**: Make sure you've added your SSH key to GitHub
   - Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
   - Add to GitHub: Settings > SSH and GPG keys > New SSH key

### Branch Name Issues

If GitHub suggests using a different branch name:

```bash
# Rename your branch if needed
git branch -M main

# Push again
git push -u origin main
```

## Next Steps

After pushing to GitHub, you can:
- Enable GitHub Pages to host your app (if deploying the built version)
- Set up GitHub Actions for CI/CD
- Invite collaborators to your repository
- Create issues and pull requests for tracking work

For more information, visit [GitHub Docs](https://docs.github.com).
