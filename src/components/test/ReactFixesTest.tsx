'use client';

import { React, useState, useEffect, useCallback, useMemo } from "@/utils/react-fixes";
import { BuildingIcon, UsersIcon, ChevronLeftIcon } from "@/utils/icon-fixes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Test component to verify that React fixes and icon fixes are working correctly
 */
export function ReactFixesTest() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("React fixes are working!");

  // Test useEffect
  useEffect(() => {
    console.log("useEffect is working correctly!");
    setMessage("All React hooks are working!");
  }, []);

  // Test useCallback
  const handleClick = useCallback(() => {
    setCount(prev => prev + 1);
  }, []);

  // Test useMemo
  const computedValue = useMemo(() => {
    return count * 2;
  }, [count]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BuildingIcon className="h-5 w-5" />
          React & Icon Fixes Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-4 w-4" />
          <span>{message}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span>Count: {count}</span>
          <span>Computed: {computedValue}</span>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleClick} className="flex items-center gap-2">
            <ChevronLeftIcon className="h-4 w-4" />
            Increment
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          If you can see this component without errors, all fixes are working!
        </div>
      </CardContent>
    </Card>
  );
}
