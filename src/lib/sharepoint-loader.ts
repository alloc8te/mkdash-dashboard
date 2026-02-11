import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import * as XLSX from 'xlsx';
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

// Cache for the workbook to avoid repeated fetches
let cachedWorkbook: XLSX.WorkBook | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

function getGraphClient(): Client {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing Azure credentials in environment variables');
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  return Client.initWithMiddleware({ authProvider });
}

function encodeShareUrl(shareUrl: string): string {
  // Convert sharing URL to a format Graph API can use
  // See: https://learn.microsoft.com/en-us/graph/api/shares-get
  const base64 = Buffer.from(shareUrl).toString('base64');
  return 'u!' + base64.replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
}

async function fetchWorkbookFromSharePoint(): Promise<XLSX.WorkBook> {
  const now = Date.now();

  // Return cached workbook if still valid
  if (cachedWorkbook && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedWorkbook;
  }

  const shareUrl = process.env.SHAREPOINT_FILE_URL;
  if (!shareUrl) {
    throw new Error('SHAREPOINT_FILE_URL environment variable is not set');
  }

  const client = getGraphClient();
  const encodedUrl = encodeShareUrl(shareUrl);

  // Get the file content using the sharing link
  const response = await client
    .api(`/shares/${encodedUrl}/driveItem/content`)
    .responseType('arraybuffer' as any)
    .get();

  const buffer = Buffer.from(response);
  cachedWorkbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  cacheTimestamp = now;

  return cachedWorkbook;
}

// Helper functions (same as data-loader.ts)
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

function formatDate(sheet: XLSX.WorkSheet, ref: string): string {
  const cell = sheet[ref];
  if (!cell) return '';
  if (cell.t === 'd' && cell.v instanceof Date) {
    return cell.v.toISOString().split('T')[0];
  }
  const val = String(cell.v ?? '');
  if (!val) return '';
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return val;
}

// Rental IQ Parsers
function parseRentalIQMilestones(ws: XLSX.WorkSheet): RIQMilestone[] {
  const milestones: RIQMilestone[] = [];
  for (let r = 3; r <= 50; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break;
    milestones.push({
      activityId: id,
      activityName: cellVal(ws, `B${r}`),
      milestoneWeight: cellNum(ws, `C${r}`),
      taskCompletionPct: cellNum(ws, `D${r}`),
      startDate: formatDate(ws, `G${r}`),
      endDate: formatDate(ws, `H${r}`),
      overallStatus: cellVal(ws, `I${r}`),
      owner: cellVal(ws, `J${r}`),
      comments: cellVal(ws, `K${r}`),
    });
  }
  return milestones;
}

function parseRentalIQActivities(ws: XLSX.WorkSheet): RIQActivity[] {
  const activities: RIQActivity[] = [];
  for (let r = 3; r <= 50; r++) {
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
  for (let r = 3; r <= 50; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break;
    const taskCompletionPct = cellNum(ws, `D${r}`);
    const milestoneWeight = cellNum(ws, `C${r}`);
    const completionPct = cellNum(ws, `E${r}`);
    const cumulativeCompletionPct = cellNum(ws, `F${r}`);
    completions.push({
      activityId: id,
      activityName: cellVal(ws, `B${r}`),
      taskCompletionPct,
      milestoneWeight,
      completionPct,
      status: cellVal(ws, `I${r}`),
      cumulativeCompletionPct,
      owner: cellVal(ws, `J${r}`),
    });
  }
  return completions;
}

function parseRentalIQRisks(ws: XLSX.WorkSheet): RIQRisk[] {
  const risks: RIQRisk[] = [];
  for (let r = 3; r <= 50; r++) {
    const id = cellNum(ws, `A${r}`);
    if (!id) break;
    risks.push({
      srNo: id,
      risk: cellVal(ws, `C${r}`),
      probability: cellVal(ws, `E${r}`),
      impact: cellVal(ws, `D${r}`),
      status: cellVal(ws, `J${r}`),
      riskOwner: cellVal(ws, `G${r}`),
      mitigationPlan: cellVal(ws, `H${r}`),
      mitigationStatus: cellVal(ws, `J${r}`),
      comments: cellVal(ws, `K${r}`),
    });
  }
  return risks;
}

function parseRentalIQDevTasks(ws: XLSX.WorkSheet): RIQDevTask[] {
  const tasks: RIQDevTask[] = [];
  for (let r = 3; r <= 50; r++) {
    const dateVal = formatDate(ws, `A${r}`);
    if (!dateVal) break;
    tasks.push({
      date: dateVal,
      open: cellNum(ws, `B${r}`),
      completed: cellNum(ws, `C${r}`),
      onHold: cellNum(ws, `D${r}`),
    });
  }
  return tasks;
}

function parseRIQMarketAnalytics(ws: XLSX.WorkSheet): RIQMarketAnalytics[] {
  const items: RIQMarketAnalytics[] = [];
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

// AwardBook Parsers
function parseABMilestones(ws: XLSX.WorkSheet): ABMilestone[] {
  const milestones: ABMilestone[] = [];
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

// Public API
export async function loadRentalIQDataFromSharePoint(): Promise<RentalIQData> {
  const wb = await fetchWorkbookFromSharePoint();

  const wsMilestones = wb.Sheets['Milestone Tracker'];
  const wsActivities = wb.Sheets['Activity Tracker'];
  const wsRisks = wb.Sheets['Tech To Business Alerts'];
  const wsDevVelocity = wb.Sheets['Dev Velocity'];

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

export async function loadAwardBookDataFromSharePoint(): Promise<AwardBookData> {
  const wb = await fetchWorkbookFromSharePoint();

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

// Clear cache (useful for forcing a refresh)
export function clearSharePointCache(): void {
  cachedWorkbook = null;
  cacheTimestamp = 0;
}
