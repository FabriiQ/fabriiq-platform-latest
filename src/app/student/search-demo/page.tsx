'use client';

import React, { useState } from 'react';
import { StudentHeader } from '@/components/student/StudentHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, User, Calendar } from 'lucide-react';

export default function StudentSearchDemoPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration
  const mockData = [
    { id: 1, type: 'class', title: 'Mathematics 101', description: 'Advanced calculus and algebra', teacher: 'Dr. Smith' },
    { id: 2, type: 'assignment', title: 'Physics Lab Report', description: 'Complete the pendulum experiment analysis', dueDate: '2024-01-15' },
    { id: 3, type: 'resource', title: 'Chemistry Notes', description: 'Organic chemistry study materials', subject: 'Chemistry' },
    { id: 4, type: 'event', title: 'Science Fair', description: 'Annual school science fair presentation', date: '2024-01-20' },
    { id: 5, type: 'class', title: 'English Literature', description: 'Modern poetry and prose analysis', teacher: 'Ms. Johnson' },
    { id: 6, type: 'assignment', title: 'History Essay', description: 'Write about World War II impact', dueDate: '2024-01-18' },
  ];

  // Filter data based on search query
  const filteredData = mockData.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.teacher && item.teacher.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.subject && item.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'class':
        return <BookOpen className="h-4 w-4" />;
      case 'assignment':
        return <Calendar className="h-4 w-4" />;
      case 'resource':
        return <BookOpen className="h-4 w-4" />;
      case 'event':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'class':
        return 'bg-blue-100 text-blue-800';
      case 'assignment':
        return 'bg-orange-100 text-orange-800';
      case 'resource':
        return 'bg-green-100 text-green-800';
      case 'event':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Custom header with search functionality */}
      <StudentHeader
        title="Search Demo"
        showSearch={true}
        searchPlaceholder="Search classes, assignments, resources..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        showCompanionButton={true}
      />

      <div className="container mx-auto py-6 space-y-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Search Functionality Demo</h1>
            <p className="text-muted-foreground">
              This page demonstrates the new search functionality in the StudentHeader component.
              Try searching for classes, assignments, resources, or teachers.
            </p>
          </div>

          {searchQuery && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredData.length} results for "{searchQuery}"
            </div>
          )}

          <div className="grid gap-4">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getIcon(item.type)}
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                      </div>
                      <Badge className={getTypeColor(item.type)}>
                        {item.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-2">
                      {item.description}
                    </CardDescription>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {item.teacher && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.teacher}
                        </div>
                      )}
                      {item.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {item.dueDate}
                        </div>
                      )}
                      {item.date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.date}
                        </div>
                      )}
                      {item.subject && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {item.subject}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : searchQuery ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try searching for different keywords or check your spelling.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Start typing to search...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Search across classes, assignments, resources, and more.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Features Implemented</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">✅ Student Companion Page</h4>
                <p className="text-sm text-muted-foreground">
                  Created a dedicated companion page at /student/companion with full-screen chat interface, 
                  search functionality, and settings panel.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">✅ Search in StudentHeader</h4>
                <p className="text-sm text-muted-foreground">
                  Added responsive search functionality to StudentHeader with desktop inline search 
                  and mobile collapsible search.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">✅ Companion Button</h4>
                <p className="text-sm text-muted-foreground">
                  Added companion button to StudentHeader that navigates to the new companion page, 
                  positioned with other header icons.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">✅ Navigation Integration</h4>
                <p className="text-sm text-muted-foreground">
                  Updated StudentShell navigation to include the companion page in the sidebar menu 
                  with proper routing and icon.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
