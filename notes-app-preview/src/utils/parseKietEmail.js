/**
 * Parse a KIET institutional email into structured student metadata.
 * Format: firstname.YYendYYbranch<roll>@kiet.edu
 * e.g.  akshay.2428cs995@kiet.edu
 * Returns null if the email doesn't match the expected pattern.
 */
export function parseKietEmail(email) {
  if (!email) return null;
  const lower = email.toLowerCase().trim();
  if (!lower.endsWith("@kiet.edu")) return null;
  const local = lower.split("@")[0];
  const dotIdx = local.indexOf(".");
  if (dotIdx < 1) return null;
  const firstName = local.slice(0, dotIdx);
  const rest = local.slice(dotIdx + 1);
  const match = rest.match(/^(\d{2})(\d{2})([a-z]{2,3})(\d+)$/);
  if (!match) return null;
  const [, startYY, endYY, branch, roll] = match;
  return {
    firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
    email: lower,
    startYear: "20" + startYY,
    endYear: "20" + endYY,
    branch: branch.toUpperCase(),
    branchFull: branch.toUpperCase() + " Engineering",
    roll,
    batch: `${startYY}-${endYY}`,
  };
}
