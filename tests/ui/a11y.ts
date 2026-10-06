/**
 * Automated accessibility smoke check: every tappable element on screen must expose a
 * role or a label to screen readers. Catches the most common VoiceOver/TalkBack gap
 * (unlabelled buttons) without a device. It does not replace a real audit.
 */
import type { ReactTestInstance } from "react-test-renderer";

const describeNode = (node: ReactTestInstance): string => {
  const texts: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === "string") texts.push(n);
    else n.children.forEach(walk);
  };
  walk(node);
  return texts.join(" ").slice(0, 60) || String(node.type);
};

export const findUnlabelledPressables = (root: ReactTestInstance): string[] => {
  const problems: string[] = [];
  const hosts = root.findAll(
    (n) => typeof n.type === "string" && typeof n.props.onClick === "function" && n.props.accessible !== false,
  );
  for (const n of hosts) {
    const { accessibilityRole, accessibilityLabel, role, "aria-label": ariaLabel } = n.props;
    if (!accessibilityRole && !role && !accessibilityLabel && !ariaLabel) problems.push(describeNode(n));
  }
  // Guard against a vacuous pass if the renderer's host props ever change shape.
  if (hosts.length === 0) throw new Error("a11y check found no pressable elements — selector is broken");
  return problems;
};
