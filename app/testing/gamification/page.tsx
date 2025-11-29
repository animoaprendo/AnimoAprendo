'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getUserGamificationProfile, awardXP } from '@/app/gamification-actions';
import { useUser } from '@clerk/nextjs';

export default function GamificationTestPage() {
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<any>(null);
  const [profileResult, setProfileResult] = useState<any>(null);
  const [xpResult, setXpResult] = useState<any>(null);

  const runDatabaseSetup = async () => {
    if (!user) {
      toast("Please sign in to run database setup");
      return;
    }
    
    setIsLoading(true);
    try {
      // For setup, we'll still use the API since it's an admin function
      const response = await fetch('/api/gamification/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setSetupResult(data);
      
      if (response.ok) {
        toast("Database setup completed successfully");
      } else {
        toast("Setup failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast("Failed to run database setup");
    } finally {
      setIsLoading(false);
    }
  };

  const testProfile = async () => {
    if (!user) {
      toast("Please sign in to test profile");
      return;
    }
    
    setIsLoading(true);
    try {
      const profile = await getUserGamificationProfile(user.id);
      setProfileResult(profile);
      toast("Profile retrieved successfully");
    } catch (error) {
      console.error('Profile error:', error);
      setProfileResult({ error: 'Failed to get profile' });
      toast("Failed to get profile");
    } finally {
      setIsLoading(false);
    }
  };

  const testAwardXP = async () => {
    if (!user) {
      toast("Please sign in to test XP award");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await awardXP(
        'session_completed',
        50,
        'Test session completed',
        'test-session-123',
        'appointment',
        user.id
      );
      
      setXpResult(result);
      
      if (result.success) {
        const data = result.data;
        toast(`Awarded ${data?.xpAwarded || 50} XP successfully!`);
        if (data?.newAchievements && data.newAchievements.length > 0) {
          toast(`🏆 New achievement unlocked: ${data.newAchievements[0].name}!`);
        }
        if (data?.leveledUp) {
          toast(`🎉 Level up! You're now level ${data.newLevel}!`);
        }
      } else {
        toast("XP award failed: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error('XP error:', error);
      setXpResult({ error: 'Failed to award XP' });
      toast("Failed to award XP");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Gamification System Test</h1>
          <p className="text-muted-foreground">Please sign in to test the gamification system</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Gamification System Test</h1>
        <p className="text-muted-foreground">Test the gamification system functionality</p>
        <p className="text-sm text-muted-foreground">Signed in as: {user.emailAddresses[0]?.emailAddress}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Database Setup</CardTitle>
            <CardDescription>
              Initialize the gamification database with collections and indexes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runDatabaseSetup} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Setting up...' : 'Run Database Setup'}
            </Button>
            {setupResult && (
              <div className="p-3 bg-muted rounded-lg">
                <Badge variant={setupResult.success ? "default" : "destructive"}>
                  {setupResult.success ? "Success" : "Error"}
                </Badge>
                <pre className="text-xs mt-2 overflow-auto">
                  {JSON.stringify(setupResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Test</CardTitle>
            <CardDescription>
              Test retrieving gamification profile data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testProfile} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Loading...' : 'Get Profile'}
            </Button>
            {profileResult && (
              <div className="p-3 bg-muted rounded-lg">
                <Badge variant="default">Profile Data</Badge>
                <pre className="text-xs mt-2 overflow-auto max-h-40">
                  {JSON.stringify(profileResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>XP Award Test</CardTitle>
            <CardDescription>
              Test awarding XP for completing actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testAwardXP} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Awarding...' : 'Award 50 XP'}
            </Button>
            {xpResult && (
              <div className="p-3 bg-muted rounded-lg">
                <Badge variant="default">XP Result</Badge>
                <pre className="text-xs mt-2 overflow-auto">
                  {JSON.stringify(xpResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2">
            <li>First, run "Database Setup" to initialize the collections and default achievements</li>
            <li>Then, test "Get Profile" to see your gamification profile (will be created if it doesn't exist)</li>
            <li>Finally, test "Award XP" to see the system award experience points and check for achievements</li>
            <li>You can run the profile test again after awarding XP to see the changes</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}