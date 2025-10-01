'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ChevronLeft, 
  Download,
  RefreshCw,
  BookOpen,
  Play,
  HelpCircle,
  User,
  Calendar,
  Award,
  Clock
} from "lucide-react";
import { ActivityV2Content } from "@/features/activities-v2/types";
import { toast } from "sonner";
import { api } from "@/trpc/react";

interface ActivityV2GradesPageProps {
  activity: any;
  classId: string;
  teacherId: string;
}

export function ActivityV2GradesPage({ activity, classId, teacherId }: ActivityV2GradesPageProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);

  const content = activity.content as ActivityV2Content;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz': return HelpCircle;
      case 'reading': return BookOpen;
      case 'video': return Play;
      default: return HelpCircle;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'quiz': return 'bg-blue-500';
      case 'reading': return 'bg-green-500';
      case 'video': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const handleBack = () => {
    router.push(`/teacher/classes/${classId}/activities-v2/${activity.id}`);
  };

  const handleExportGrades = async () => {
    setIsExporting(true);
    try {
      // TODO: Implement grades export
      toast.success('Grades export will be available soon');
    } catch (error) {
      toast.error('Failed to export grades');
    } finally {
      setIsExporting(false);
    }
  };

  const Icon = getActivityIcon(content.type);
  const submissions = activity.activityGrades || [];
  const completionRate = submissions.length > 0 ? 
    (submissions.filter((s: any) => s.status === 'GRADED').length / submissions.length) * 100 : 0;
  const averageScore = submissions.length > 0 ? 
    submissions.reduce((acc: number, s: any) => acc + (s.score || 0), 0) / submissions.length : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'GRADED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Graded</Badge>;
      case 'SUBMITTED':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline">In Progress</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Activity
          </Button>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getActivityColor(content.type)}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Grades: {content.title}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Activities V2
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {content.type}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportGrades} disabled={isExporting}>
            {isExporting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export Grades
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Submissions</span>
            </div>
            <p className="text-2xl font-bold">{submissions.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Average Score</span>
            </div>
            <p className="text-2xl font-bold">{averageScore.toFixed(1)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Completion Rate</span>
            </div>
            <p className="text-2xl font-bold">{completionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Max Score</span>
            </div>
            <p className="text-2xl font-bold">{activity.maxScore || 'N/A'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission: any) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {submission.student?.user?.name || 'Unknown Student'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {submission.student?.user?.email || ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(submission.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {submission.score !== null ? submission.score : '-'}
                        </span>
                        {activity.maxScore && (
                          <span className="text-muted-foreground">
                            / {activity.maxScore}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {submission.submittedAt ? formatDate(submission.submittedAt) : '-'}
                    </TableCell>
                    <TableCell>
                      {submission.timeSpent ? `${Math.round(submission.timeSpent / 60)} min` : '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Submissions Yet</p>
              <p className="text-sm">
                Student submissions will appear here once they start completing the activity.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
