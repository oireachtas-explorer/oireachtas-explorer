import type { Chamber } from '../types';

export interface HouseInfo {
  houseNo: number;
  ordinal: string;
  year: number;
}

// Back-compat alias; prefer HouseInfo.
export type DailInfo = HouseInfo;

const ORDINAL_SUFFIX: Record<number, string> = {
  1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st', 32: 'nd', 33: 'rd',
};

function ordinal(n: number): string {
  return `${n}${ORDINAL_SUFFIX[n] ?? 'th'}`;
}

export const DAIL_YEARS: Record<number, number> = {
  1: 1919, 2: 1921, 3: 1922, 4: 1923, 5: 1927, 6: 1927,
  7: 1932, 8: 1933, 9: 1937, 10: 1938, 11: 1943, 12: 1944,
  13: 1948, 14: 1951, 15: 1954, 16: 1957, 17: 1961, 18: 1965,
  19: 1969, 20: 1973, 21: 1977, 22: 1981, 23: 1982, 24: 1982,
  25: 1987, 26: 1989, 27: 1992, 28: 1997, 29: 2002, 30: 2007,
  31: 2011, 32: 2016, 33: 2020, 34: 2024,
};

export const LATEST_DAIL = 34;

// Seanad N sits alongside Dáil (N + SEANAD_DAIL_OFFSET). The 27th Seanad
// followed the 34th Dáil election, so the offset is 7.
const SEANAD_DAIL_OFFSET = 7;
export const LATEST_SEANAD = LATEST_DAIL - SEANAD_DAIL_OFFSET;

// Seanad year = year of the Dáil election that triggered the Seanad election.
// Close enough for date-range filtering; Seanad elections trail by weeks.
export const SEANAD_YEARS: Record<number, number> = Object.fromEntries(
  Object.entries(DAIL_YEARS)
    .map(([d, year]) => [Number(d) - SEANAD_DAIL_OFFSET, year] as const)
    .filter(([s]) => s >= 1)
);

function yearsFor(chamber: Chamber): Record<number, number> {
  return chamber === 'seanad' ? SEANAD_YEARS : DAIL_YEARS;
}

function latestFor(chamber: Chamber): number {
  return chamber === 'seanad' ? LATEST_SEANAD : LATEST_DAIL;
}

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function dayBefore(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return isoDate(date);
}

export function getHouseDateRange(chamber: Chamber, houseNo: number): { start: string; end: string } {
  const years = yearsFor(chamber);
  const latest = latestFor(chamber);
  const start = years[houseNo] ?? 1919;
  if (houseNo >= latest) {
    return { start: `${start}-01-01`, end: isoDate(new Date()) };
  }

  const nextStartYear = years[houseNo + 1] ?? start + 1;
  return { start: `${start}-01-01`, end: dayBefore(`${nextStartYear}-01-01`) };
}

export function getHousePresetYearRange(chamber: Chamber, houseNo: number): { start: string; end: string } {
  const today = isoDate(new Date());
  const range = getHouseDateRange(chamber, houseNo);
  const currentYearStart = `${today.slice(0, 4)}-01-01`;

  if (currentYearStart <= range.end) {
    return {
      start: currentYearStart >= range.start ? currentYearStart : range.start,
      end: today <= range.end ? today : range.end,
    };
  }

  const latestYear = range.end.slice(0, 4);
  return {
    start: `${latestYear}-01-01` >= range.start ? `${latestYear}-01-01` : range.start,
    end: range.end,
  };
}

// Back-compat: assumes Dáil.
export function getDailDateRange(houseNo: number): { start: string; end: string } {
  return getHouseDateRange('dail', houseNo);
}

function buildList(chamber: Chamber): HouseInfo[] {
  const years = yearsFor(chamber);
  const latest = latestFor(chamber);
  return Array.from({ length: latest }, (_, i) => {
    const n = latest - i;
    return { houseNo: n, ordinal: ordinal(n), year: years[n] ?? 0 };
  });
}

export const DAIL_LIST: HouseInfo[] = buildList('dail');
export const SEANAD_LIST: HouseInfo[] = buildList('seanad');

export function houseList(chamber: Chamber): HouseInfo[] {
  return chamber === 'seanad' ? SEANAD_LIST : DAIL_LIST;
}

export function chamberName(chamber: Chamber): string {
  return chamber === 'seanad' ? 'Seanad' : 'Dáil';
}

export function memberNoun(chamber: Chamber, plural = false): string {
  if (chamber === 'seanad') return plural ? 'Senators' : 'Senator';
  return plural ? 'TDs' : 'TD';
}

export function houseLabel(chamber: Chamber, houseNo: number): string {
  return `${ordinal(houseNo)} ${chamberName(chamber)}`;
}

export function houseLabelFull(chamber: Chamber, houseNo: number): string {
  const year = yearsFor(chamber)[houseNo];
  return year ? `${houseLabel(chamber, houseNo)} (${year})` : houseLabel(chamber, houseNo);
}

// Back-compat shims — assume Dáil.
export function dailLabel(houseNo: number): string {
  return houseLabel('dail', houseNo);
}
export function dailLabelFull(houseNo: number): string {
  return houseLabelFull('dail', houseNo);
}
