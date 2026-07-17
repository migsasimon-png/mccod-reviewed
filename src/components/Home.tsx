import React from "react";
import { observer } from "mobx-react";
import { useStore } from "../Context";
import { formDefinitions } from "../forms/registry";
import { FormDefinition, FormModule } from "../forms/types";
import "./Home.css";

const Icon = ({ name }: { name: FormDefinition["icon"] }) => {
  switch (name) {
    case "maternal":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M12 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-1.5 7h3a3.5 3.5 0 0 1 3.5 3.5V17h-2v5h-6v-5H7v-4.5A3.5 3.5 0 0 1 10.5 9z" />
        </svg>
      );
    case "perinatal":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M12 2C8 2 5 5 5 9c0 3 2 5 2 7 0 2 2 4 5 4s5-2 5-4c0-2 2-4 2-7 0-4-3-7-7-7zm-2 8a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 10 10zm4 0a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 14 10zm-2 4c1.3 0 2.4.7 3 1.7-.6 1-1.7 1.8-3 1.8s-2.4-.8-3-1.8c.6-1 1.7-1.7 3-1.7z" />
        </svg>
      );
    case "child":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M12 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM8 9h8a2 2 0 0 1 2 2v4h-2v7H8v-7H6v-4a2 2 0 0 1 2-2z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
      );
  }
};

interface TileProps {
  title: string;
  subtitle: string;
  color: string;
  icon: FormDefinition["icon"];
  badge?: string;
  onOpen: () => void;
}

const Tile = ({ title, subtitle, color, icon, badge, onOpen }: TileProps) => (
  <button className="tile" style={{ background: color }} onClick={onOpen}>
    <span className="tile-glow" />
    {badge && <span className="tile-badge">{badge}</span>}
    <span className="tile-icon">
      <Icon name={icon} />
    </span>
    <div className="tile-body">
      <p className="tile-title">{title}</p>
      <p className="tile-subtitle">{subtitle}</p>
    </div>
    <span className="tile-cta">
      Open form <span className="arrow">→</span>
    </span>
  </button>
);

export const Home = observer(() => {
  const store = useStore();
  const open = (m: FormModule) => store.openModule(m);

  return (
    <div className="home-wrap">
      <header className="home-header">
        <span className="home-eyebrow">Ministry of Health · DHIS2</span>
        <h1 className="home-title">Death Review &amp; Certification</h1>
        <p className="home-subtitle">
          Capture maternal, perinatal and child death reviews, then certify the
          cause of death with WHO ICD-11. Every review links to a single ICD-11
          record for the same death.
        </p>
      </header>

      <div className="home-grid">
        <Tile
          title={formDefinitions.mdr.title}
          subtitle={formDefinitions.mdr.subtitle}
          color={formDefinitions.mdr.color}
          icon={formDefinitions.mdr.icon}
          onOpen={() => open("mdr")}
        />
        <Tile
          title={formDefinitions.pdr.title}
          subtitle={formDefinitions.pdr.subtitle}
          color={formDefinitions.pdr.color}
          icon={formDefinitions.pdr.icon}
          onOpen={() => open("pdr")}
        />
        <Tile
          title="ICD-11 Medical Certification"
          subtitle="Medical Certificate of Cause of Death with WHO ICD-11 coding"
          color="linear-gradient(135deg, #1c5fb0 0%, #123f78 100%)"
          icon="mccod"
          onOpen={() => open("mccod")}
        />
        <Tile
          title={formDefinitions.cdr.title}
          subtitle={formDefinitions.cdr.subtitle}
          color={formDefinitions.cdr.color}
          icon={formDefinitions.cdr.icon}
          badge="Beta"
          onOpen={() => open("cdr")}
        />
      </div>

      <footer className="home-footer">
        <button className="home-records-link" onClick={() => open("records")}>
          Browse MCCOD records &amp; analytics →
        </button>
      </footer>
    </div>
  );
});
