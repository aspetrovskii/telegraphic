import { useRef, useState, type ReactNode } from 'react'
import type {
  AvatarShape,
  BarFillStyle,
  EntranceAnimation,
  FillingMode,
  ImageFit,
  NameLabelPosition,
  ShadowStyle,
  TimerBackdrop,
  TimerChangeAnimation,
  TimerFormat,
  TimerPosition,
  ValueFormat,
  ValueFrontiers,
  ValueLabelPosition,
} from '@telegraphic/shared'
import { useEditorStore } from './useEditorStore'
import { CURATED_FONTS, FONT_WEIGHTS } from './designFonts'
import { resizeImageFileToDataUrl } from './resizeAvatar'

const FRONTIER_OPTIONS: { value: ValueFrontiers; label: string }[] = [
  { value: 'lines', label: 'Lines' },
  { value: 'stripes', label: 'Stripes' },
  { value: 'off', label: 'Off' },
]

const TIMER_POSITIONS: TimerPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

const TIMER_FORMATS: TimerFormat[] = ['DD/MM/YY', 'DD MMM YYYY', 'MMM YYYY', 'YYYY', 'Q# YYYY']

const TIMER_BACKDROPS: { value: TimerBackdrop; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'pill', label: 'Pill' },
  { value: 'rectangle', label: 'Rectangle' },
]

const TIMER_ANIMS: { value: TimerChangeAnimation; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide-up', label: 'Slide up' },
  { value: 'odometer', label: 'Odometer' },
]

/**
 * Design panel — Background + Card theme controls live-bound to the engine.
 * Layout adapted from Stitch screens `Editor — Design Panel Background/Card (Fixed)`.
 */
export function DesignPanel() {
  const designElement = useEditorStore((s) => s.designElement)
  const setDesignElement = useEditorStore((s) => s.setDesignElement)

  return (
    <div className="design-panel" data-testid="design-panel">
      <div className="design-tiles" role="tablist" aria-label="Design element">
        <button
          type="button"
          role="tab"
          className={`design-tile${designElement === 'background' ? ' is-active' : ''}`}
          data-testid="design-tile-background"
          aria-selected={designElement === 'background'}
          onClick={() => setDesignElement('background')}
        >
          <span className="design-tile__swatch design-tile__swatch--bg" aria-hidden />
          Background
        </button>
        <button
          type="button"
          role="tab"
          className={`design-tile${designElement === 'card' ? ' is-active' : ''}`}
          data-testid="design-tile-card"
          aria-selected={designElement === 'card'}
          onClick={() => setDesignElement('card')}
        >
          <span className="design-tile__swatch design-tile__swatch--card" aria-hidden />
          Card
        </button>
      </div>

      {designElement === 'background' ? <BackgroundDesign /> : <CardDesign />}
    </div>
  )
}

