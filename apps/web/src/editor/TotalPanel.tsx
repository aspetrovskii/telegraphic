import {
  projectDateBounds,
  SCREEN_SIZE_PRESETS,
  type ScreenSizePreset,
  type SpeedMode,
} from '@telegraphic/shared'
import { useEditorStore } from './useEditorStore'

const PRESET_OPTIONS: { value: ScreenSizePreset; label: string }[] = [
  { value: '1920x1080', label: '1920×1080' },
  { value: '1080x1920', label: '1080×1920' },
  { value: '1080x1080', label: '1080×1080' },
  { value: 'custom', label: 'Custom' },
]

/**
 * Total panel — global rating settings live-bound to Zustand → engine.
 */
export function TotalPanel() {
  const settings = useEditorStore((s) => s.project.settings)
  const project = useEditorStore((s) => s.project)
  const updateSettings = useEditorStore((s) => s.updateSettings)
  const setScreenSizePreset = useEditorStore((s) => s.setScreenSizePreset)
  const setCustomScreenSize = useEditorStore((s) => s.setCustomScreenSize)
  const dateBounds = projectDateBounds(project)

  const speedLabel = settings.speedMode === 'totalLength' ? 'Total length (s)' : 'Days per second'
  const resolvedStart = settings.datesInterval.start ?? dateBounds.start ?? ''
  const resolvedEnd = settings.datesInterval.end ?? dateBounds.end ?? ''
  const showCustomSize =
    settings.screenSize.preset === 'custom' ||
    !(settings.screenSize.preset in SCREEN_SIZE_PRESETS)

  return (
    <div className="total-panel" data-testid="total-panel">
      <section className="panel-section">
        <h3 className="panel-section__title">Basic</h3>

        <label className="field">
          <span className="field__label">Top N</span>
          <div className="field__row">
            <button
              type="button"
              className="stepper-btn"
              data-testid="topn-dec"
              aria-label="Decrease Top N"
              onClick={() => updateSettings({ topN: Math.max(1, settings.topN - 1) })}
            >
              −
            </button>
            <input
              className="field__input field__input--narrow"
              data-testid="topn-input"
              type="number"
              min={1}
              max={100}
              value={settings.topN}
              onChange={(e) =>
                updateSettings({ topN: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })
              }
            />
            <button
              type="button"
              className="stepper-btn"
              data-testid="topn-inc"
              aria-label="Increase Top N"
              onClick={() => updateSettings({ topN: Math.min(100, settings.topN + 1) })}
            >
              +
            </button>
          </div>
        </label>

        <fieldset className="field">
          <legend className="field__label">Dates interval</legend>
          <div className="field__row field__row--dates">
            <input
              className="field__input"
              data-testid="dates-start"
              type="date"
              aria-label="Dates interval start"
              min={dateBounds.start ?? undefined}
              max={resolvedEnd || dateBounds.end || undefined}
              value={resolvedStart}
              onChange={(e) =>
                updateSettings({
                  datesInterval: {
                    start: e.target.value || null,
                    end: settings.datesInterval.end,
                  },
                })
              }
            />
            <span className="field__sep" aria-hidden>
              –
            </span>
            <input
              className="field__input"
              data-testid="dates-end"
              type="date"
              aria-label="Dates interval end"
              min={resolvedStart || dateBounds.start || undefined}
              max={dateBounds.end ?? undefined}
              value={resolvedEnd}
              onChange={(e) =>
                updateSettings({
                  datesInterval: {
                    start: settings.datesInterval.start,
                    end: e.target.value || null,
                  },
                })
              }
            />
          </div>
        </fieldset>
      </section>

      <section className="panel-section">
        <h3 className="panel-section__title">Visuals</h3>

        <label className="field">
          <span className="field__label">
            Scale <span className="field__value">{settings.scale}%</span>
          </span>
          <input
            className="field__range"
            data-testid="scale-slider"
            type="range"
            min={0}
            max={500}
            step={1}
            value={settings.scale}
            onChange={(e) => updateSettings({ scale: Number(e.target.value) })}
          />
        </label>

        <label className="field">
          <span className="field__label">Screen size</span>
          <select
            className="field__input"
            data-testid="screen-size-preset"
            value={settings.screenSize.preset}
            onChange={(e) => setScreenSizePreset(e.target.value as ScreenSizePreset)}
          >
            {PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {showCustomSize && (
          <div className="field__row" data-testid="screen-size-custom">
            <label className="field field--inline">
              <span className="field__label">W</span>
              <input
                className="field__input"
                data-testid="screen-width"
                type="number"
                min={1}
                value={settings.screenSize.width}
                onChange={(e) =>
                  setCustomScreenSize(Number(e.target.value) || 1, settings.screenSize.height)
                }
              />
            </label>
            <span className="field__sep" aria-hidden>
              ×
            </span>
            <label className="field field--inline">
              <span className="field__label">H</span>
              <input
                className="field__input"
                data-testid="screen-height"
                type="number"
                min={1}
                value={settings.screenSize.height}
                onChange={(e) =>
                  setCustomScreenSize(settings.screenSize.width, Number(e.target.value) || 1)
                }
              />
            </label>
          </div>
        )}
      </section>

      <section className="panel-section">
        <h3 className="panel-section__title">Timing</h3>

        <fieldset className="field">
          <legend className="field__label">Speed mode</legend>
          <div className="segmented" data-testid="speed-mode">
            <button
              type="button"
              className={`segmented__btn${settings.speedMode === 'totalLength' ? ' is-active' : ''}`}
              data-testid="speed-mode-totalLength"
              onClick={() => updateSettings({ speedMode: 'totalLength' as SpeedMode })}
            >
              Total length
            </button>
            <button
              type="button"
              className={`segmented__btn${
                settings.speedMode === 'daysPerSecond' ? ' is-active' : ''
              }`}
              data-testid="speed-mode-daysPerSecond"
              onClick={() => updateSettings({ speedMode: 'daysPerSecond' as SpeedMode })}
            >
              Days per second
            </button>
          </div>
        </fieldset>

        <label className="field">
          <span className="field__label">{speedLabel}</span>
          <input
            className="field__input"
            data-testid="speed-value"
            type="number"
            min={0}
            step={settings.speedMode === 'totalLength' ? 1 : 0.1}
            value={settings.speedValue}
            onChange={(e) =>
              updateSettings({ speedValue: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </label>

        <fieldset className="field">
          <legend className="field__label">Start/finish delay</legend>
          <div className="field__row">
            <label className="field field--inline">
              <span className="field__label">Start (s)</span>
              <input
                className="field__input"
                data-testid="start-delay"
                type="number"
                min={0}
                step={0.1}
                value={settings.startDelay}
                onChange={(e) =>
                  updateSettings({ startDelay: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </label>
            <label className="field field--inline">
              <span className="field__label">Finish (s)</span>
              <input
                className="field__input"
                data-testid="finish-delay"
                type="number"
                min={0}
                step={0.1}
                value={settings.finishDelay}
                onChange={(e) =>
                  updateSettings({ finishDelay: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </label>
          </div>
        </fieldset>

        <label className="field">
          <span className="field__label">Smoothing interval</span>
          <input
            className="field__input"
            data-testid="smoothing-interval"
            type="number"
            min={1}
            step={1}
            value={settings.smoothingInterval}
            onChange={(e) =>
              updateSettings({
                smoothingInterval: Math.max(1, Math.floor(Number(e.target.value) || 1)),
              })
            }
          />
        </label>
      </section>
    </div>
  )
}
