---
title: Getting Started
description: "Learn how to set up and start using Mini CMS."
---

# Getting Started

Setting up Mini CMS is quick and easy. Follow these steps to connect your GitHub repository and start managing your content.

## 1. Sign In

Go to the [Login page](/auth/login) and sign in with your Google account. This will create your Mini CMS account.

## 2. Create an Organization

Once signed in, you'll be prompted to create an organization. Give it a name and description. This will be the home for your projects.

## 3. Install the GitHub App

After creating an organization, you'll need to install the Mini CMS GitHub App on your account or organization. Select the repositories you want Mini CMS to have access to.

## 4. Create a Project

In your dashboard, click on "New Project". Select the repository you want to link. Mini CMS will automatically create a `mini-cms-flow` branch and a `.mini-cms.yml` configuration file in your repository.

## 5. Start Editing

Navigate to your project, browse your files, and start editing! Changes will be committed directly to the `mini-cms-flow` branch.

```yaml
# Example .mini-cms.yml
allowed_directories:
  - content/blog
  - src/pages/docs
```

## Next Steps

Learn more about [Configuration](/docs/configuration) to customize how Mini CMS interacts with your repository.
