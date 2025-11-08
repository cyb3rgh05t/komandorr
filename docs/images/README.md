# Images Directory

This directory contains images and assets for the documentation.

## Structure

```
images/
├── logo.png              # Komandorr logo
├── favicon.png           # Favicon
└── screenshots/          # Application screenshots
    ├── dashboard.png
    ├── vod-streams.png
    ├── traffic.png
    ├── services.png
    └── settings.png
```

## Adding Images

1. Place images in this directory or subdirectories
2. Reference in Markdown:

```markdown
![Alt text](images/screenshot.png)
```

For images in subdirectories:

```markdown
![Dashboard](images/screenshots/dashboard.png)
```

## Image Guidelines

- **Format**: PNG or JPG
- **Size**: Optimize for web (use tools like TinyPNG)
- **Naming**: Use descriptive, lowercase names with hyphens
- **Alt Text**: Always include descriptive alt text

## Screenshots

To add application screenshots:

1. Take screenshot of the feature
2. Crop to relevant area
3. Optimize file size
4. Save with descriptive name
5. Place in `screenshots/` folder
6. Reference in documentation

## Logo

The logo should be:

- Transparent background (PNG)
- Square aspect ratio (recommended)
- At least 200x200px for clarity
