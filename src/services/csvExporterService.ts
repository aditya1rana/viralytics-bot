export interface SubmissionCSVData {
  id: string;
  shortId: string;
  creatorUsername: string;
  creatorTag: string;
  creatorId: string;
  creatorHandle?: string;
  campaignName: string;
  brandName?: string;
  platform: string;
  originalUrl: string;
  viewsCount: number;
  likesCount: number;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export function generateSubmissionsCSV(data: SubmissionCSVData[]): string {
  const headers = [
    'Submission ID',
    'Short ID',
    'Creator Username',
    'Creator Tag / Mention',
    'Creator Discord ID',
    'Creator Social Handle',
    'Campaign Name',
    'Brand Name',
    'Platform',
    'Video URL',
    'Views Generated',
    'Likes Count',
    'Status',
    'Submitted Date',
    'Reviewed Date',
    'Reviewed By ID'
  ];

  const escapeCSV = (field: any): string => {
    if (field === undefined || field === null) return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = data.map(sub => [
    escapeCSV(sub.id),
    escapeCSV(sub.shortId),
    escapeCSV(sub.creatorUsername),
    escapeCSV(sub.creatorTag),
    escapeCSV(sub.creatorId),
    escapeCSV(sub.creatorHandle || 'N/A'),
    escapeCSV(sub.campaignName),
    escapeCSV(sub.brandName || 'N/A'),
    escapeCSV(sub.platform),
    escapeCSV(sub.originalUrl),
    escapeCSV(sub.viewsCount),
    escapeCSV(sub.likesCount),
    escapeCSV(sub.status),
    escapeCSV(sub.submittedAt),
    escapeCSV(sub.reviewedAt || 'N/A'),
    escapeCSV(sub.reviewedBy || 'N/A')
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
