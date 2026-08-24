export type ProjectNetworkItem = {
  name: string;
  domain: string;
  href: string;
  category: string;
  description: string;
  current?: boolean;
};

export const projectNetwork: ProjectNetworkItem[] = [
  {
    name: "OHM7",
    domain: "ohm7.com",
    href: "/",
    category: "Electrical records",
    description:
      "Property-bound electrical panel directories, access approvals, service history, and asset records.",
    current: true,
  },
  {
    name: "Electrical Nassau",
    domain: "electricalnassau.com",
    href: "https://electricalnassau.com",
    category: "Electrical services",
    description:
      "Electrical upgrades, troubleshooting, EV charging, backup power, lighting, and connected-property infrastructure in Nassau County.",
  },
  {
    name: "ServiceFixes",
    domain: "servicefixes.com",
    href: "https://servicefixes.com",
    category: "Repair operations",
    description:
      "Structured repair intake, evidence capture, technician routing, approvals, and permanent property service records.",
  },
  {
    name: "SKUFind",
    domain: "skufind.com",
    href: "https://skufind.com",
    category: "Parts intelligence",
    description:
      "Field identification for breakers, fuses, and industrial parts using labels, part numbers, images, and asset context.",
  },
  {
    name: "PartWall",
    domain: "partwall.com",
    href: "https://partwall.com",
    category: "Built environments",
    description:
      "Made-to-order apartment walls, media walls, trade-show displays, and coordinated installation services.",
  },
  {
    name: "Secure4K",
    domain: "secure4k.com",
    href: "https://secure4k.com",
    category: "Video operations",
    description:
      "Edge-first video surveillance, visual monitoring, asset workflows, recording, and off-site backup operations.",
  },
  {
    name: "DeployLocal",
    domain: "deploylocal.com",
    href: "https://deploylocal.com",
    category: "Private AI",
    description:
      "Private AI appliances configured, installed, secured, and supported on customer-controlled hardware.",
  },
  {
    name: "Backup My System",
    domain: "backupmysystem.com",
    href: "https://backupmysystem.com",
    category: "Data resilience",
    description:
      "Managed backup, recovery verification, encrypted retention, and ransomware-resilience services.",
  },
  {
    name: "516 Labs",
    domain: "516labs.com",
    href: "https://516labs.com",
    category: "Laboratory testing",
    description:
      "Managed environmental, property, industrial, and petroleum testing routed through qualified partner laboratories.",
  },
  {
    name: "CarDrNow",
    domain: "cardrnow.com",
    href: "https://cardrnow.com",
    category: "Mobile auto service",
    description:
      "Mobile automotive diagnosis, repair intake, quoting, dispatch, payments, and service tracking.",
  },
  {
    name: "HelpEpic",
    domain: "helpepic.com",
    href: "https://helpepic.com",
    category: "Healthcare workflows",
    description:
      "Independent Epic workflow and operational help for medical offices; not affiliated with Epic Systems.",
  },
  {
    name: "Project American",
    domain: "projectamerican.com",
    href: "https://projectamerican.com",
    category: "Commerce and editorial",
    description:
      "Independent commerce and editorial coverage focused on American products, companies, workers, and projects.",
  },
  {
    name: "DataNews",
    domain: "datanews.us",
    href: "https://datanews.us",
    category: "Technology intelligence",
    description:
      "Technology news, markets, security, research, product, and company intelligence built for discovery and citation.",
  },
  {
    name: "LumensData",
    domain: "lumensdata.com",
    href: "https://lumensdata.com",
    category: "Data and AI intelligence",
    description:
      "Data, AI, and technology intelligence, tools, publishing infrastructure, and applied business research.",
  },
];