function BackgroundDesign() {
  const background = useEditorStore((s) => s.project.theme.background)
  const updateBackground = useEditorStore((s) => s.updateBackground)
  const updateFilling = useEditorStore((s) => s.updateFilling)
  const updateTimer = useEditorStore((s) => s.updateTimer)
  const fillInputRef = useRef<HTMLInputElement>(null)
  const timer = background.timer
  const filling = background.filling

  return (
    <div className="design-section-stack" data-testid="design-background">
      <section className="panel-section">
        <h3 className="panel-section__title">Background</h3>

        <fieldset className="field">
          <legend className="field__label">Value frontiers</legend>
          <div className="segmented" data-testid="value-frontiers">
            {FRONTIER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`segmented__btn${background.valueFrontiers === opt.value ? ' is-active' : ''}`}
                data-testid={`frontiers-${opt.value}`}
                aria-pressed={background.valueFrontiers === opt.value}
                onClick={() => updateBackground({ valueFrontiers: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">Filling</legend>
          <div className="field__row">
            <select
              className="field__input"
              data-testid="filling-mode"
              aria-label="Filling mode"
              value={filling.mode}
              onChange={(e) => updateFilling({ mode: e.target.value as FillingMode })}
            >
              <option value="solid">Solid color</option>
              <option value="image">Image</option>
            </select>
            <label className="color-field">
              <span className="visually-hidden">Filling color</span>
              <input
                type="color"
                className="color-field__input"
                data-testid="filling-color"
                value={normalizeHex(filling.color)}
                onChange={(e) => updateFilling({ color: e.target.value, mode: 'solid' })}
              />
              <span className="color-field__hex">{normalizeHex(filling.color).toUpperCase()}</span>
            </label>
          </div>
          {filling.mode === 'image' && (
            <div className="field__row field__row--wrap">
              <button
                type="button"
                className="btn btn--ghost"
                data-testid="filling-upload"
                onClick={() => fillInputRef.current?.click()}
              >
                Upload image
              </button>
              <select
                className="field__input"
                data-testid="filling-fit"
                aria-label="Image fit"
                value={filling.imageFit}
                onChange={(e) => updateFilling({ imageFit: e.target.value as ImageFit })}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="tile">Tile</option>
              </select>
              <input
                ref={fillInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                data-testid="filling-file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  void resizeImageFileToDataUrl(file, 1280).then((url) =>
                    updateFilling({ mode: 'image', imageDataUrl: url }),
                  )
                  e.target.value = ''
                }}
              />
            </div>
          )}
        </fieldset>
      </section>

      <CollapsibleSection
        title="Timer"
        testId="timer-section"
        defaultOpen
        trailing={
          <Toggle
            checked={timer.show}
            testId="timer-show"
            label="Show timer"
            onChange={(show) => updateTimer({ show })}
          />
        }
      >
        <fieldset className="field">
          <legend className="field__label">Position</legend>
          <div className="corner-picker" data-testid="timer-position">
            {TIMER_POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                className={`corner-picker__btn${timer.position === pos ? ' is-active' : ''}`}
                data-testid={`timer-pos-${pos}`}
                aria-label={pos}
                aria-pressed={timer.position === pos}
                onClick={() => updateTimer({ position: pos })}
              />
            ))}
          </div>
          <div className="field__row">
            <label className="field field--inline">
              <span className="field__label">Offset X</span>
              <input
                className="field__input"
                data-testid="timer-offset-x"
                type="number"
                value={timer.offsetX}
                onChange={(e) => updateTimer({ offsetX: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="field field--inline">
              <span className="field__label">Offset Y</span>
              <input
                className="field__input"
                data-testid="timer-offset-y"
                type="number"
                value={timer.offsetY}
                onChange={(e) => updateTimer({ offsetY: Number(e.target.value) || 0 })}
              />
            </label>
          </div>
        </fieldset>

        <label className="field">
          <span className="field__label">Format</span>
          <select
            className="field__input"
            data-testid="timer-format"
            value={timer.format}
            onChange={(e) => updateTimer({ format: e.target.value as TimerFormat })}
          >
            {TIMER_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--toggle-row">
          <span className="field__label">Show time (HH:MM)</span>
          <Toggle
            checked={timer.showTime}
            testId="timer-show-time"
            label="Show time"
            onChange={(showTime) => updateTimer({ showTime })}
          />
        </label>

        <fieldset className="field">
          <legend className="field__label">Typography</legend>
          <select
            className="field__input"
            data-testid="timer-font"
            aria-label="Timer font"
            value={timer.fontFamily}
            onChange={(e) => updateTimer({ fontFamily: e.target.value })}
          >
            {fontOptions(timer.fontFamily)}
          </select>
          <div className="field__row">
            <select
              className="field__input"
              data-testid="timer-weight"
              aria-label="Timer weight"
              value={timer.fontWeight}
              onChange={(e) => updateTimer({ fontWeight: Number(e.target.value) })}
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
            <input
              className="field__input field__input--narrow"
              data-testid="timer-size"
              type="number"
              min={8}
              max={200}
              aria-label="Timer size"
              value={timer.fontSize}
              onChange={(e) =>
                updateTimer({ fontSize: Math.max(8, Math.min(200, Number(e.target.value) || 8)) })
              }
            />
          </div>
          <div className="field__row">
            <label className="color-field">
              <span className="visually-hidden">Timer color</span>
              <input
                type="color"
                className="color-field__input"
                data-testid="timer-color"
                value={normalizeHex(timer.color)}
                onChange={(e) => updateTimer({ color: e.target.value })}
              />
              <span className="color-field__hex">{normalizeHex(timer.color).toUpperCase()}</span>
            </label>
            <label className="field field--inline">
              <span className="field__label">Opacity</span>
              <input
                className="field__range"
                data-testid="timer-opacity"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={timer.opacity}
                onChange={(e) => updateTimer({ opacity: Number(e.target.value) })}
              />
            </label>
          </div>
          <label className="field">
            <span className="field__label">Letter spacing</span>
            <input
              className="field__input"
              data-testid="timer-letter-spacing"
              type="number"
              step={0.5}
              value={timer.letterSpacing}
              onChange={(e) => updateTimer({ letterSpacing: Number(e.target.value) || 0 })}
            />
          </label>
        </fieldset>

        <label className="field">
          <span className="field__label">Backdrop</span>
          <select
            className="field__input"
            data-testid="timer-backdrop"
            value={timer.backdrop}
            onChange={(e) => updateTimer({ backdrop: e.target.value as TimerBackdrop })}
          >
            {TIMER_BACKDROPS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        {timer.backdrop !== 'none' && (
          <>
            <div className="field__row">
              <label className="color-field">
                <span className="visually-hidden">Backdrop color</span>
                <input
                  type="color"
                  className="color-field__input"
                  data-testid="timer-backdrop-color"
                  value={normalizeHex(timer.backdropColor)}
                  onChange={(e) => updateTimer({ backdropColor: e.target.value })}
                />
              </label>
              <label className="field field--inline">
                <span className="field__label">Backdrop opacity</span>
                <input
                  className="field__range"
                  data-testid="timer-backdrop-opacity"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={timer.backdropOpacity}
                  onChange={(e) => updateTimer({ backdropOpacity: Number(e.target.value) })}
                />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Blur</span>
              <input
                className="field__input"
                data-testid="timer-backdrop-blur"
                type="number"
                min={0}
                max={40}
                value={timer.backdropBlur}
                onChange={(e) =>
                  updateTimer({ backdropBlur: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </label>
          </>
        )}

        <label className="field">
          <span className="field__label">Change animation</span>
          <select
            className="field__input"
            data-testid="timer-animation"
            value={timer.changeAnimation}
            onChange={(e) =>
              updateTimer({ changeAnimation: e.target.value as TimerChangeAnimation })
            }
          >
            {TIMER_ANIMS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </CollapsibleSection>
    </div>
  )
}

function CardDesign() {
  const card = useEditorStore((s) => s.project.theme.card)
  const records = useEditorStore((s) => s.project.records)
  const selectedRecordId = useEditorStore((s) => s.selectedRecordId)
  const setSelectedRecordId = useEditorStore((s) => s.setSelectedRecordId)
  const updateCard = useEditorStore((s) => s.updateCard)
  const updateValueLabel = useEditorStore((s) => s.updateValueLabel)
  const updateNameLabel = useEditorStore((s) => s.updateNameLabel)
  const updateAvatarTheme = useEditorStore((s) => s.updateAvatarTheme)
  const updateCardTypography = useEditorStore((s) => s.updateCardTypography)
  const setRecordColor = useEditorStore((s) => s.setRecordColor)
  const setRecordNameColor = useEditorStore((s) => s.setRecordNameColor)
  const setRecordAvatar = useEditorStore((s) => s.setRecordAvatar)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const selected = records.find((r) => r.id === selectedRecordId) ?? null
  const previewColor = selected?.color ?? card.palette[0] ?? '#4E79A7'

  return (
    <div className="design-section-stack" data-testid="design-card">
      <div className="card-thumb" data-testid="card-thumb" aria-hidden>
        <span
          className="card-thumb__avatar"
          style={{
            background: previewColor,
            borderRadius:
              card.avatar.shape === 'circle'
                ? '50%'
                : card.avatar.shape === 'rounded'
                  ? '30%'
                  : '0',
          }}
        >
          {(selected?.title ?? 'Aa').slice(0, 1)}
        </span>
        <span
          className="card-thumb__bar"
          style={{
            background: previewColor,
            height: Math.min(28, card.barHeight),
            borderRadius: card.barCornerRadius,
          }}
        >
          <span className="card-thumb__name">{selected?.title ?? 'Card preview'}</span>
          <span className="card-thumb__value">128k</span>
        </span>
      </div>

      <CollapsibleSection title="All cards" testId="all-cards-section" defaultOpen>
        <div className="field__row">
          <label className="field field--inline">
            <span className="field__label">Corner radius</span>
            <input
              className="field__input"
              data-testid="bar-radius"
              type="number"
              min={0}
              max={40}
              value={card.barCornerRadius}
              onChange={(e) =>
                updateCard({ barCornerRadius: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
          <label className="field field--inline">
            <span className="field__label">Bar height</span>
            <input
              className="field__input"
              data-testid="bar-height"
              type="number"
              min={8}
              max={120}
              value={card.barHeight}
              onChange={(e) =>
                updateCard({ barHeight: Math.max(8, Math.min(120, Number(e.target.value) || 8)) })
              }
            />
          </label>
          <label className="field field--inline">
            <span className="field__label">Gap</span>
            <input
              className="field__input"
              data-testid="bar-gap"
              type="number"
              min={0}
              max={80}
              value={card.barGap}
              onChange={(e) => updateCard({ barGap: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
        </div>

        <fieldset className="field">
          <legend className="field__label">Value label</legend>
          <label className="field field--toggle-row">
            <span className="field__label">Show</span>
            <Toggle
              checked={card.valueLabel.show}
              testId="value-label-show"
              label="Show value label"
              onChange={(show) => updateValueLabel({ show })}
            />
          </label>
          <div className="field__row">
            <select
              className="field__input"
              data-testid="value-format"
              aria-label="Value format"
              value={card.valueLabel.format}
              onChange={(e) => updateValueLabel({ format: e.target.value as ValueFormat })}
            >
              <option value="raw">Raw</option>
              <option value="compact">Compact</option>
            </select>
            <select
              className="field__input"
              data-testid="value-position"
              aria-label="Value position"
              value={card.valueLabel.position}
              onChange={(e) => updateValueLabel({ position: e.target.value as ValueLabelPosition })}
            >
              <option value="outside-end">Outside end</option>
              <option value="inside-end">Inside end</option>
            </select>
          </div>
          <div className="field__row">
            <label className="field field--inline">
              <span className="field__label">Decimals</span>
              <input
                className="field__input"
                data-testid="value-decimals"
                type="number"
                min={0}
                max={4}
                value={card.valueLabel.decimals}
                onChange={(e) =>
                  updateValueLabel({
                    decimals: Math.max(0, Math.min(4, Number(e.target.value) || 0)),
                  })
                }
              />
            </label>
            <label className="field field--toggle-row field--inline">
              <span className="field__label">Thousands sep.</span>
              <Toggle
                checked={card.valueLabel.thousandsSeparator}
                testId="value-thousands"
                label="Thousands separator"
                onChange={(thousandsSeparator) => updateValueLabel({ thousandsSeparator })}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">Name label</legend>
          <label className="field field--toggle-row">
            <span className="field__label">Show</span>
            <Toggle
              checked={card.nameLabel.show}
              testId="name-label-show"
              label="Show name label"
              onChange={(show) => updateNameLabel({ show })}
            />
          </label>
          <div className="field__row">
            <select
              className="field__input"
              data-testid="name-position"
              aria-label="Name position"
              value={card.nameLabel.position}
              onChange={(e) => updateNameLabel({ position: e.target.value as NameLabelPosition })}
            >
              <option value="inside-end">Inside bar</option>
              <option value="outside">Outside</option>
            </select>
            <label className="field field--inline">
              <span className="field__label">Max width</span>
              <input
                className="field__input"
                data-testid="name-max-width"
                type="number"
                min={40}
                max={600}
                value={card.nameLabel.maxWidth}
                onChange={(e) =>
                  updateNameLabel({ maxWidth: Math.max(40, Number(e.target.value) || 40) })
                }
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">Avatar</legend>
          <label className="field field--toggle-row">
            <span className="field__label">Show</span>
            <Toggle
              checked={card.avatar.show}
              testId="avatar-show"
              label="Show avatar"
              onChange={(show) => updateAvatarTheme({ show })}
            />
          </label>
          <div className="field__row">
            <select
              className="field__input"
              data-testid="avatar-shape"
              aria-label="Avatar shape"
              value={card.avatar.shape}
              onChange={(e) => updateAvatarTheme({ shape: e.target.value as AvatarShape })}
            >
              <option value="circle">Circle</option>
              <option value="rounded">Rounded</option>
              <option value="square">Square</option>
            </select>
            <label className="field field--inline">
              <span className="field__label">Size</span>
              <input
                className="field__input"
                data-testid="avatar-size"
                type="number"
                min={12}
                max={72}
                value={card.avatar.size}
                onChange={(e) =>
                  updateAvatarTheme({
                    size: Math.max(12, Math.min(72, Number(e.target.value) || 12)),
                  })
                }
              />
            </label>
          </div>
          <div className="field__row">
            <label className="field field--inline">
              <span className="field__label">Border</span>
              <input
                className="field__input"
                data-testid="avatar-border-width"
                type="number"
                min={0}
                max={8}
                value={card.avatar.borderWidth}
                onChange={(e) =>
                  updateAvatarTheme({ borderWidth: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </label>
            <label className="color-field">
              <span className="visually-hidden">Avatar border color</span>
              <input
                type="color"
                className="color-field__input"
                data-testid="avatar-border-color"
                value={normalizeHex(card.avatar.borderColor)}
                onChange={(e) => updateAvatarTheme({ borderColor: e.target.value })}
              />
            </label>
          </div>
        </fieldset>

        <label className="field field--toggle-row">
          <span className="field__label">Rank number</span>
          <Toggle
            checked={card.rankShow}
            testId="rank-show"
            label="Show rank"
            onChange={(rankShow) => updateCard({ rankShow })}
          />
        </label>

        <fieldset className="field">
          <legend className="field__label">Typography</legend>
          <select
            className="field__input"
            data-testid="name-font"
            aria-label="Name font"
            value={card.typography.nameFontFamily}
            onChange={(e) => updateCardTypography({ nameFontFamily: e.target.value })}
          >
            {fontOptions(card.typography.nameFontFamily)}
          </select>
          <div className="field__row">
            <select
              className="field__input"
              data-testid="name-weight"
              aria-label="Name weight"
              value={card.typography.nameFontWeight}
              onChange={(e) => updateCardTypography({ nameFontWeight: Number(e.target.value) })}
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
            <input
              className="field__input field__input--narrow"
              data-testid="name-size"
              type="number"
              min={8}
              max={48}
              aria-label="Name size"
              value={card.typography.nameFontSize}
              onChange={(e) =>
                updateCardTypography({
                  nameFontSize: Math.max(8, Math.min(48, Number(e.target.value) || 8)),
                })
              }
            />
          </div>
          <select
            className="field__input"
            data-testid="value-font"
            aria-label="Value font"
            value={card.typography.valueFontFamily}
            onChange={(e) => updateCardTypography({ valueFontFamily: e.target.value })}
          >
            {fontOptions(card.typography.valueFontFamily)}
          </select>
          <div className="field__row">
            <select
              className="field__input"
              data-testid="value-weight"
              aria-label="Value weight"
              value={card.typography.valueFontWeight}
              onChange={(e) => updateCardTypography({ valueFontWeight: Number(e.target.value) })}
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
            <input
              className="field__input field__input--narrow"
              data-testid="value-size"
              type="number"
              min={8}
              max={48}
              aria-label="Value size"
              value={card.typography.valueFontSize}
              onChange={(e) =>
                updateCardTypography({
                  valueFontSize: Math.max(8, Math.min(48, Number(e.target.value) || 8)),
                })
              }
            />
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">Bar fill style</legend>
          <div className="segmented" data-testid="bar-fill-style">
            {(
              [
                { value: 'solid', label: 'Solid' },
                { value: 'horizontal-gradient', label: 'Gradient' },
                { value: 'texture', label: 'Texture' },
              ] as { value: BarFillStyle; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`segmented__btn${card.barFillStyle === opt.value ? ' is-active' : ''}`}
                data-testid={`fill-${opt.value}`}
                aria-pressed={card.barFillStyle === opt.value}
                onClick={() => updateCard({ barFillStyle: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field field--toggle-row">
          <span className="field__label">Bar outline</span>
          <Toggle
            checked={card.barOutline}
            testId="bar-outline"
            label="Bar outline"
            onChange={(barOutline) => updateCard({ barOutline })}
          />
        </label>

        <label className="field">
          <span className="field__label">Shadow</span>
          <select
            className="field__input"
            data-testid="bar-shadow"
            value={card.shadow}
            onChange={(e) => updateCard({ shadow: e.target.value as ShadowStyle })}
          >
            <option value="none">None</option>
            <option value="soft">Soft</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">Entrance animation</span>
          <select
            className="field__input"
            data-testid="entrance-animation"
            value={card.entranceAnimation}
            onChange={(e) => updateCard({ entranceAnimation: e.target.value as EntranceAnimation })}
          >
            <option value="fade">Fade</option>
            <option value="slide-from-edge">Slide from edge</option>
          </select>
        </label>
      </CollapsibleSection>

      <CollapsibleSection
        title={selected ? `Selected card` : 'Selected card'}
        testId="selected-card-section"
        defaultOpen
      >
        <label className="field">
          <span className="field__label">Record</span>
          <select
            className="field__input"
            data-testid="selected-record"
            value={selectedRecordId ?? ''}
            onChange={(e) => setSelectedRecordId(e.target.value || null)}
          >
            {records.length === 0 && <option value="">No records</option>}
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </label>

        {selected && (
          <>
            <div className="field">
              <span className="field__label">Bar color</span>
              <div className="color-field">
                <input
                  type="color"
                  className="color-field__input"
                  data-testid="record-bar-color"
                  value={normalizeHex(selected.color ?? previewColor)}
                  onChange={(e) => setRecordColor(selected.id, e.target.value)}
                />
                <span className="color-field__hex">
                  {normalizeHex(selected.color ?? previewColor).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="field">
              <span className="field__label">Name color</span>
              <div className="color-field">
                <input
                  type="color"
                  className="color-field__input"
                  data-testid="record-name-color"
                  value={normalizeHex(selected.nameColor ?? '#FFFFFF')}
                  onChange={(e) => setRecordNameColor(selected.id, e.target.value)}
                />
                <span className="color-field__hex">
                  {normalizeHex(selected.nameColor ?? '#FFFFFF').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="field">
              <span className="field__label">Avatar image</span>
              <button
                type="button"
                className="upload-zone"
                data-testid="record-avatar-upload"
                onClick={() => avatarInputRef.current?.click()}
              >
                {selected.avatarDataUrl ? 'Replace avatar' : 'Upload avatar'}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                data-testid="record-design-avatar-file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  void resizeImageFileToDataUrl(file).then((url) =>
                    setRecordAvatar(selected.id, url),
                  )
                  e.target.value = ''
                }}
              />
            </div>
          </>
        )}
      </CollapsibleSection>
    </div>
  )
}

function CollapsibleSection({
  title,
  testId,
  defaultOpen = true,
  trailing,
  children,
}: {
  title: string
  testId: string
  defaultOpen?: boolean
  trailing?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="panel-section panel-section--collapsible" data-testid={testId}>
      <div className="panel-section__head">
        <button
          type="button"
          className="panel-section__toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="panel-section__chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
          <h3 className="panel-section__title">{title}</h3>
        </button>
        {trailing}
      </div>
      {open && <div className="panel-section__body">{children}</div>}
    </section>
  )
}

function Toggle({
  checked,
  onChange,
  testId,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  testId: string
  label: string
}) {
  return (
    <button
      type="button"
      className={`toggle${checked ? ' is-on' : ''}`}
      data-testid={testId}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__thumb" />
    </button>
  )
}

function fontOptions(current: string) {
  const list = CURATED_FONTS.includes(current as (typeof CURATED_FONTS)[number])
    ? [...CURATED_FONTS]
    : [current, ...CURATED_FONTS]
  return list.map((f) => (
    <option key={f} value={f}>
      {f}
    </option>
  ))
}

function normalizeHex(color: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(color.trim())
  if (m) return `#${m[1]!.toLowerCase()}`
  return '#000000'
}
