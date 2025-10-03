import { useParams } from "wouter";
import EmergencyMap from "@/components/emergency-map";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Emergency() {
  const params = useParams();
  const sosId = params?.sosId;

  // Get current user from localStorage for now
  const currentUser = JSON.parse(localStorage.getItem('bachaoo_user') || '{}');

  // Verify SOS event exists
  const { data: sosData, isLoading, error } = useQuery<{
    sosEvent: any;
    responders: any[];
  }>({
    queryKey: ["/api/sos", sosId],
    enabled: !!sosId,
  });

  if (!sosId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Emergency</h2>
            <p className="text-muted-foreground">
              No emergency ID provided or emergency not found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading emergency details...</p>
        </div>
      </div>
    );
  }

  if (error || !sosData?.sosEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Emergency Not Found</h2>
            <p className="text-muted-foreground">
              The emergency you're looking for doesn't exist or has been resolved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <EmergencyMap sosEventId={sosId} user={currentUser} />
    </div>
  );
}
