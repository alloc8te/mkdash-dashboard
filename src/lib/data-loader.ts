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
  // Default: data/ folder in project root - try new file first, fallback to old
  const newPath = path.join(process.cwd(), 'data', 'Dashboard Input File - RIQ.xlsx');
  const oldPath = path.join(process.cwd(), 'data', 'RIQ & AB_InputFile.xlsx');

  // Check if new file exists
  if (fs.existsSync(newPath)) {
    return newPath;
  }
  // Fallback to old file for backward compatibility
  return oldPath;
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
  // Milestone Tracker sheet: Row 1 = "Table 1", Row 2 = Headers, Row 3+ = Data
  for (let r = 3; r <= 50; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break; // Stop at first empty row
    milestones.push({
      activityId: id,
      activityName: cellVal(ws, `B${r}`),         // Column B: Milestone Name
      milestoneWeight: cellNum(ws, `C${r}`),      // Column C: Milestone Weight
      taskCompletionPct: cellNum(ws, `D${r}`),    // Column D: Task Completion %
      startDate: formatDate(ws, `G${r}`),         // Column G: StartDate
      endDate: formatDate(ws, `H${r}`),           // Column H: EndDate
      overallStatus: cellVal(ws, `I${r}`),        // Column I: OverallStatus
      owner: cellVal(ws, `J${r}`),                // Column J: Owner
      comments: cellVal(ws, `K${r}`),             // Column K: Comments
    });
  }
  return milestones;
}

function parseRentalIQActivities(ws: XLSX.WorkSheet): RIQActivity[] {
  const activities: RIQActivity[] = [];
  // Activity Tracker sheet: Row 1 = "Table 2", Row 2 = Headers, Row 3+ = Data
  for (let r = 3; r <= 50; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break; // Stop at first empty row
    activities.push({
      subTaskId: id,                              // Column A: TaskID
      parentId: cellNum(ws, `B${r}`),             // Column B: ActivityID
      activityName: cellVal(ws, `C${r}`),         // Column C: Milestone Name (VLOOKUP)
      subTaskName: cellVal(ws, `D${r}`),          // Column D: Task Name
      status: cellVal(ws, `E${r}`),               // Column E: Status
      owner: cellVal(ws, `F${r}`),                // Column F: Owner
      subEndDate: formatDate(ws, `G${r}`),        // Column G: End Date
      priority: cellVal(ws, `H${r}`),             // Column H: Priority
      currentDate: formatDate(ws, `I${r}`),       // Column I: Current Date
      comments: cellVal(ws, `J${r}`),             // Column J: Comments
    });
  }
  return activities;
}

function parseRentalIQMilestoneCompletion(ws: XLSX.WorkSheet): RIQMilestoneCompletion[] {
  const completions: RIQMilestoneCompletion[] = [];
  // Milestone Tracker sheet contains completion data
  // Row 1 = "Table 1", Row 2 = Headers, Row 3+ = Data
  for (let r = 3; r <= 50; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break; // Stop at first empty row

    const weight = cellNum(ws, `C${r}`);              // Column C: Milestone Weight
    const taskPct = cellNum(ws, `D${r}`);             // Column D: Task Completion %
    const completionPct = cellNum(ws, `E${r}`);       // Column E: Completion % (by weight) - formula result
    const cumulativePct = cellNum(ws, `F${r}`);       // Column F: Overall Cumulative Completion %

    completions.push({
      activityId: id,
      activityName: cellVal(ws, `B${r}`),             // Column B: Milestone Name
      taskCompletionPct: taskPct,
      milestoneWeight: weight,
      completionPct: completionPct || (weight * taskPct), // Use formula value or calculate
      status: cellVal(ws, `I${r}`),                   // Column I: OverallStatus
      cumulativeCompletionPct: cumulativePct,
      owner: cellVal(ws, `J${r}`),                    // Column J: Owner
    });
  }
  return completions;
}

function parseRentalIQRisks(ws: XLSX.WorkSheet): RIQRisk[] {
  const risks: RIQRisk[] = [];
  // Tech-Business Risk sheet: Row 1 = "Table 3", Row 2 = Headers, Row 3+ = Data
  for (let r = 3; r <= 50; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break; // Stop at first empty row
    risks.push({
      srNo: id,                                   // Column A: RAID ID
      risk: cellVal(ws, `C${r}`),                 // Column C: Description
      probability: cellVal(ws, `E${r}`),          // Column E: Likelihood
      impact: cellVal(ws, `D${r}`),               // Column D: Impact
      status: cellVal(ws, `J${r}`),               // Column J: Status
      riskOwner: cellVal(ws, `G${r}`),            // Column G: Owner
      mitigationPlan: cellVal(ws, `H${r}`),       // Column H: Mitigation
      mitigationStatus: cellVal(ws, `J${r}`),     // Column J: Status (same as status)
      comments: cellVal(ws, `K${r}`),             // Column K: Comments
    });
  }
  return risks;
}

function parseRentalIQDevTasks(ws: XLSX.WorkSheet): RIQDevTask[] {
  const tasks: RIQDevTask[] = [];
  // Dev Velocity sheet: Row 1 = "Table 4", Row 2 = Headers, Row 3+ = Data
  for (let r = 3; r <= 50; r++) {
    const dateVal = formatDate(ws, `A${r}`);
    if (!dateVal) break; // Stop at first empty row
    tasks.push({
      date: dateVal,                        // Column A: Date
      open: cellNum(ws, `B${r}`),           // Column B: Open
      completed: cellNum(ws, `C${r}`),      // Column C: Completed
      onHold: cellNum(ws, `D${r}`),         // Column D: On-Hold
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

  // New sheet structure - each table has its own sheet
  const wsMilestones = wb.Sheets['Milestone Tracker'];
  const wsActivities = wb.Sheets['Activity Tracker'];
  const wsRisks = wb.Sheets['Tech-Business Risk'];
  const wsDevVelocity = wb.Sheets['Dev Velocity'];

  // Milestone completion is derived from Milestone Tracker
  const milestoneCompletion = parseRentalIQMilestoneCompletion(wsMilestones);
  const lastCompletion = milestoneCompletion[milestoneCompletion.length - 1];
  const cumulativeCompletion = lastCompletion ? lastCompletion.cumulativeCompletionPct : 0;

  return {
    milestones: parseRentalIQMilestones(wsMilestones),
    activities: parseRentalIQActivities(wsActivities),
    milestoneCompletion,
    cumulativeCompletion,
    risks: parseRentalIQRisks(wsRisks),
    devTasks: parseRentalIQDevTasks(wsDevVelocity),
    insights: {
      marketAnalytics: [], // Not in new template
      platformInsights: [], // Not in new template
      affordabilityRating: [], // Not in new template
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
