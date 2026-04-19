import mongoose from 'mongoose';
import type { BucketTotals, DateRange } from './dashboard.types.js';

const DASHBOARD_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const toOrganizationObjectId = (organizationId: string) => new mongoose.Types.ObjectId(organizationId);

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function buildAgingThresholds(today: Date) {
  const overdue15Start = new Date(today);
  overdue15Start.setDate(overdue15Start.getDate() - 15);

  const overdue30Start = new Date(today);
  overdue30Start.setDate(overdue30Start.getDate() - 30);

  const overdue45Start = new Date(today);
  overdue45Start.setDate(overdue45Start.getDate() - 45);

  return {
    overdue15Start,
    overdue30Start,
    overdue45Start,
  };
}

export function buildAgingGroupStage(today: Date) {
  const { overdue15Start, overdue30Start, overdue45Start } = buildAgingThresholds(today);

  return {
    $group: {
      _id: null,
      total: { $sum: '$balance' },
      current: {
        $sum: {
          $cond: [{ $gte: ['$dueDate', today] }, '$balance', 0],
        },
      },
      overdue: {
        $sum: {
          $cond: [{ $lt: ['$dueDate', today] }, '$balance', 0],
        },
      },
      currentCount: {
        $sum: {
          $cond: [{ $gte: ['$dueDate', today] }, 1, 0],
        },
      },
      overdueCount: {
        $sum: {
          $cond: [{ $lt: ['$dueDate', today] }, 1, 0],
        },
      },
      overdue1_15: {
        $sum: {
          $cond: [
            {
              $and: [{ $lt: ['$dueDate', today] }, { $gte: ['$dueDate', overdue15Start] }],
            },
            '$balance',
            0,
          ],
        },
      },
      overdue16_30: {
        $sum: {
          $cond: [
            {
              $and: [{ $lt: ['$dueDate', overdue15Start] }, { $gte: ['$dueDate', overdue30Start] }],
            },
            '$balance',
            0,
          ],
        },
      },
      overdue31_45: {
        $sum: {
          $cond: [
            {
              $and: [{ $lt: ['$dueDate', overdue30Start] }, { $gte: ['$dueDate', overdue45Start] }],
            },
            '$balance',
            0,
          ],
        },
      },
      overdueAbove45: {
        $sum: {
          $cond: [{ $lt: ['$dueDate', overdue45Start] }, '$balance', 0],
        },
      },
    },
  };
}

export function buildDateRange(period?: string, customStart?: Date, customEnd?: Date): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'custom' && customStart) {
    return {
      startDate: customStart,
      endDate: customEnd || now,
    };
  }

  if (period === 'last-month') {
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      startDate,
      endDate: endOfMonth(startDate),
    };
  }

  if (period === 'last-6-months') {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth() - 5, 1),
      endDate: now,
    };
  }

  if (period === 'last-12-months') {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth() - 11, 1),
      endDate: now,
    };
  }

  if (period === 'last-7-days') {
    return {
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
      endDate: now,
    };
  }

  if (period === 'this-fiscal-year') {
    const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    return {
      startDate: new Date(startYear, 6, 1),
      endDate: now,
    };
  }

  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: now,
  };
}

export function buildDateMatch(range: DateRange) {
  return {
    $gte: range.startDate,
    $lte: range.endDate,
  };
}

export function formatBucketKey(date: Date, granularity: 'day' | 'month') {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  if (granularity === 'month') {
    return `${year}-${month}`;
  }

  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildBucketSeries(startDate: Date, count: number, granularity: 'day' | 'month') {
  const buckets: Date[] = [];
  const current = new Date(startDate);

  for (let index = 0; index < count; index += 1) {
    buckets.push(new Date(current));
    if (granularity === 'day') {
      current.setDate(current.getDate() + 1);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  return buckets;
}

export async function aggregateAmountByBucket(
  model: any,
  organizationObjectId: mongoose.Types.ObjectId,
  amountField: string,
  range: DateRange,
  granularity: 'day' | 'month',
): Promise<Map<string, number>> {
  const format = granularity === 'day' ? '%Y-%m-%d' : '%Y-%m';
  const results: BucketTotals[] = await model.aggregate([
    {
      $match: {
        organization: organizationObjectId,
        date: buildDateMatch(range),
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format,
            date: '$date',
            timezone: DASHBOARD_TIME_ZONE,
          },
        },
        total: { $sum: `$${amountField}` },
      },
    },
  ]);

  return new Map(results.map((result) => [String(result._id), Number(result.total || 0)]));
}

export async function aggregateTotalsAndMonthlyBuckets(
  model: any,
  organizationObjectId: mongoose.Types.ObjectId,
  amountField: string,
  totalsRange: DateRange,
  breakdownRange: DateRange,
): Promise<{ total: number; monthlyTotals: Map<string, number> }> {
  const [result] = await model.aggregate([
    {
      $match: {
        organization: organizationObjectId,
        date: buildDateMatch(breakdownRange),
      },
    },
    {
      $facet: {
        totals: [
          {
            $match: {
              date: buildDateMatch(totalsRange),
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: `$${amountField}` },
            },
          },
        ],
        monthlyTotals: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m',
                  date: '$date',
                  timezone: DASHBOARD_TIME_ZONE,
                },
              },
              total: { $sum: `$${amountField}` },
            },
          },
        ],
      },
    },
  ]);

  return {
    total: Number(result?.totals?.[0]?.total || 0),
    monthlyTotals: new Map(
      ((result?.monthlyTotals || []) as BucketTotals[]).map((entry) => [
        String(entry._id),
        Number(entry.total || 0),
      ]),
    ),
  };
}

export function getProfitLossMonthSeries(period?: string, customStart?: Date, customEnd?: Date) {
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  let monthsCount = 1;

  if (period === 'last-6-months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    monthsCount = 6;
  } else if (period === 'last-12-months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    monthsCount = 12;
  } else if (period === 'this-fiscal-year') {
    const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    startDate = new Date(startYear, 6, 1);
    monthsCount = 12;
  } else if (period === 'custom' && customStart) {
    const effectiveEnd = customEnd || now;
    startDate = new Date(customStart.getFullYear(), customStart.getMonth(), 1);
    monthsCount = Math.max(
      (effectiveEnd.getFullYear() - startDate.getFullYear()) * 12
        + (effectiveEnd.getMonth() - startDate.getMonth())
        + 1,
      1,
    );
  }

  const monthSeries = buildBucketSeries(startDate, monthsCount, 'month');

  return {
    monthSeries,
    breakdownRange: {
      startDate,
      endDate: endOfMonth(monthSeries[monthSeries.length - 1]),
    } satisfies DateRange,
  };
}

export function calculateTrend(_type: 'receivable' | 'payable'): string {
  return 'stable';
}
