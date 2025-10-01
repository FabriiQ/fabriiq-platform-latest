"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, BarChart3 } from "@/components/ui/icons/lucide-icons";
import { api } from "@/trpc/react";
import { LoadingSpinner } from "@/components/ui/loading";
import { formatCurrency } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { addDays, subDays } from "date-fns";

interface LateFeeAnalyticsProps {
  campusId?: string;
}

export function LateFeeAnalytics({ campusId }: LateFeeAnalyticsProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading } = api.lateFee.getAnalytics.useQuery({
    campusId,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
  });

  // Fetch overdue fees for current status
  const { data: overdueFeesData } = api.lateFee.getOverdueFees.useQuery({
    campusId,
    limit: 100,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  const currentOverdueAmount = overdueFeesData?.fees.reduce((sum, fee) => sum + fee.finalAmount, 0) || 0;
  const currentOverdueCount = overdueFeesData?.fees.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Late Fee Analytics</h2>
          <p className="text-muted-foreground">
            Track late fee performance and collection metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
        </div>
      </div>

      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Overdue</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentOverdueCount}</div>
            <p className="text-xs text-muted-foreground">
              Students with overdue fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentOverdueAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Total outstanding amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Fees Applied</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.analytics.totalLateFees || 0}</div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Fee Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analyticsData?.analytics.totalAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Late Fee Summary</CardTitle>
            <CardDescription>
              Overview of late fee applications for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Late Fees Applied</span>
              <Badge variant="outline">
                {analyticsData?.analytics.totalLateFees || 0}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Revenue Generated</span>
              <Badge variant="outline">
                {formatCurrency(analyticsData?.analytics.totalAmount || 0)}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average Late Fee</span>
              <Badge variant="outline">
                {formatCurrency(analyticsData?.analytics.averageLateFee || 0)}
              </Badge>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Period: {dateRange?.from?.toLocaleDateString()} - {dateRange?.to?.toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue Distribution</CardTitle>
            <CardDescription>
              Current overdue fees by days overdue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueFeesData?.fees && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">1-7 days overdue</span>
                  <Badge variant="secondary">
                    {overdueFeesData.fees.filter(f => f.daysOverdue <= 7).length}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">8-30 days overdue</span>
                  <Badge variant="secondary">
                    {overdueFeesData.fees.filter(f => f.daysOverdue > 7 && f.daysOverdue <= 30).length}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">31-60 days overdue</span>
                  <Badge variant="destructive">
                    {overdueFeesData.fees.filter(f => f.daysOverdue > 30 && f.daysOverdue <= 60).length}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">60+ days overdue</span>
                  <Badge variant="destructive">
                    {overdueFeesData.fees.filter(f => f.daysOverdue > 60).length}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>
            Important metrics and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Collection Efficiency</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentOverdueCount > 0 
                  ? `${currentOverdueCount} students have overdue fees. Consider automated reminders.`
                  : "All fees are up to date. Great collection performance!"
                }
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="font-medium">Revenue Impact</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Late fees generated {formatCurrency(analyticsData?.analytics.totalAmount || 0)} 
                {analyticsData?.analytics.totalLateFees && analyticsData.analytics.totalLateFees > 0
                  ? ` from ${analyticsData.analytics.totalLateFees} applications`
                  : " in the selected period"
                }.
              </p>
            </div>
          </div>

          {currentOverdueCount > 10 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-orange-800">Action Required</span>
              </div>
              <p className="text-sm text-orange-700">
                High number of overdue fees detected. Consider reviewing payment policies 
                or implementing automated late fee processing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
