"use client";

import { useState } from "react";
import { Enrollment } from "@/app/admin/campus/enrollment/page";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import { TabsContent } from "@/components/ui/navigation/tabs";
import { EnrollmentDataTable } from "./enrollment-data-table";

interface EnrollmentDataTableWrapperProps {
  enrollments: Enrollment[];
  activeTab?: string;
}

export function EnrollmentDataTableWrapper({ enrollments, activeTab = "all" }: EnrollmentDataTableWrapperProps) {
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  // Extract unique programs and classes for filters
  const uniquePrograms = Array.from(new Set(enrollments.map(e => e.programName)))
    .filter(Boolean)
    .map(name => ({ id: name, name }));

  const uniqueClasses = Array.from(new Set(enrollments.map(e => e.className)))
    .filter(Boolean)
    .map(name => ({ id: name, name }));

  // Apply filters based on active tab and additional filters
  const getFilteredEnrollments = (tabFilter?: string) => {
    let filtered = enrollments;

    // Apply tab-specific status filter
    if (tabFilter && tabFilter !== "all") {
      filtered = filtered.filter(enrollment => {
        switch (tabFilter) {
          case "active":
            return enrollment.status === "ACTIVE";
          case "pending":
            return enrollment.status === "PENDING";
          case "completed":
            return enrollment.status === "COMPLETED";
          case "withdrawn":
            return enrollment.status === "WITHDRAWN";
          default:
            return true;
        }
      });
    }

    // Apply additional filters
    if (programFilter !== "all") {
      filtered = filtered.filter(enrollment => enrollment.programName === programFilter);
    }
    if (classFilter !== "all") {
      filtered = filtered.filter(enrollment => enrollment.className === classFilter);
    }

    return filtered;
  };

  return (
    <>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Enrollments</CardTitle>
            <CardDescription>Manage student enrollments</CardDescription>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2">
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {uniquePrograms.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TabsContent value="all" className="mt-0">
          <EnrollmentDataTable data={getFilteredEnrollments("all")} />
        </TabsContent>
        <TabsContent value="active" className="mt-0">
          <EnrollmentDataTable data={getFilteredEnrollments("active")} />
        </TabsContent>
        <TabsContent value="pending" className="mt-0">
          <EnrollmentDataTable data={getFilteredEnrollments("pending")} />
        </TabsContent>
        <TabsContent value="completed" className="mt-0">
          <EnrollmentDataTable data={getFilteredEnrollments("completed")} />
        </TabsContent>
        <TabsContent value="withdrawn" className="mt-0">
          <EnrollmentDataTable data={getFilteredEnrollments("withdrawn")} />
        </TabsContent>
      </CardContent>
    </>
  );
} 