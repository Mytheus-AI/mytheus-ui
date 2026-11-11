/* A sample org for the People page: two departments (one nested), five teams with what they do,
   a team under No department and two people on no team. Shared by the People skeleton pair and
   the People a11y and screenshot spec. */
import { buildOrgChart, type ApiDepartment, type ApiTeam, type ApiTeamMember, type ChartPerson } from "../../src/lib/org-chart";

const P = (id: string, name: string, isYou = false): ChartPerson => ({
  id,
  name,
  email: `${name.split(" ")[0].toLowerCase()}@example.com`,
  imageUrl: null,
  isYou,
});

export const PEOPLE: ChartPerson[] = [
  P("u-maya", "Maya Chen", true),
  P("u-raj", "Raj Patel"),
  P("u-diego", "Diego Alvarez"),
  P("u-aiko", "Aiko Tanaka"),
  P("u-priya", "Priya Shah"),
  P("u-sarah", "Sarah Kim"),
  P("u-daniel", "Daniel Okafor"),
  P("u-tomas", "Tomas Ferreira"),
  P("u-samar", "Samar Rihan"),
  P("u-yash", "Yash Maurya"),
  P("u-sushan", "Sushan Shetty"),
  P("u-new", "Lena Novak"),
];

export const DEPARTMENTS: ApiDepartment[] = [
  {
    id: "d-eng",
    name: "Engineering",
    parent_id: null,
    description:
      "Builds and runs the product: the web app, the agents and the infrastructure under them. Owns uptime, security reviews and the release calendar.",
  },
  { id: "d-sec", name: "Security", parent_id: "d-eng", description: null },
  {
    id: "d-gtm",
    name: "Go to market",
    parent_id: null,
    description: "Finds, closes and keeps customers. Owns pricing, contracts, renewals and what we promise in a sales call.",
  },
];

export const TEAMS: ApiTeam[] = [
  {
    id: "t-platform",
    name: "Platform",
    department_id: "d-eng",
    description:
      "Owns CI, deploys and the production database, and is on call for incidents. Bring us in before changing infrastructure, data retention or anything that touches uptime. We also run the staging environment and approve new third-party services.",
  },
  { id: "t-product", name: "Product", department_id: "d-eng", description: "Decides what we build next and why. Owns the roadmap and the beta programme." },
  { id: "t-agents", name: "Agents", department_id: "d-eng", description: null },
  { id: "t-sales", name: "Sales", department_id: "d-gtm", description: "Runs demos and closes new contracts. Owns discounts up to 10%." },
  { id: "t-marketing", name: "Marketing", department_id: "d-gtm", description: "Launches, the website and the newsletter." },
  { id: "t-founders", name: "Founders office", department_id: null, description: "Hiring, fundraising and the board." },
];

export const ROSTERS: ApiTeamMember[] = [
  { team_id: "t-platform", user_id: "u-raj", role: "lead" },
  { team_id: "t-platform", user_id: "u-diego", role: "member" },
  { team_id: "t-platform", user_id: "u-aiko", role: "On call" },
  { team_id: "t-product", user_id: "u-priya", role: "lead" },
  { team_id: "t-product", user_id: "u-maya", role: "member" },
  { team_id: "t-sales", user_id: "u-daniel", role: "lead" },
  { team_id: "t-sales", user_id: "u-tomas", role: "member" },
  { team_id: "t-marketing", user_id: "u-yash", role: "lead" },
  { team_id: "t-founders", user_id: "u-sushan", role: "member" },
];

export const CHART = buildOrgChart(DEPARTMENTS, TEAMS, ROSTERS, PEOPLE);
export const PICK_DEPARTMENTS = DEPARTMENTS.map((d) => ({ id: d.id, name: d.name, parentId: d.parent_id })).sort((a, b) => a.name.localeCompare(b.name));
export const MEMBER_OPTIONS = PEOPLE.map((p) => ({ id: p.id, name: p.name, email: p.email, imageUrl: null, isYou: p.isYou }));
export const CONTEXT =
  "3 departments, 6 teams, 9 people on a team. Your agents read this structure, and what each part does, to tune notes to each role and to suggest missing stakeholders.";
