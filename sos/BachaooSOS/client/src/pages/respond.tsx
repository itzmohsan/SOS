import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/distance";
import { 
  MapPin, 
  Users, 
  Ruler, 
  Heart, 
  Navigation, 
  ShieldCheck,
  Clock
} from "lucide-react";

interface RespondProps {
  user: any;
}

interface EmergencyEvent {
  id: string;
  location: { lat: number; lng: number };
  location_address: string;
  created_at: string;
  distance: number;
  responderCount: number;
  user_id: string;
}

export default function Respond({ user }: RespondProps) {
  const { toast } = useToast();
  const { latitude, longitude } = useGeolocation(true);
  const { lastMessage } = useWebSocket(user.id);

  // Get nearby emergencies
  const { data: emergenciesData, refetch } = useQuery<{ events: EmergencyEvent[] }>({
    queryKey: ["/api/sos/nearby", { lat: latitude, lng: longitude, radius: 2 }],
    enabled: !!(latitude && longitude),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Handle real-time emergency alerts
  useEffect(() => {
    if (lastMessage?.type === 'sos_alert') {
      // New emergency alert received
      toast({
        title: "New Emergency Alert!",
        description: `Someone needs help nearby`,
      });
      refetch(); // Refresh the list
    }
  }, [lastMessage, toast, refetch]);

  // Respond to emergency mutation
  const respondMutation = useMutation({
    mutationFn: async ({ sosEventId, distance }: { sosEventId: string; distance: number }) => {
      const response = await apiRequest("POST", "/api/sos/respond", {
        sos_event_id: sosEventId,
        responder_id: user.id,
        distance,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Response Sent!",
        description: "You are now marked as responding to this emergency",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sos/nearby"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Respond",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleRespond = (emergency: EmergencyEvent) => {
    if (emergency.user_id === user.id) {
      toast({
        title: "Cannot Respond",
        description: "You cannot respond to your own emergency",
        variant: "destructive",
      });
      return;
    }

    respondMutation.mutate({
      sosEventId: emergency.id,
      distance: emergency.distance,
    });
  };

  const getDirections = (emergency: EmergencyEvent) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${emergency.location.lat},${emergency.location.lng}`;
    window.open(url, '_blank');
  };

  const formatTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  };

  const emergencies: EmergencyEvent[] = emergenciesData?.events || [];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4 sticky top-0 z-10">
        <h2 className="text-xl font-bold text-foreground" data-testid="text-respond-title">
          Nearby Emergencies
        </h2>
        <p className="text-sm text-muted-foreground">Help those around you</p>
        {latitude && longitude && (
          <p className="text-xs text-muted-foreground mt-1">
            📍 Searching within 2km of your location
          </p>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {!latitude || !longitude ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Location Required</h3>
              <p className="text-sm text-muted-foreground">
                Please enable location services to see nearby emergencies
              </p>
            </CardContent>
          </Card>
        ) : emergencies.length === 0 ? (
          <Card className="bg-success/10 border-success/20">
            <CardContent className="p-6 text-center">
              <ShieldCheck className="w-12 h-12 text-success mx-auto mb-4" />
              <h3 className="font-semibold text-success mb-2" data-testid="text-no-emergencies">
                All Clear!
              </h3>
              <p className="text-sm text-muted-foreground">
                No active emergencies in your area
              </p>
            </CardContent>
          </Card>
        ) : (
          emergencies.map((emergency) => (
            <Card key={emergency.id} className="overflow-hidden shadow-sm">
              <div className="bg-primary/10 px-4 py-3 border-b border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-primary">
                      ACTIVE EMERGENCY
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground" data-testid={`text-time-${emergency.id}`}>
                    {formatTime(emergency.created_at)}
                  </span>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold" data-testid={`text-location-${emergency.id}`}>
                        {emergency.location_address || "Location shared"}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Ruler className="w-3 h-3" />
                        <span data-testid={`text-distance-${emergency.id}`}>
                          {formatDistance(emergency.distance)} away
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span data-testid={`text-responders-${emergency.id}`}>
                          {emergency.responderCount} responding
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {emergency.distance.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">km</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleRespond(emergency)}
                    disabled={respondMutation.isPending || emergency.user_id === user.id}
                    data-testid={`button-respond-${emergency.id}`}
                  >
                    {respondMutation.isPending ? (
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Heart className="w-4 h-4 mr-2" />
                    )}
                    {emergency.user_id === user.id ? "Your Emergency" : "I'm Responding"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => getDirections(emergency)}
                    className="w-12 h-10"
                    data-testid={`button-directions-${emergency.id}`}
                  >
                    <Navigation className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Helper Info */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="text-center">
              <Heart className="w-8 h-8 text-secondary mx-auto mb-2" />
              <h3 className="font-semibold text-sm mb-1">Be a Community Hero</h3>
              <p className="text-xs text-muted-foreground">
                Your quick response can save lives. When you see an emergency alert, 
                every second counts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
