import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import type {
  RentalIQData,
  RIQMilestone,
  RIQActivity,
  RIQMilestoneCompletion,
  RIQRisk,
  RIQDevTask,
  RIQMarketAnalytics,
  RIQPlatformInsight,
  RIQAffordabilityRating,
  AwardBookData,
  ABMilestone,
  ABActivity,
  ABMilestoneCompletion,
  ABRaid,
  ABDecision,
  ABOwner,
  ABDevTask,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExcelPath(): string {
  // Check for environment override first (useful for Vercel / custom paths)
  if (process.env.EXCEL_PATH) {
    return process.env.EXCEL_PATH;
  }
  // Default: data/ folder in project root
  return path.join(process.cwd(), 'data', 'RIQ & AB_InputFile.xlsx');
}

function readWorkbook(): XLSX.WorkBook {
  const filePath = getExcelPath();
  const buffer = fs.readFileSync(filePath);
  return XLSX.read(buffer, { type: 'buffer', cellDates: true });
}

function cellVal(sheet: XLSX.WorkSheet, ref: string): string {
  const cell = sheet[ref];
  if (!cell) return '';
  if (cell.t === 'd' && cell.v instanceof Date) {
    return cell.v.toISOString().split('T')[0];
  }
  return String(cell.v ?? '');
}

function cellNum(sheet: XLSX.WorkSheet, ref: string): number {
  const cell = sheet[ref];
  if (!cell) return 0;
  const n = Number(cell.v);
  return isNaN(n) ? 0 : n;
}

function colLetter(idx: number): string {
  let s = '';
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function formatDate(sheet: XLSX.WorkSheet, ref: string): string {
  const cell = sheet[ref];
  if (!cell) return '';
  if (cell.t === 'd' && cell.v instanceof Date) {
    return cell.v.toISOString().split('T')[0];
  }
  // Try parsing string dates
  const val = String(cell.v ?? '');
  if (!val) return '';
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return val;
}

// ---------------------------------------------------------------------------
// Rental IQ Parser
// ---------------------------------------------------------------------------

function parseRentalIQMilestones(ws: XLSX.WorkSheet): RIQMilestone[] {
  const milestones: RIQMilestone[] = [];
  // Table 1 starts at row 2 (header), data rows 3-12
  for (let r = 3; r <= 12; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break;
    milestones.push({
      activityId: id,
      activityName: cellVal(ws, `B${r}`),
      startDate: formatDate(ws, `C${r}`),
      endDate: formatDate(ws, `D${r}`),
      overallStatus: cellVal(ws, `E${r}`),
      percentComplete: cellNum(ws, `F${r}`),
    });
  }
  return milestones;
}

function parseRentalIQActivities(ws: XLSX.WorkSheet): RIQActivity[] {
  const activities: RIQActivity[] = [];
  // Table 2 starts at row 15 (header), data rows 16-34
  for (let r = 16; r <= 34; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break;
    activities.push({
      subTaskId: id,
      parentId: cellNum(ws, `B${r}`),
      activityName: cellVal(ws, `C${r}`),
      subTaskName: cellVal(ws, `D${r}`),
      status: cellVal(ws, `E${r}`),
      owner: cellVal(ws, `F${r}`),
      subEndDate: formatDate(ws, `G${r}`),
      priority: cellVal(ws, `H${r}`),
      currentDate: formatDate(ws, `I${r}`),
      comments: cellVal(ws, `J${r}`),
    });
  }
  return activities;
}

function parseRentalIQMilestoneCompletion(ws: XLSX.WorkSheet): RIQMilestoneCompletion[] {
  const completions: RIQMilestoneCompletion[] = [];
  // Table 3 starts at row 37 (header), data rows 38-47
  for (let r = 38; r <= 47; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id && r > 38) break;
    if (!id) continue;
    completions.push({
      activityId: id,
      activityName: cellVal(ws, `B${r}`),
      taskCompletionPct: cellNum(ws, `C${r}`),
      milestoneWeight: cellNum(ws, `D${r}`),
      completionPct: cellNum(ws, `E${r}`),
      status: cellVal(ws, `F${r}`),
      cumulativeCompletionPct: cellNum(ws, `G${r}`),
      owner: cellVal(ws, `H${r}`),
    });
  }
  return completions;
}

function parseRentalIQRisks(ws: XLSX.WorkSheet): RIQRisk[] {
  const risks: RIQRisk[] = [];
  // Table 4 on "Rental IQ 2" sheet, row 3 header, data rows 4-8
  for (let r = 4; r <= 8; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break;
    risks.push({
      srNo: id,
      risk: cellVal(ws, `B${r}`),
      probability: cellVal(ws, `C${r}`),
      impact: cellVal(ws, `D${r}`),
      status: cellVal(ws, `E${r}`),
      riskOwner: cellVal(ws, `F${r}`),
      mitigationPlan: cellVal(ws, `G${r}`),
      mitigationStatus: cellVal(ws, `H${r}`),
      comments: cellVal(ws, `I${r}`),
    });
  }
  return risks;
}

function parseRentalIQDevTasks(ws: XLSX.WorkSheet): RIQDevTask[] {
  const tasks: RIQDevTask[] = [];
  // Table 5 on "Rental IQ 2" sheet, row 12 header, data rows 13-17+
  for (let r = 13; r <= 50; r++) {
    const dateVal = formatDate(ws, `A${r}`);
    if (!dateVal) break;
    tasks.push({
      date: dateVal,
      open: cellNum(ws, `B${r}`),
      completed: cellNum(ws, `C${r}`),
    });
  }
  return tasks;
}

function parseRIQMarketAnalytics(ws: XLSX.WorkSheet): RIQMarketAnalytics[] {
  const items: RIQMarketAnalytics[] = [];
  // "RI Insights" sheet, row 3 header, data rows 4-13
  for (let r = 4; r <= 13; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break;
    items.push({
      srNo: id,
      agencyName: cellVal(ws, `B${r}`),
      state: cellVal(ws, `C${r}`),
      estimatedRentalPortfolio: cellNum(ws, `D${r}`),
      estimatedTenantApps: cellNum(ws, `E${r}`),
      priorityTier: cellVal(ws, `F${r}`),
      focusAreas: cellVal(ws, `G${r}`),
      onboardingStatus: cellVal(ws, `H${r}`),
    });
  }
  return items;
}

function parseRIQPlatformInsights(ws: XLSX.WorkSheet): RIQPlatformInsight[] {
  const items: RIQPlatformInsight[] = [];
  // Row 24 header, data rows 25-34
  for (let r = 25; r <= 34; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break;
    items.push({
      srNo: id,
      metric: cellVal(ws, `B${r}`),
      value: cellNum(ws, `C${r}`),
    });
  }
  return items;
}

function parseRIQAffordabilityRating(ws: XLSX.WorkSheet): RIQAffordabilityRating[] {
  const items: RIQAffordabilityRating[] = [];
  // Row 37 header, data rows 38-40
  for (let r = 38; r <= 40; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break;
    items.push({
      srNo: id,
      rating: cellVal(ws, `B${r}`),
      numberOfUsers: cellNum(ws, `C${r}`),
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// AwardBook Parser
// ---------------------------------------------------------------------------

function parseABMilestones(ws: XLSX.WorkSheet): ABMilestone[] {
  const milestones: ABMilestone[] = [];
  // Table 6, row 2 header, data rows 3-10
  for (let r = 3; r <= 10; r++) {
    const id = cellVal(ws, `A${r}`);
    if (!id) break;
    milestones.push({
      milestoneId: id,
      milestoneName: cellVal(ws, `B${r}`),
      phase: cellVal(ws, `C${r}`),
      startDate: formatDate(ws, `D${r}`),
      endDate: formatDate(ws, `E${r}`),
      status: cellVal(ws, `F${r}`),
      percentComplete: cellNum(ws, `G${r}`),
      rag: cellVal(ws, `H${r}`),
      owner: cellVal(ws, `I${r}`),
    });
  }
  return milestones;
}

function parseABActivities(ws: XLSX.WorkSheet): ABActivity[] {
  const activities: ABActivity[] = [];
  // Table 7, row 14 header, data rows 15-21
  for (let r = 15; r <= 21; r++) {
    const id = cellVal(ws, `A${r}`);
    if (!id) break;
    activities.push({
      taskId: id,
      taskName: cellVal(ws, `B${r}`),
      milestoneId: cellVal(ws, `C${r}`),
      workstream: cellVal(ws, `D${r}`),
      owner: cellVal(ws, `E${r}`),
      dueDate: formatDate(ws, `F${r}`),
      status: cellVal(ws, `G${r}`),
      rag: cellVal(ws, `H${r}`),
      comments: cellVal(ws, `I${r}`),
    });
  }
  return activities;
}

function parseABMilestoneCompletion(ws: XLSX.WorkSheet): ABMilestoneCompletion[] {
  const completions: ABMilestoneCompletion[] = [];
  // Table 12, row 25 header, data rows 26-33
  for (let r = 26; r <= 33; r++) {
    const id = cellVal(ws, `A${r}`);
    if (!id) break;
    completions.push({
      milestoneId: id,
      milestoneName: cellVal(ws, `B${r}`),
      completionPct: cellNum(ws, `C${r}`),
      milestoneWeight: cellNum(ws, `D${r}`),
      weightedCompletionPct: cellNum(ws, `E${r}`),
      status: cellVal(ws, `F${r}`),
      cumulativeCompletionPct: cellNum(ws, `G${r}`),
      owner: cellVal(ws, `H${r}`),
    });
  }
  return completions;
}

function parseABRaid(ws: XLSX.WorkSheet): ABRaid[] {
  const items: ABRaid[] = [];
  // Table 8, row 2 header, data rows 3-7
  for (let r = 3; r <= 7; r++) {
    const id = cellVal(ws, `A${r}`);
    if (!id) break;
    items.push({
      raidId: id,
      raidType: cellVal(ws, `B${r}`),
      description: cellVal(ws, `C${r}`),
      impact: cellNum(ws, `D${r}`),
      likelihood: cellNum(ws, `E${r}`),
      rag: cellVal(ws, `F${r}`),
      owner: cellVal(ws, `G${r}`),
      mitigation: cellVal(ws, `H${r}`),
      targetDate: formatDate(ws, `I${r}`),
      status: cellVal(ws, `J${r}`),
      comments: cellVal(ws, `K${r}`),
    });
  }
  return items;
}

function parseABDecisions(ws: XLSX.WorkSheet): ABDecision[] {
  const items: ABDecision[] = [];
  // Table 9, row 11 header, data rows 12-14
  for (let r = 12; r <= 14; r++) {
    const id = cellVal(ws, `A${r}`);
    if (!id) break;
    items.push({
      decisionId: id,
      decisionRequired: cellVal(ws, `B${r}`),
      impactIfDelayed: cellVal(ws, `C${r}`),
      requiredBy: formatDate(ws, `D${r}`),
      owner: cellVal(ws, `E${r}`),
      status: cellVal(ws, `F${r}`),
      comments: cellVal(ws, `G${r}`),
    });
  }
  return items;
}

function parseABOwners(ws: XLSX.WorkSheet): ABOwner[] {
  const items: ABOwner[] = [];
  // Table 10, row 18 header, data rows 19-24
  for (let r = 19; r <= 24; r++) {
    const name = cellVal(ws, `A${r}`);
    if (!name) break;
    items.push({
      name,
      role: cellVal(ws, `B${r}`),
    });
  }
  return items;
}

function parseABDevTasks(ws: XLSX.WorkSheet): ABDevTask[] {
  const items: ABDevTask[] = [];
  // Table 11, row 27 header, data rows 28-38+
  for (let r = 28; r <= 50; r++) {
    const dateVal = formatDate(ws, `A${r}`);
    if (!dateVal) break;
    items.push({
      date: dateVal,
      open: cellNum(ws, `B${r}`),
      completed: cellNum(ws, `C${r}`),
      closedPullRequests: cellNum(ws, `D${r}`),
      notPlanned: cellNum(ws, `E${r}`),
      duplicate: cellNum(ws, `F${r}`),
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function loadRentalIQData(): RentalIQData {
  const wb = readWorkbook();

  const wsMain = wb.Sheets['Rental IQ'];
  const wsSecond = wb.Sheets['Rental IQ 2'];
  const wsInsights = wb.Sheets['RI Insights'];

  const milestoneCompletion = parseRentalIQMilestoneCompletion(wsMain);
  const lastCompletion = milestoneCompletion[milestoneCompletion.length - 1];
  const cumulativeCompletion = lastCompletion ? lastCompletion.cumulativeCompletionPct : 0;

  return {
    milestones: parseRentalIQMilestones(wsMain),
    activities: parseRentalIQActivities(wsMain),
    milestoneCompletion,
    cumulativeCompletion,
    risks: parseRentalIQRisks(wsSecond),
    devTasks: parseRentalIQDevTasks(wsSecond),
    insights: {
      marketAnalytics: parseRIQMarketAnalytics(wsInsights),
      platformInsights: parseRIQPlatformInsights(wsInsights),
      affordabilityRating: parseRIQAffordabilityRating(wsInsights),
    },
  };
}

export function loadAwardBookData(): AwardBookData {
  const wb = readWorkbook();

  const wsMain = wb.Sheets['AwardBook'];
  const wsSecond = wb.Sheets['AwardBook 2'];

  const milestoneCompletion = parseABMilestoneCompletion(wsMain);
  const lastCompletion = milestoneCompletion[milestoneCompletion.length - 1];
  const cumulativeCompletion = lastCompletion ? lastCompletion.cumulativeCompletionPct : 0;

  return {
    milestones: parseABMilestones(wsMain),
    activities: parseABActivities(wsMain),
    milestoneCompletion,
    cumulativeCompletion,
    raid: parseABRaid(wsSecond),
    decisions: parseABDecisions(wsSecond),
    owners: parseABOwners(wsSecond),
    devTasks: parseABDevTasks(wsSecond),
  };
}
