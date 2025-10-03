import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Handshake, 
  Clock, 
  Star, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle,
  Heart,
  Users
} from "lucide-react";

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  // Get user statistics
  const { data: statsData } = useQuery<{
    stats: {
      responseCount: number;
      sosEventsTriggered: number;
      rating: number;
      activeDays: number;
      avgResponseTime: number;
    };
  }>({
    queryKey: ["/api/users", user.id, "stats"],
  });

  const stats = statsData?.stats || {
    responseCount: 0,
    sosEventsTriggered: 0,
    rating: 0,
    activeDays: 0,
    avgResponseTime: 0
  };

  // Mock recent activities for now
  const recentActivities = [
    {
      id: 1,
      type: "response",
      title: "Emergency Resolved",
      description: "You helped in Garden Town",
      time: "2 hours ago",
      points: 5,
      icon: CheckCircle,
      color: "success"
    },
    {
      id: 2,
      type: "response",
      title: "Responded to Alert", 
      description: "Model Town area",
      time: "Yesterday",
      points: 3,
      icon: Heart,
      color: "secondary"
    },
    {
      id: 3,
      type: "rating",
      title: "Received 5-Star Rating",
      description: "From user you helped",
      time: "2 days ago",
      points: null,
      icon: Star,
      color: "warning"
    }
  ];

  const getIconColor = (color: string) => {
    switch (color) {
      case "success": return "text-success";
      case "secondary": return "text-secondary";
      case "warning": return "text-warning";
      default: return "text-muted-foreground";
    }
  };

  const getBgColor = (color: string) => {
    switch (color) {
      case "success": return "bg-success/10";
      case "secondary": return "bg-secondary/10";
      case "warning": return "bg-warning/10";
      default: return "bg-muted";
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4 sticky top-0 z-10">
        <h2 className="text-xl font-bold text-foreground" data-testid="text-dashboard-title">
          Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">Your safety network stats</p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Handshake className="w-5 h-5 text-secondary" />
                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  +12%
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1" data-testid="text-response-count">
                {stats.responseCount}
              </p>
              <p className="text-xs text-muted-foreground">Times Helped</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-secondary" />
                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                  <TrendingDown className="w-3 h-3 inline mr-1" />
                  -5%
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1" data-testid="text-avg-response">
                {stats.avgResponseTime || "2.5"}
              </p>
              <p className="text-xs text-muted-foreground">Avg Response (min)</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-5 h-5 text-warning" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-1" data-testid="text-user-rating">
                {stats.rating || "4.9"}
              </p>
              <p className="text-xs text-muted-foreground">Your Rating</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-1" data-testid="text-active-days">
                {stats.activeDays}
              </p>
              <p className="text-xs text-muted-foreground">Days Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground" data-testid="text-recent-activity">
              Recent Activity
            </h3>
          </div>
          
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div 
                    key={activity.id}
                    className="px-4 py-3 hover:bg-muted/50 transition-colors"
                    data-testid={`activity-item-${activity.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 ${getBgColor(activity.color)} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${getIconColor(activity.color)}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                      {activity.points && (
                        <span className={`text-xs px-2 py-1 ${getBgColor(activity.color)} ${getIconColor(activity.color)} rounded-full`}>
                          +{activity.points} pts
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Area Safety Score */}
        <Card>
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground" data-testid="text-area-safety">
              Area Safety Score
            </h3>
          </div>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Area</p>
                <div className="flex items-center space-x-2">
                  <div className="text-3xl font-bold text-success" data-testid="text-safety-score">
                    8.5
                  </div>
                  <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                    Safe
                  </span>
                </div>
              </div>
              <div className="w-20 h-20 rounded-full border-8 border-success flex items-center justify-center">
                <Shield className="w-8 h-8 text-success" />
              </div>
            </div>
            
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Helper Density</span>
                <span className="font-semibold text-foreground">High</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Avg Response Time</span>
                <span className="font-semibold text-foreground">2 min</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Recent Incidents</span>
                <span className="font-semibold text-foreground">Low</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Helper Statistics */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold mb-1">Community Impact</h3>
            <p className="text-sm text-muted-foreground mb-3">
              You've made a difference in your community
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-2xl font-bold text-primary">{stats.responseCount}</p>
                <p className="text-xs text-muted-foreground">People Helped</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">
                  {Math.round(stats.responseCount * 2.5)}
                </p>
                <p className="text-xs text-muted-foreground">Minutes Saved</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
