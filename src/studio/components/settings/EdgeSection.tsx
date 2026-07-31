import type { EdgeSettings } from '../../../core/types';
import { t } from '../../state/i18n';
import { resetEdgeSettings } from '../../state/orchestrator';
import { Section, Slider } from '../controls';

export function EdgeSection({
  edge,
  highlighted,
  onPatch,
}: {
  edge: EdgeSettings;
  highlighted: boolean;
  onPatch: (patch: Partial<EdgeSettings>) => void;
}) {
  return (
    <Section title={t('settingsEdge')} highlighted={highlighted}>
      <Slider
        label={t('settingsEdgeThreshold')}
        min={0}
        max={1}
        step={0.05}
        value={edge.threshold}
        onChange={(threshold) => onPatch({ threshold })}
      />
      <Slider
        label={t('settingsEdgeErode')}
        min={0}
        max={5}
        step={1}
        value={edge.erode}
        onChange={(erode) => onPatch({ erode })}
      />
      <Slider
        label={t('settingsEdgeFeather')}
        min={0}
        max={10}
        step={1}
        value={edge.feather}
        onChange={(feather) => onPatch({ feather })}
      />
      <button
        type="button"
        onClick={resetEdgeSettings}
        className="self-start text-xs text-blue-600 hover:underline"
      >
        {t('settingsEdgeReset')}
      </button>
    </Section>
  );
}
