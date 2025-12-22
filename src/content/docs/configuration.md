---
title: Configuration
description: "Details about .mini-cms.yml and other configurations in Mini CMS."
---

# Configuration

Mini CMS uses a `.mini-cms.yml` file in the root of your repository to control access and behavior. This file is managed on the `mini-cms-flow` branch.

## The .mini-cms.yml File

This file defines which directories Mini CMS is allowed to access and edit.

```yaml
allowed_directories:
  - content/blog
  - src/pages/docs
  - public/assets
```

### Properties

- `allowed_directories`: A list of paths (relative to the repo root) that the editor can browse and modify.

## Project Settings

In the Mini CMS dashboard, you can configure additional settings for each project:

- **File Creation:** Allow or disallow creating new files.
- **File Deletion:** Allow or disallow deleting existing files.
- **Max File Size:** Set a limit on the size of files that can be uploaded or edited.
- **Allowed Extensions:** Restrict editing to specific file types (e.g., `.md`, `.mdx`).

## Branching Strategy

Mini CMS operates on a dedicated branch called `mini-cms-flow`. This ensures that your main branch remains stable while content is being drafted. You can merge the `mini-cms-flow` branch into your main branch using a Pull Request whenever you're ready to publish.

<div class="mt-12 p-6 bg-earth-100 rounded-2xl border border-earth-200">
    <h3 class="mt-0! text-earth-400">Pro Tip</h3>
    <p class="mb-0!">
        You can set up GitHub Actions to automatically deploy your site whenever the <code>mini-cms-flow</code> branch is updated, or keep it manual for a more controlled publishing process.
    </p>
</div>
