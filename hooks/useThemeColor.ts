/**
 * Simple hook that returns a color from the Sequins brand palette.
 * Import colors directly from src/theme/colors for most use cases.
 */

import { colors } from '../src/theme/colors';

export function useThemeColor(
  _props: { light?: string; dark?: string },
  colorName: keyof typeof colors
): string {
  return colors[colorName];
}
