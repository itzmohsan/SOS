import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { formatDistance } from "@/lib/distance";
import { Phone, Navigation, Users, Clock } from "lucide-react";

interface EmergencyMapProps {
  sosEventId: string;
  user: any;
}

interface Responder {
  id: string;
  responder?: {
    id: string;
    name: string;
    rating: number;
  };
  distance: number;
  status: string;
  created_at: string;
}

export default function EmergencyMap({ sosEventId, user }: EmergencyMapProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const { lastMessage } = useWebSocket(user.id);

  // Fetch SOS event details
  const { data: sosData } = useQuery<{
    sosEvent: any;
    responders: Responder[];
  }>({
    queryKey: ["/api/sos", sosEventId],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Update elapsed time
  useEffect(() => {
    if (sosData?.sosEvent) {
      const startTime = new Date(sosData.sosEvent.created_at).getTime();
      const timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [sosData]);

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'responder_update' && lastMessage.sosEventId === sosEventId) {
      // Refresh data when new responders join
      // The query will automatically refetch due to refetchInterval
    }
  }, [lastMessage, sosEventId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const responders: Responder[] = sosData?.responders || [];

  return (
    <div className="h-full flex flex-col">
      {/* Emergency Header */}
      <div className="bg-primary px-4 py-4 text-primary-foreground">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary-foreground rounded-full animate-pulse"></div>
            <span className="font-semibold" data-testid="text-emergency-status">
              EMERGENCY ACTIVE
            </span>
          </div>
          <span className="text-sm font-mono" data-testid="text-elapsed-time">
            {formatTime(elapsedTime)}
          </span>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span data-testid="text-responder-count">
              {responders.length} Responding
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Recording</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div className="map-container w-full h-full">
          {/* Map placeholder with gradient */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Navigation className="w-16 h-16 mb-4 opacity-50 mx-auto" />
              <p className="text-lg font-semibold">Live Map View</p>
              <p className="text-sm opacity-75">Showing responders in real-time</p>
              {sosData?.sosEvent?.location_address && (
                <p className="text-xs opacity-60 mt-2">
                  {sosData.sosEvent.location_address}
                </p>
              )}
            </div>
          </div>

          {/* SOS Location Marker (Center) */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                <span className="text-3xl font-bold text-primary-foreground">!</span>
              </div>
              <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75"></div>
            </div>
          </div>

          {/* Sample Responder Markers - In real implementation, these would be positioned based on actual coordinates */}
          {responders.slice(0, 3).map((responder, index) => {
            const positions = [
              { top: "30%", left: "35%" },
              { top: "65%", right: "30%" },
              { top: "40%", right: "45%" },
            ];
            const position = positions[index] || positions[0];

            return (
              <div
                key={responder.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={position}
                data-testid={`marker-responder-${index}`}
              >
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <Users className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-card px-2 py-1 rounded text-xs whitespace-nowrap shadow">
                  {formatDistance(responder.distance)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Action Buttons */}
        <div className="absolute bottom-24 right-4 space-y-3">
          <Button
            size="sm"
            className="w-14 h-14 rounded-full shadow-lg"
            variant="secondary"
            data-testid="button-center-location"
          >
            <Navigation className="w-5 h-5" />
          </Button>
          <Button
            size="sm"
            className="w-14 h-14 rounded-full shadow-lg"
            variant="secondary"
            data-testid="button-emergency-call"
          >
            <Phone className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Bottom Sheet: Responders List */}
      <div className="bg-card rounded-t-3xl shadow-2xl p-4 max-h-64 overflow-y-auto hide-scrollbar">
        <div className="w-12 h-1 bg-border rounded-full mx-auto mb-4"></div>
        <h3 className="font-bold text-lg mb-4" data-testid="text-responders-title">
          Nearby Responders
        </h3>
        
        <div className="space-y-3">
          {responders.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Waiting for responders...</p>
            </div>
          ) : (
            responders.map((responder, index) => (
              <div
                key={responder.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                data-testid={`responder-item-${index}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {responder.responder?.name || `Helper #${index + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistance(responder.distance)} away
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full capitalize">
                    {responder.status}
                  </span>
                  {responder.responder?.rating && (
                    <>
                      <span className="text-warning">★</span>
                      <span className="text-xs font-semibold">
                        {responder.responder.rating.toFixed(1)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
