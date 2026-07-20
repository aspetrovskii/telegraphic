/** Design / Theme tokens consumed by the canvas engine (PRD §2.2 Design). */

export type ValueFrontiers = 'lines' | 'stripes' | 'off'

export type FillingMode = 'solid' | 'image'

export type ImageFit = 'cover' | 'contain' | 'tile'

export type TimerPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export type TimerFormat = 'DD/MM/YY' | 'DD MMM YYYY' | 'MMM YYYY' | 'YYYY' | 'Q# YYYY'

export type TimerBackdrop = 'none' | 'pill' | 'rectangle'

export type TimerChangeAnimation = 'none' | 'fade' | 'slide-up' | 'odometer'

export type ValueFormat = 'raw' | 'compact'

export type ValueLabelPosition = 'outside-end' | 'inside-end'

export type NameLabelPosition = 'inside-end' | 'outside'

export type AvatarShape = 'circle' | 'rounded' | 'square'

export type BarFillStyle = 'solid' | 'horizontal-gradient' | 'texture'

export type ShadowStyle = 'none' | 'soft'

export type EntranceAnimation = 'fade' | 'slide-from-edge'

export type ThemeFilling = {
  mode: FillingMode
  color: string
  imageDataUrl?: string
  imageFit: ImageFit
}

export type ThemeTimer = {
  show: boolean
  position: TimerPosition
  offsetX: number
  offsetY: number
  format: TimerFormat
  /** Second line `HH:MM` when smoothing &lt; 1 day. */
  showTime: boolean
  fontFamily: string
  fontSize: number
  fontWeight: number
  color: string
  opacity: number
  letterSpacing: number
  backdrop: TimerBackdrop
  backdropColor: string
  backdropOpacity: number
  backdropBlur: number
  changeAnimation: TimerChangeAnimation
}

export type ThemeBackground = {
  valueFrontiers: ValueFrontiers
  filling: ThemeFilling
  timer: ThemeTimer
}

export type ThemeValueLabel = {
  show: boolean
  format: ValueFormat
  decimals: number
  thousandsSeparator: boolean
  position: ValueLabelPosition
}

export type ThemeNameLabel = {
  show: boolean
  position: NameLabelPosition
  maxWidth: number
}

export type ThemeAvatar = {
  show: boolean
  shape: AvatarShape
  size: number
  borderWidth: number
  borderColor: string
}

export type ThemeCardTypography = {
  nameFontFamily: string
  nameFontSize: number
  nameFontWeight: number
  valueFontFamily: string
  valueFontSize: number
  valueFontWeight: number
}

export type ThemeCard = {
  barCornerRadius: number
  barHeight: number
  barGap: number
  valueLabel: ThemeValueLabel
  nameLabel: ThemeNameLabel
  avatar: ThemeAvatar
  rankShow: boolean
  typography: ThemeCardTypography
  barFillStyle: BarFillStyle
  barOutline: boolean
  shadow: ShadowStyle
  entranceAnimation: EntranceAnimation
  /** Stable auto palette keyed by record index / id hash. */
  palette: string[]
}

/** Per-card overrides live on `Record` (color, avatar); theme holds globals. */
export type Theme = {
  background: ThemeBackground
  card: ThemeCard
}

/** Default rating palette (distinct, canvas-safe). Not UI chrome tokens. */
export const DEFAULT_BAR_PALETTE: readonly string[] = [
  '#4E79A7',
  '#F28E2B',
  '#E15759',
  '#76B7B2',
  '#59A14F',
  '#EDC948',
  '#B07AA1',
  '#FF9DA7',
  '#9C755F',
  '#BAB0AC',
  '#86BCB6',
  '#D37295',
]

export function createDefaultTheme(): Theme {
  return {
    background: {
      valueFrontiers: 'lines',
      filling: {
        mode: 'solid',
        color: '#FFFFFF',
        imageFit: 'cover',
      },
      timer: {
        show: true,
        position: 'bottom-right',
        offsetX: 24,
        offsetY: 24,
        format: 'MMM YYYY',
        showTime: false,
        fontFamily: 'Inter',
        fontSize: 48,
        fontWeight: 700,
        color: '#1A1A1A',
        opacity: 1,
        letterSpacing: 0,
        backdrop: 'none',
        backdropColor: '#FFFFFF',
        backdropOpacity: 0.8,
        backdropBlur: 0,
        changeAnimation: 'fade',
      },
    },
    card: {
      barCornerRadius: 6,
      barHeight: 36,
      barGap: 8,
      valueLabel: {
        show: true,
        format: 'compact',
        decimals: 1,
        thousandsSeparator: true,
        position: 'outside-end',
      },
      nameLabel: {
        show: true,
        position: 'inside-end',
        maxWidth: 240,
      },
      avatar: {
        show: true,
        shape: 'circle',
        size: 28,
        borderWidth: 0,
        borderColor: '#000000',
      },
      rankShow: true,
      typography: {
        nameFontFamily: 'Inter',
        nameFontSize: 16,
        nameFontWeight: 600,
        valueFontFamily: 'Inter',
        valueFontSize: 16,
        valueFontWeight: 600,
      },
      barFillStyle: 'solid',
      barOutline: false,
      shadow: 'none',
      entranceAnimation: 'fade',
      palette: [...DEFAULT_BAR_PALETTE],
    },
  }
}
