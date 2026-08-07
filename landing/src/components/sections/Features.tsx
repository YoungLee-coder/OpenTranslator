import {
  ArrowsLeftRightIcon,
  CloudIcon,
  LockKeyIcon,
  PuzzlePieceIcon,
  WaveSineIcon,
} from "@phosphor-icons/react";
import { useContent } from "@/lib/i18n";

const FEATURE_ICONS = [
  ArrowsLeftRightIcon,
  WaveSineIcon,
  PuzzlePieceIcon,
  CloudIcon,
  LockKeyIcon,
] as const;

export function Features() {
  const { featuresSection, features } = useContent();

  return (
    <section id="features">
      <div className="section-head">
        <h2 className="section-title">{featuresSection.sectionTitle}</h2>
      </div>
      <ul className="features">
        {features.map((f, i) => {
          const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length]!;
          return (
            <li key={f.name}>
              <span className="feature-icon" aria-hidden>
                <Icon size={18} weight="regular" />
              </span>
              <p className="feature-body">
                <strong className="name">{f.name}</strong>
                <span className="what">{f.description}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
