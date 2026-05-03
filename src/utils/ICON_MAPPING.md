# Icon Mapping Guide

This file documents all icon mappings from our internal icon names to Tabler Icons.
**To change an icon assignment, edit the `tablerIconRegistry` in `canvas-icons.ts`.**

## Current Icon Mappings

### UI Icons (used in buttons/menus)
These are defined in `icons.ts` → `iconNameMap`:

| Internal Name | Tabler Icon | Notes |
|--------------|-------------|-------|
| `grip-vertical` | `grip-vertical` | Drag handle |
| `x` | `x` | Close/delete |
| `rotate-cw` | `rotate-clockwise` | Rotate |
| `plus` | `plus` | Add |
| `sparkles` | `sparkles` | Preset/effects |
| `eye` | `eye` | Show |
| `eye-off` | `eye-off` | Hide |
| `power` | `power` | Power on/off |
| `chevron-down` | `chevron-down` | Dropdown |
| `chevron-right` | `chevron-right` | Expand |
| `chevron-left` | `chevron-left` | Collapse |
| `maximize-2` | `maximize` | Expand window |
| `minimize-2` | `minimize` | Minimize window |
| `play` | `player-play` | Play audio |
| `pause` | `player-pause` | Pause audio |
| `mouse-pointer` | `pointer` | Cursor tool |
| `hand` | `hand-finger` | Hand/pan tool |
| `lasso` | `lasso` | Select tool |
| `menu` | `menu-2` | Menu |
| `zoom-in` | `zoom-in` | Zoom |

### Node Icons (used in canvas rendering)
These are defined in `canvas-icons.ts` → `tablerIconRegistry`:

| Internal Name | Tabler Icon | Alternative Options | Notes |
|--------------|-------------|---------------------|-------|
| `audio-waveform` | `wave-sine` | `wave`, `music`, `waveform` | Audio signal |
| `grid` | `grid-3x3` | `grid-pattern`, `grid-dots` | Grid pattern |
| `circle` | `circle` | `circle-dot`, `circle-filled` | Circle shape |
| `calculator` | `calculator` | `math`, `function` | Math operations |
| `settings` | `settings` | `settings-2`, `adjustments` | Settings/gear |
| `move` | `arrows-move` | `move-vertical`, `arrows` | Move/translate |
| `layers` | `layers` | `stack`, `layers-3` | Layers/blend |
| `square` | `square` | `square-rounded`, `rectangle` | Square shape |
| `sparkles` | `sparkles` | `stars`, `sparkles` | Effects/sparkles |
| `monitor` | `device-desktop` | `screen`, `display` | Monitor/output |
| `time-clock` | `clock` | `clock-hour-4`, `time` | Time/clock |
| `wave` | `wave` | `wave-sine`, `waveform` | Wave pattern |
| `sphere` | `sphere` | `circle`, `3d-cube-sphere` | 3D sphere |
| `noise` | `grain` | `dots`, `noise`, `pattern` | Noise pattern |
| `hexagon` | `hexagon` | `hexagon-filled` | Hexagon shape |
| `ring` | `target` | `circle`, `ring` | Concentric rings |
| `rotate` | `rotate-clockwise` | `rotate-2`, `refresh` | Rotation |
| `blur-circle` | `blur` | `circle`, `focus` | Blur effect |
| `glow` | `sun` | `bulb`, `flare` | Glow/light |
| `twist` | `gauge` | `rotate`, `spiral` | Twist/spiral |
| `scanline` | `scan` | `lines`, `grid` | Scanlines |
| `plus` | `plus` | `plus-circle` | Add |
| `minus` | `minus` | `minus-circle` | Subtract |
| `multiply-x` | `x` | `multiply`, `times` | Multiply |
| `divide` | `divide` | `slash` | Division |
| `power` | `bolt` | `power`, `zap` | Power/exponent |
| `arrow-right` | `arrow-right` | `arrow-forward` | Right arrow |
| `resize` | `maximize` | `arrows-diagonal`, `resize` | Resize/scale |
| `ruler` | `ruler` | `ruler-2`, `measure` | Ruler/measure |
| `vector-dot` | `circle-dot` | `dot`, `point` | Dot product |
| `vector-cross` | `navigation` | `x`, `cross` | Cross product |
| `normalize` | `arrows-up-down` | `arrows-vertical`, `normalize` | Normalize vector |
| `constant` | `hash` | `number`, `123` | Constant/number |
| `color-palette` | `palette` | `color-swatch`, `paint` | Color palette |
| `light` | `bulb` | `lightbulb`, `lamp` | Light bulb |
| `dither` | `grid-pattern` | `grid`, `pattern` | Dither pattern |
| `tone-curve` | `chart-line` | `chart`, `curve` | Tone curve |
| `select` | `toggle-left` | `toggle`, `switch` | Select/switch |
| `color-wheel` | `color-picker` | `color-swatch`, `palette` | Color picker |
| `kaleidoscope` | `shapes` | `pattern`, `mirror` | Kaleidoscope pattern |
| `particle` | `dots` | `grain`, `particle` | Particle system |
| `gradient` | `gradient` | `color-gradient`, `palette` | Gradient |
| `rgb-split` | `color-swatch` | `palette`, `split` | RGB separation |
| `glitch-block` | `layout-grid` | `grid`, `blocks` | Glitch blocks |
| `sqrt` | `math-function` | `function`, `sqrt` | Square root |
| `trig-wave` | `wave-sine` | `wave`, `chart-sine` | Trigonometry wave |
| `reflect` | `arrow-bounce-right` | `mirror`, `reflect` | Reflection |
| `refract` | `lens` | `light`, `glass` | Refraction |
| `bezier` | `curve` | `path`, `bezier-curve` | Bezier curve |
| `normal-map` | `3d-cube-sphere` | `cube`, `3d` | Normal mapping |
| `compare` | `arrows-left-right` | `compare`, `swap` | Comparison |

## How to Change an Icon

1. **Find the Tabler icon name** at https://tabler.io/icons
2. **Edit `src/utils/canvas-icons.ts`**:
   - Find the `tablerIconRegistry` object (around line 14)
   - Change the value for the icon you want to modify
   - Example: `'audio-waveform': 'wave-sine'` → `'audio-waveform': 'music'`
3. **For UI icons**, edit `src/utils/icons.ts`:
   - Find the `iconNameMap` object (around line 17)
   - Change the Tabler icon name there

## Icon Naming Convention

Tabler icons use kebab-case. To find an icon:
- Visit https://tabler.io/icons
- Search for keywords (e.g., "wave", "audio", "sphere")
- Use the exact icon name from the URL (e.g., `wave-sine`, `device-desktop`)

## Notes

- All icons now come from Tabler Icons library
- Procedural drawing fallbacks have been removed
- If an icon doesn't exist in Tabler, pick the closest alternative
- Icons support both `line` (outline) and `filled` variants via the `variant` parameter
