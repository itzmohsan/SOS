import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  AlertCircle, 
  Activity, 
  Database,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

interface User {
  id: string;
  name: string;
  phone: string;
  is_online: boolean;
  available: boolean;
  verified: boolean;
  response_count: number;
  rating: number;
  created_at: string;
}

interface SosEvent {
  id: string;
  user_id: string;
  status: string;
  severity: string;
  category: string;
  created_at: string;
  location_address?: string;
}

export default function AdminDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', refreshKey],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return res.json();
    },
  });

  const { data: sosData, isLoading: sosLoading } = useQuery({
    queryKey: ['admin-sos', refreshKey],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/sos-events");
      return res.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin-stats', refreshKey],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/stats");
      return res.json();
    },
  });

  const users: User[] = usersData?.users || [];
  const sosEvents: SosEvent[] = sosData?.events || [];
  const stats = statsData?.stats || {
    totalUsers: 0,
    onlineUsers: 0,
    activeSosEvents: 0,
    resolvedSosEvents: 0,
    firebaseConnected: false,
    twilioConnected: false,
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Firebase Admin Dashboard</h1>
            <p className="text-muted-foreground">Bachaoo Emergency SOS Network</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.onlineUsers} online now
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active SOS</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSosEvents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.resolvedSosEvents} resolved total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Firebase Status</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {stats.firebaseConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {stats.firebaseConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Push notifications {stats.firebaseConnected ? "active" : "inactive"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Twilio SMS</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {stats.twilioConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {stats.twilioConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                SMS alerts {stats.twilioConnected ? "active" : "inactive"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Registered Users</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-4">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No users registered yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Phone</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Verified</th>
                      <th className="text-left p-2">Responses</th>
                      <th className="text-left p-2">Rating</th>
                      <th className="text-left p-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{user.name}</td>
                        <td className="p-2 text-sm">{user.phone}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {user.is_online && (
                              <Badge variant="outline" className="text-xs">
                                Online
                              </Badge>
                            )}
                            {user.available && (
                              <Badge variant="outline" className="text-xs bg-green-500/10">
                                Available
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          {user.verified ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </td>
                        <td className="p-2">{user.response_count}</td>
                        <td className="p-2">{user.rating.toFixed(1)}</td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SOS Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent SOS Events</CardTitle>
          </CardHeader>
          <CardContent>
            {sosLoading ? (
              <div className="text-center py-4">Loading SOS events...</div>
            ) : sosEvents.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No SOS events yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Event ID</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Severity</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Location</th>
                      <th className="text-left p-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sosEvents.map((event) => (
                      <tr key={event.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono text-xs">{event.id.slice(0, 8)}...</td>
                        <td className="p-2">
                          <Badge 
                            variant={event.status === "active" ? "destructive" : "outline"}
                          >
                            {event.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline">{event.severity}</Badge>
                        </td>
                        <td className="p-2 capitalize">{event.category}</td>
                        <td className="p-2 text-sm">{event.location_address || "N/A"}</td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
