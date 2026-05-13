// Seed top-10 US jurisdictions for the v0.3 MVP.
//
// NEC adoption is governed at the state level and overridden by local AHJs.
// The notes / necEdition fields below are best-effort and should be verified
// against the local AHJ before relying on them — the overlay always tells the
// user to do so.
//
// Sources: NFPA NEC adoption maps (publicly published) circa 2023. Update
// when authoritative current data is imported.

import type { PrismaClient } from "@prisma/client";

type JurisdictionSeed = {
  id: string;
  name: string;
  state: string | null;
  level: "state" | "county" | "municipal";
  parentId?: string;
  necEdition?: string;
  necEditionYear?: number;
  ahjUrl?: string;
  notes?: string;
};

export const JURISDICTION_SEEDS: JurisdictionSeed[] = [
  // States — verify with the local AHJ; this is the published statewide
  // adoption status, not legal advice.
  { id: "seed-jur-ny",  name: "New York State",   state: "NY", level: "state", necEdition: "2020", necEditionYear: 2020, ahjUrl: "https://dos.ny.gov/",                  notes: "NY State 2020 NEC since Jan 2023." },
  { id: "seed-jur-nj",  name: "New Jersey",       state: "NJ", level: "state", necEdition: "2020", necEditionYear: 2020, ahjUrl: "https://www.nj.gov/dca/",              notes: "NJ Uniform Construction Code references 2020 NEC." },
  { id: "seed-jur-ct",  name: "Connecticut",      state: "CT", level: "state", necEdition: "2020", necEditionYear: 2020, ahjUrl: "https://portal.ct.gov/DAS",            notes: "CT Building Code references 2020 NEC." },
  { id: "seed-jur-ca",  name: "California",       state: "CA", level: "state", necEdition: "2023", necEditionYear: 2023, ahjUrl: "https://www.dgs.ca.gov/BSC",            notes: "CA Electrical Code (Title 24, Part 3) tracks 2023 NEC; verify local amendments." },
  { id: "seed-jur-fl",  name: "Florida",          state: "FL", level: "state", necEdition: "2020", necEditionYear: 2020, ahjUrl: "https://www.floridabuilding.org/",     notes: "Florida Building Code references 2020 NEC." },
  { id: "seed-jur-tx",  name: "Texas",            state: "TX", level: "state", necEdition: "2020", necEditionYear: 2020, ahjUrl: "https://www.tdlr.texas.gov/",          notes: "TDLR adopted 2020 NEC; local AHJs vary." },
  { id: "seed-jur-il",  name: "Illinois",         state: "IL", level: "state", necEdition: "2020", necEditionYear: 2020, ahjUrl: "https://idfpr.illinois.gov/",          notes: "Illinois adopts NEC by local AHJ; Chicago has its own Electrical Code." },
  { id: "seed-jur-ma",  name: "Massachusetts",    state: "MA", level: "state", necEdition: "2020", necEditionYear: 2020, ahjUrl: "https://www.mass.gov/orgs/board-of-state-examiners-of-electricians", notes: "527 CMR 12.00 references 2020 NEC with state amendments." },
  { id: "seed-jur-pa",  name: "Pennsylvania",     state: "PA", level: "state", necEdition: "2020", necEditionYear: 2020, ahjUrl: "https://www.dli.pa.gov/",              notes: "Uniform Construction Code references 2020 NEC; local AHJs may amend." },

  // Major municipal AHJ with its own electrical code — explicit override of NY.
  { id: "seed-jur-nyc", name: "City of New York", state: "NY", level: "municipal", parentId: "seed-jur-ny", necEdition: "2020", necEditionYear: 2020, ahjUrl: "https://www.nyc.gov/site/buildings/index.page", notes: "NYC Electrical Code references 2020 NEC with NYC amendments." },
];

export async function seedJurisdictions(prisma: PrismaClient) {
  for (const j of JURISDICTION_SEEDS) {
    await prisma.jurisdiction.upsert({
      where: { id: j.id },
      update: {
        name: j.name,
        state: j.state,
        level: j.level,
        parentId: j.parentId,
        necEdition: j.necEdition,
        necEditionYear: j.necEditionYear,
        ahjUrl: j.ahjUrl,
        notes: j.notes,
      },
      create: {
        id: j.id,
        name: j.name,
        state: j.state,
        level: j.level,
        parentId: j.parentId,
        necEdition: j.necEdition,
        necEditionYear: j.necEditionYear,
        ahjUrl: j.ahjUrl,
        notes: j.notes,
      },
    });
  }
}
