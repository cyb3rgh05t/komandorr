# Themes

Customize Komandorr's appearance with multiple theme options to match your preference.

## Available Themes

Komandorr includes several built-in themes:

### Light Theme

Clean, bright interface perfect for daytime use.

- **Background**: Light gray/white
- **Text**: Dark gray/black
- **Accent**: Blue
- **Best for**: Bright environments, office use

### Dark Theme

Modern dark interface that's easy on the eyes.

- **Background**: Dark gray/black
- **Text**: Light gray/white
- **Accent**: Blue
- **Best for**: Night use, reducing eye strain

### Auto Theme

Automatically switches between light and dark based on system preference.

- Follows operating system theme setting
- Switches at sunset/sunrise
- Best of both worlds

## Changing Themes

### Via User Interface

1. Click your **profile icon** in top right
2. Select **Theme Dropdown**
3. Choose your preferred theme:
   - Light
   - Dark
   - Auto

Theme changes take effect immediately.

### Via API

```bash
curl -X POST http://localhost:3000/api/user/preferences \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark"}'
```

## Theme Persistence

Your theme choice is saved:

- **Browser**: Stored in localStorage
- **Account**: Synced across devices (when logged in)
- **Auto**: Remembered even after logout

## Customization

### Custom Colors (Coming Soon)

Future versions will support:

- Custom accent colors
- Brand color schemes
- Per-user customization
- Theme builder interface

### High Contrast Mode

For accessibility:

1. Enable in **Settings** → **Accessibility**
2. Increases contrast ratios
3. Meets WCAG AAA standards

## Component Theming

Different UI components adapt to the selected theme:

### Charts and Graphs

- Line colors adjust for visibility
- Grid lines adapt to background
- Hover states remain clear

### Service Cards

- Status colors remain consistent
- Card backgrounds theme-aware
- Shadows and borders adjust

### Navigation

- Sidebar theming
- Active state indicators
- Dropdown menus

## Theme Development

Want to create custom themes? See our [Theme Development Guide](../guides/contributing.md#custom-themes) for:

- Theme structure
- CSS variables
- Color palette requirements
- Contribution guidelines

## Accessibility

All themes meet accessibility standards:

- **WCAG AA** compliant contrast ratios
- **Color blindness** friendly
- **Screen reader** compatible
- **Keyboard navigation** supported

## Browser Support

Themes work across all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

!!! note "CSS Variables"
Themes use modern CSS custom properties. Very old browsers may not support theming.

## Related Documentation

- [User Settings](../configuration/environment.md)
- [Accessibility Features](../guides/contributing.md)
- [Contributing Themes](../guides/contributing.md)
