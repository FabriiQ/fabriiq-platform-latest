"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { LoadingSpinner } from "@/components/ui/loading";

export default function FeeManagementDebugPage() {
  const [enrollmentId, setEnrollmentId] = useState("cmet1bl2x0ktbqfis2aa71bfu");
  const [programCampusId, setProgramCampusId] = useState("");

  // Get all fee structures
  const { data: allFeeStructures, isLoading: allLoading } = api.feeStructure.getAll.useQuery();

  // Get enrollment details
  const { data: enrollment, isLoading: enrollmentLoading } = api.enrollment.getEnrollment.useQuery(
    { id: enrollmentId },
    { enabled: !!enrollmentId }
  );

  // Get fee structures by program campus
  const { data: feeStructuresByProgram, isLoading: programLoading } = api.feeStructure.getByProgramCampus.useQuery(
    { programCampusId },
    { enabled: !!programCampusId }
  );

  const handleCheckEnrollment = () => {
    if (enrollment?.enrollment?.class?.programCampusId) {
      setProgramCampusId(enrollment.enrollment.class.programCampusId);
    } else if (enrollment?.enrollment?.class?.programCampus?.id) {
      setProgramCampusId(enrollment.enrollment.class.programCampus.id);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Management Debug</h1>
          <p className="text-muted-foreground">
            Debug fee structure assignment issues
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Enrollment Debug */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Debug</CardTitle>
            <CardDescription>Check enrollment and program campus details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="enrollmentId">Enrollment ID</Label>
              <Input
                id="enrollmentId"
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(e.target.value)}
                placeholder="Enter enrollment ID"
              />
              <Button onClick={handleCheckEnrollment} disabled={enrollmentLoading}>
                {enrollmentLoading ? <LoadingSpinner /> : "Check Enrollment"}
              </Button>
            </div>

            {enrollment && (
              <div className="space-y-2 p-4 border rounded-lg">
                <h4 className="font-medium">Enrollment Details:</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Student:</strong> {enrollment.enrollment?.student?.user?.name}</p>
                  <p><strong>Class:</strong> {enrollment.enrollment?.class?.name}</p>
                  <p><strong>Program Campus ID (direct):</strong> {enrollment.enrollment?.class?.programCampusId || "Not found"}</p>
                  <p><strong>Program Campus ID (nested):</strong> {enrollment.enrollment?.class?.programCampus?.id || "Not found"}</p>
                  <p><strong>Program Campus Name:</strong> {enrollment.enrollment?.class?.programCampus?.program?.name} - {enrollment.enrollment?.class?.programCampus?.campus?.name}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fee Structures Debug */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Structures Debug</CardTitle>
            <CardDescription>Check available fee structures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="programCampusId">Program Campus ID</Label>
              <Input
                id="programCampusId"
                value={programCampusId}
                onChange={(e) => setProgramCampusId(e.target.value)}
                placeholder="Enter program campus ID"
              />
            </div>

            {programCampusId && (
              <div className="space-y-2">
                <h4 className="font-medium">Fee Structures for Program Campus:</h4>
                {programLoading ? (
                  <LoadingSpinner />
                ) : feeStructuresByProgram && feeStructuresByProgram.length > 0 ? (
                  <div className="space-y-2">
                    {feeStructuresByProgram.map((structure) => (
                      <div key={structure.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{structure.name}</p>
                            <p className="text-sm text-muted-foreground">ID: {structure.id}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={structure.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {structure.status}
                            </Badge>
                            {structure.isRecurring && (
                              <Badge variant="outline">
                                {structure.recurringInterval}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {structure.feeComponents && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Components:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(structure.feeComponents as any[]).map((comp, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {comp.name}: ${comp.amount}
                                  {comp.isRecurring && ` (${comp.recurringInterval})`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No fee structures found for this program campus</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Fee Structures */}
      <Card>
        <CardHeader>
          <CardTitle>All Fee Structures</CardTitle>
          <CardDescription>Complete list of fee structures in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {allLoading ? (
            <LoadingSpinner />
          ) : allFeeStructures && allFeeStructures.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allFeeStructures.map((structure) => (
                <div key={structure.id} className="p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{structure.name}</h4>
                      <Badge variant={structure.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {structure.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">ID: {structure.id}</p>
                    <p className="text-sm text-muted-foreground">Program Campus: {structure.programCampusId}</p>
                    {structure.isRecurring && (
                      <Badge variant="outline" className="text-xs">
                        Recurring: {structure.recurringInterval}
                      </Badge>
                    )}
                    {structure.feeComponents && (
                      <div className="mt-2">
                        <p className="text-xs font-medium">Components:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(structure.feeComponents as any[]).map((comp, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {comp.name}: ${comp.amount}
                              {comp.isRecurring && (
                                <span className="ml-1 text-blue-600">({comp.recurringInterval})</span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No fee structures found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
