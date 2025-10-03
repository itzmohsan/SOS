import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAudioRecording } from "@/hooks/use-audio-recording";
import { apiRequest } from "@/lib/queryClient";
import { getLocationDescription } from "@/lib/distance";
import { Hand, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SosButtonProps {
  user: any;
  onSosTriggered: (sosEventId: string) => void;
}

export default function SosButton({ user, onSosTriggered }: SosButtonProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const { toast } = useToast();
  const { latitude, longitude, error: locationError, getCurrentPosition } = useGeolocation();
  const { 
    isRecording, 
    audioBlob, 
    startRecording, 
    stopRecording, 
    error: audioError 
  } = useAudioRecording();

  const triggerSOS = async () => {
    if (isTriggering || sosActive) return;

    setIsTriggering(true);

    try {
      // Get current location
      await getCurrentPosition();
      
      if (!latitude || !longitude) {
        throw new Error(locationError || "Unable to get location");
      }

      // Start audio recording
      await startRecording();

      // Get location description
      const locationAddress = await getLocationDescription(latitude, longitude);

      // Send SOS to backend
      const response = await apiRequest("POST", "/api/sos/trigger", {
        user_id: user.id,
        location: { lat: latitude, lng: longitude },
        location_address: locationAddress,
        audio_recording_url: null // Will be uploaded later if needed
      });

      const data = await response.json();
      
      setSosActive(true);
      onSosTriggered(data.sosEvent.id);
      
      toast({
        title: "Emergency Alert Sent!",
        description: `${data.nearbyHelpers} helpers notified nearby`,
      });

    } catch (error) {
      console.error("SOS trigger failed:", error);
      toast({
        title: "Failed to send SOS",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const stopSOS = async () => {
    if (isRecording) {
      stopRecording();
    }
    setSosActive(false);
  };

  if (sosActive) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Button
            size="lg"
            className="w-64 h-64 rounded-full bg-primary hover:bg-primary/90 shadow-2xl pulse-ring"
            disabled
            data-testid="sos-button-active"
          >
            <div className="flex flex-col items-center">
              <Hand className="w-16 h-16 mb-4" />
              <span className="text-2xl font-bold">HELP IS COMING</span>
              <span className="text-sm mt-2">Emergency Active</span>
            </div>
          </Button>
          <div className="absolute inset-0 rounded-full bg-primary opacity-20 animate-ping"></div>
        </div>

        <div className="flex items-center space-x-2">
          {isRecording ? (
            <Mic className="w-4 h-4 text-primary animate-pulse" />
          ) : (
            <MicOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {isRecording ? "Recording audio..." : "Audio stopped"}
          </span>
        </div>

        <Button
          variant="outline"
          onClick={stopSOS}
          data-testid="button-stop-sos"
        >
          Mark as Resolved
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        size="lg"
        className={cn(
          "w-64 h-64 rounded-full bg-primary hover:bg-primary/90 shadow-2xl transition-transform active:scale-95",
          isTriggering && "pulse-ring"
        )}
        onClick={triggerSOS}
        disabled={isTriggering}
        data-testid="sos-button"
      >
        <div className="flex flex-col items-center">
          <Hand className="w-16 h-16 mb-4" />
          <span className="text-2xl font-bold">
            {isTriggering ? "SENDING..." : "SOS"}
          </span>
          <span className="text-sm mt-2">
            {isTriggering ? "Getting location..." : "Tap for Help"}
          </span>
        </div>
      </Button>
      
      {/* Visual pulse effect */}
      <div className="absolute inset-0 rounded-full bg-primary opacity-20 animate-ping"></div>
      
      {/* Error display */}
      {(locationError || audioError) && (
        <div className="mt-4 text-center">
          <p className="text-sm text-destructive">
            {locationError || audioError}
          </p>
        </div>
      )}
    </div>
  );
}
