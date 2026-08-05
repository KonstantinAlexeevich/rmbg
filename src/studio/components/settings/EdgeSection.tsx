import type { EdgeSettings } from '../../../core/types';
import { t } from '../../state/i18n';
import { resetEdgeSettings } from '../../state/orchestrator';
import { Section, Slider } from '../controls';

export function EdgeSection({
  edge,
  highlighted,
  sharedNote,
  onPatch,
}: {
  edge: EdgeSettings;
  highlighted: boolean;
  sharedNote: boolean;
  onPatch: (patch: Partial<EdgeSettings>) => void;
}) {
  return (
    <Section title={t.edgeTitle()} highlighted={highlighted}>
      {sharedNote && (
        <p className="text-xs text-zinc-500">{t.edgeSharedNote()}</p>
      )}
      <Slider
        label={t.edgeThreshold()}
        hint={t.edgeThresholdHint()}
        min={0}
        max={1}
        step={0.05}
        value={edge.threshold}
        onChange={(threshold) => onPatch({ threshold })}
      />
      <Slider
        label={t.edgeContract()}
        hint={t.edgeContractHint()}
        min={0}
        max={5}
        step={1}
        value={edge.erode}
        onChange={(erode) => onPatch({ erode })}
      />
      <Slider
        label={t.edgeFeather()}
        hint={t.edgeFeatherHint()}
        min={0}
        max={10}
        step={1}
        value={edge.feather}
        onChange={(feather) => onPatch({ feather })}
      />
      <button type="button" onClick={resetEdgeSettings} className="btn-secondary self-start text-xs">
        {t.edgeReset()}
      </button>
    </Section>
  );
}
