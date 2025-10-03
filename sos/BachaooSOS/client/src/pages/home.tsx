import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Bell, Shield, Users, Clock, CheckCircle, AlertTriangle,
  Heart, MapPin, Activity, TrendingUp, Award, Star, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SosButton from "@/components/sos-button";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useFirebaseMessaging } from "@/hooks/use-firebase-messaging";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface HomeProps {
  user: any;
}

export default function Home({ user }: HomeProps) {
  const [, setLocation] = useLocation();
  const { latitude, longitude } = useGeolocation(true);
  const { isConnected, updateLocation } = useWebSocket(user.id);
  const { token, permission, isLoading: fcmLoading } = useFirebaseMessaging(user?.id || null);
  const [showQuickTip, setShowQuickTip] = useState(true);

  useEffect(() => {
    if (latitude && longitude && isConnected) {
      updateLocation(latitude, longitude);
    }
  }, [latitude, longitude, isConnected, updateLocation]);

  const { data: nearbyData } = useQuery<{ users: number; helpers: any[] }>({
    queryKey: ["/api/users/nearby", { lat: latitude, lng: longitude, radius: 2 }],
    enabled: !!(latitude && longitude),
    refetchInterval: 30000,
  });

  const { data: nearbyEmergencies } = useQuery<{ events: any[] }>({
    queryKey: ["/api/sos/nearby", { lat: latitude, lng: longitude, radius: 5 }],
    enabled: !!(latitude && longitude),
    refetchInterval: 10000,
  });

  const handleSosTriggered = (sosEventId: string) => {
    setLocation(`/emergency/${sosEventId}`);
  };

  const nearbyHelpers = nearbyData?.users || 0;
  const activeEmergencies = nearbyEmergencies?.events?.length || 0;
  const profileCompletion = calculateProfileCompletion(user);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      {/* Enhanced Header */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              {isConnected && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2" data-testid="text-app-title">
                Bachaoo
                {user.verified && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isConnected ? 'Protected' : 'Connecting...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
              <Bell className="w-5 h-5" />
              {activeEmergencies > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {activeEmergencies}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">

          {/* Profile Completion Tip */}
          {profileCompletion < 100 && showQuickTip && (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        Complete Your Profile
                      </p>
                    </div>
                    <Progress value={profileCompletion} className="h-2 mb-2" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {profileCompletion}% complete • Add medical info & safe zones for better protection
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setShowQuickTip(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Status Card */}
          <Card className="border-2 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {user.profile_photo ? (
                      <img src={user.profile_photo} alt={user.name} className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-background">
                        <span className="text-xl font-bold text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-xs ${
                      user.available ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      <Shield className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground flex items-center gap-2" data-testid="text-user-name">
                      {user.name}
                      {user.rating > 4.5 && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-user-phone">
                      {user.phone}
                    </p>
                    {user.rating > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-medium text-amber-600">{user.rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({user.response_count} helps)</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/profile')}
                >
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SOS Button - Center Stage */}
          <div className="py-4">
            <SosButton user={user} onSosTriggered={handleSosTriggered} />
          </div>

          {/* Real-time Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-2 hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground" data-testid="text-nearby-helpers">
                  {nearbyHelpers}
                </p>
                <p className="text-xs text-muted-foreground">Helpers</p>
              </CardContent>
            </Card>
            
            <Card className="border-2 hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground" data-testid="text-avg-response">
                  2m
                </p>
                <p className="text-xs text-muted-foreground">Avg Time</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <Activity className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {user.response_count}
                </p>
                <p className="text-xs text-muted-foreground">Your Helps</p>
              </CardContent>
            </Card>
          </div>

          {/* Area Safety Status */}
          <Card className={`border-2 ${
            activeEmergencies > 0 
              ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800' 
              : 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                {activeEmergencies > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${
                    activeEmergencies > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
                  }`}>
                    {activeEmergencies > 0 ? `${activeEmergencies} Active ${activeEmergencies === 1 ? 'Emergency' : 'Emergencies'}` : 'Area Safe'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeEmergencies > 0 
                      ? 'Nearby emergencies need help' 
                      : 'No active emergencies in your area'}
                  </p>
                </div>
                {activeEmergencies > 0 && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => setLocation('/respond')}
                  >
                    Respond
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Access Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-2 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/profile')}>
              <CardContent className="p-4">
                <Heart className="w-5 h-5 text-red-500 mb-2" />
                <p className="text-sm font-semibold">Medical Info</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {user.medical_info ? 'Updated' : 'Add your details'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/profile')}>
              <CardContent className="p-4">
                <MapPin className="w-5 h-5 text-blue-500 mb-2" />
                <p className="text-sm font-semibold">Safe Zones</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {user.safe_zones?.length ? `${user.safe_zones.length} zones` : 'Add locations'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trust & Safety Info */}
          <Card className="border-2 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-500" />
                Community Trust
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Helpers</span>
                <span className="font-semibold">{nearbyHelpers} online</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg Response</span>
                <span className="font-semibold text-green-600">2 minutes</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-semibold text-blue-600">98%</span>
              </div>
            </CardContent>
          </Card>

          {/* Safety Padding */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

function calculateProfileCompletion(user: any): number {
  let score = 50; // Base score for having an account
  
  if (user.emergency_contacts?.length > 0) score += 15;
  if (user.medical_info) score += 20;
  if (user.safe_zones?.length > 0) score += 10;
  if (user.profile_photo) score += 5;
  
  return Math.min(score, 100);
}
