export type { Project, CreateProjectInput } from './project.js'
export { createProject } from './project.js'

export type { Record, CreateRecordInput } from './record.js'
export { createRecord } from './record.js'

export type {
  TotalSettings,
  SpeedMode,
  ScreenSize,
  ScreenSizePreset,
  DatesInterval,
} from './settings.js'
export {
  createDefaultTotalSettings,
  DEFAULT_TOP_N,
  DEFAULT_SCALE,
  DEFAULT_SPEED_VALUE_TOTAL_LENGTH,
  DEFAULT_SMOOTHING_INTERVAL,
  SCREEN_SIZE_PRESETS,
} from './settings.js'

export type {
  Theme,
  ValueFrontiers,
  FillingMode,
  ImageFit,
  TimerPosition,
  TimerFormat,
  TimerBackdrop,
  TimerChangeAnimation,
  ValueFormat,
  ValueLabelPosition,
  NameLabelPosition,
  AvatarShape,
  BarFillStyle,
  ShadowStyle,
  EntranceAnimation,
  ThemeFilling,
  ThemeTimer,
  ThemeBackground,
  ThemeValueLabel,
  ThemeNameLabel,
  ThemeAvatar,
  ThemeCardTypography,
  ThemeCard,
} from './theme.js'
export { createDefaultTheme, DEFAULT_BAR_PALETTE } from './theme.js'
