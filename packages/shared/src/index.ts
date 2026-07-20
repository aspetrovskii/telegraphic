/**
 * @telegraphic/shared — types, Telegram export parser, and deterministic canvas bar-race engine.
 * Pure functions only in the public API; no DOM / React.
 */

export { PACKAGE_NAME, health } from './health.js'

export type {
  Project,
  CreateProjectInput,
  Record,
  CreateRecordInput,
  TotalSettings,
  Theme,
  SpeedMode,
  ScreenSize,
  ScreenSizePreset,
  DatesInterval,
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
} from './types/index.js'

export {
  createProject,
  createRecord,
  createDefaultTotalSettings,
  createDefaultTheme,
  DEFAULT_TOP_N,
  DEFAULT_SCALE,
  DEFAULT_SPEED_VALUE_TOTAL_LENGTH,
  DEFAULT_SMOOTHING_INTERVAL,
  SCREEN_SIZE_PRESETS,
  DEFAULT_BAR_PALETTE,
} from './types/index.js'

export { isIsoDate, enumerateDays, unionTicks, alignCountsToTicks } from './ticks.js'

export {
  ParseError,
  type ParseErrorCode,
  telegramChatExportSchema,
  telegramMessageSchema,
  isFullAccountExport,
  type TelegramChatExport,
  type TelegramMessage,
  aggregateDailyCumulative,
  dayKeyFromTelegramDate,
  isCountableMessage,
  parsedExportToRecord,
  type ParsedChatExport,
  type ParseProgress,
  type ParseProgressStage,
  type ProgressCallback,
  parseTelegramChatExport,
  parseTelegramChatExportJson,
  parseTelegramChatExportBytes,
  parseTelegramChatExportZip,
  parseTelegramExportBytes,
  looksLikeZip,
} from './parser/index.js'

export {
  render,
  computeFrameLayout,
  drawFrame,
  computeProjectDuration,
  playbackPositionAt,
  resolvePlaybackTicks,
  rankRecords,
  takeTopN,
  niceCeiling,
  axisCeilingForValues,
  lerpAxisCeiling,
  lerp,
  clamp01,
  smoothstep,
  formatTimerDate,
  formatValue,
  colorForRecordId,
  countAtTick,
} from './engine/index.js'

export type {
  EngineCanvasContext,
  FrameLayout,
  BarLayout,
  ProjectDuration,
  PlaybackPosition,
  RankedEntry,
} from './engine/index.js'

export { createEngineFixtureProject } from './fixtures/engineProject.js'
