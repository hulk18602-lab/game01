import {
  heroSkillDefinitions,
  heroSkillIds,
  type ActiveHeroSkillId,
  type HeroSkillBranch,
  type HeroSkillId,
} from "../content/heroes/heroSkills.js";
import type { CommandDispatcher, HeroSkillsView } from "./contracts.js";
import { button, element } from "./dom.js";

interface SkillCard {
  readonly element: HTMLElement;
  readonly title: HTMLElement;
  readonly level: HTMLElement;
  readonly description: HTMLElement;
  readonly next: HTMLElement;
  readonly upgrade: HTMLButtonElement;
  readonly activate: HTMLButtonElement;
}

/** A fixed set of skill cards; render only updates text and state. */
export class HeroSkillsPanel {
  readonly element = element("aside", "game-ui__hero-skills");
  readonly #points = element("p", "game-ui__skill-points");
  readonly #cards = new Map<HeroSkillId, SkillCard>();
  #signature = "";

  constructor(dispatch: CommandDispatcher) {
    this.element.setAttribute("aria-label", "Hero Skills");
    this.element.append(element("h2", undefined, "Hero Skills"), this.#points);
    const list = element("div", "game-ui__skill-list");
    const branches = new Map<HeroSkillBranch, HTMLElement>();
    for (const branch of ["marksman", "warden", "ranger"] as const) {
      const section = element("section", "game-ui__skill-branch");
      section.dataset.branch = branch;
      section.append(element("h3", undefined, branch.toUpperCase()));
      branches.set(branch, section);
      list.append(section);
    }
    for (const skillId of heroSkillIds) {
      const card = element("article", "game-ui__skill-card");
      const title = element("strong");
      const level = element("span", "game-ui__skill-level");
      const description = element("p");
      const next = element("p", "game-ui__upgrade-preview");
      const upgrade = button("Upgrade", () => {
        dispatch({ type: "upgrade-hero-skill", skillId });
      });
      upgrade.classList.add("game-ui__skill-upgrade");
      const activate = button("Activate", () => {
        dispatch({ type: "activate-hero-ability", skillId: skillId as ActiveHeroSkillId });
      });
      activate.classList.add("game-ui__skill-activate");
      activate.hidden = heroSkillDefinitions[skillId].kind !== "active";
      upgrade.setAttribute("aria-label", `Upgrade ${skillId}`);
      card.append(title, level, description, next, upgrade, activate);
      branches.get(heroSkillDefinitions[skillId].branch)?.append(card);
      this.#cards.set(skillId, { element: card, title, level, description, next, upgrade, activate });
    }
    this.element.append(list);
  }

  render(view: HeroSkillsView | null): void {
    const signature = view
      ? [
        view.skillPoints,
        ...view.skills.flatMap((skill) => [
          skill.id,
          skill.level,
          skill.nextBonus,
          skill.upgradeAvailable,
          skill.blockedReason,
          skill.cooldown,
        ]),
      ].join("|")
      : "none";
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.element.hidden = view === null;
    if (!view) return;
    this.#points.textContent = `Skill points: ${view.skillPoints}`;
    for (const skill of view.skills) {
      const card = this.#cards.get(skill.id);
      if (!card) continue;
      card.title.textContent = skill.name;
      card.level.textContent = `${skill.level}/${skill.maximumLevel}`;
      card.description.textContent = skill.description;
      card.next.textContent = skill.nextBonus;
      card.element.dataset.branch = skill.branch;
      card.element.dataset.kind = skill.kind;
      card.upgrade.disabled = !skill.upgradeAvailable;
      card.upgrade.textContent = skill.level >= skill.maximumLevel ? "Maxed" : "Upgrade";
      card.upgrade.setAttribute("aria-label", `Upgrade ${skill.name}`);
      const tooltip = skill.blockedReason
        ?? `${skill.name}: ${skill.description} Next: ${skill.nextBonus}`;
      card.element.title = tooltip;
      card.upgrade.title = tooltip;
      card.activate.hidden = skill.kind !== "active";
      if (skill.kind === "active") {
        const coolingDown = skill.cooldown > 0;
        card.activate.disabled = skill.level === 0 || coolingDown;
        card.activate.textContent = coolingDown
          ? `${skill.hotkey} · ${skill.cooldown.toFixed(1)}s`
          : `${skill.hotkey} · Activate`;
        card.activate.setAttribute("aria-label", `Activate ${skill.name}`);
        card.activate.title = `Prerequisites: ${skill.prerequisiteText}`;
      }
    }
  }
}

export default HeroSkillsPanel;
