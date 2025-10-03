import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Plus, 
  MoreVertical, 
  Bell, 
  MapPin, 
  Shield, 
  Info, 
  LogOut, 
  Edit,
  Phone
} from "lucide-react";

interface ProfileProps {
  user: any;
  setUser: (user: any) => void;
}

const emergencyContactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

type EmergencyContactForm = z.infer<typeof emergencyContactSchema>;

export default function Profile({ user, setUser }: ProfileProps) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<EmergencyContactForm>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  // Add/Update emergency contact mutation
  const updateContactsMutation = useMutation({
    mutationFn: async (contacts: Array<{name: string; phone: string}>) => {
      const response = await apiRequest("PUT", `/api/users/${user.id}`, {
        emergency_contacts: contacts
      });
      return response.json();
    },
    onSuccess: (data) => {
      const updatedUser = { ...user, emergency_contacts: data.user.emergency_contacts };
      setUser(updatedUser);
      localStorage.setItem('bachaoo_user', JSON.stringify(updatedUser));
      toast({
        title: "Contacts Updated",
        description: "Emergency contacts have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update emergency contacts",
        variant: "destructive",
      });
    },
  });

  const onSubmitContact = (data: EmergencyContactForm) => {
    const formattedPhone = data.phone.startsWith('+92') 
      ? data.phone 
      : `+92${data.phone.replace(/^0/, '')}`;

    const currentContacts = user.emergency_contacts || [];
    let newContacts;

    if (editingContact !== null) {
      // Update existing contact
      newContacts = [...currentContacts];
      newContacts[editingContact] = {
        name: data.name,
        phone: formattedPhone
      };
    } else {
      // Add new contact
      newContacts = [...currentContacts, {
        name: data.name,
        phone: formattedPhone
      }];
    }

    updateContactsMutation.mutate(newContacts);
    setShowAddContact(false);
    setEditingContact(null);
    form.reset();
  };

  const handleEditContact = (index: number) => {
    const contact = user.emergency_contacts[index];
    form.setValue("name", contact.name);
    form.setValue("phone", contact.phone);
    setEditingContact(index);
    setShowAddContact(true);
  };

  const handleDeleteContact = (index: number) => {
    const currentContacts = user.emergency_contacts || [];
    const newContacts = currentContacts.filter((_: any, i: number) => i !== index);
    updateContactsMutation.mutate(newContacts);
  };

  const handleLogout = () => {
    localStorage.removeItem('bachaoo_user');
    window.location.reload();
  };

  const emergencyContacts = user.emergency_contacts || [];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4 sticky top-0 z-10">
        <h2 className="text-xl font-bold text-foreground" data-testid="text-profile-title">
          Profile & Settings
        </h2>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Profile Card */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1" data-testid="text-profile-name">
              {user.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-profile-phone">
              {user.phone}
            </p>
            
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {user.rating || "4.9"}
                </p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {user.response_count || "24"}
                </p>
                <p className="text-xs text-muted-foreground">Responses</p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {user.created_at ? Math.ceil((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : "89"}
                </p>
                <p className="text-xs text-muted-foreground">Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Emergency Contacts</CardTitle>
            <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setEditingContact(null);
                    form.reset();
                  }}
                  data-testid="button-add-contact"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingContact !== null ? "Edit Contact" : "Add Emergency Contact"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmitContact)} className="space-y-4">
                  <div>
                    <Label htmlFor="contact-name">Contact Name</Label>
                    <Input
                      id="contact-name"
                      placeholder="e.g., Father, Friend"
                      data-testid="input-contact-name"
                      {...form.register("name")}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="contact-phone">Phone Number</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                        +92
                      </span>
                      <Input
                        id="contact-phone"
                        type="tel"
                        placeholder="300 1234567"
                        className="pl-12"
                        data-testid="input-contact-phone"
                        {...form.register("phone")}
                      />
                    </div>
                    {form.formState.errors.phone && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      type="submit" 
                      disabled={updateContactsMutation.isPending}
                      data-testid="button-save-contact"
                    >
                      {updateContactsMutation.isPending ? "Saving..." : "Save Contact"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowAddContact(false)}
                      data-testid="button-cancel-contact"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          
          <CardContent className="p-0">
            {emergencyContacts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Phone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No emergency contacts added yet</p>
                <p className="text-xs">Add contacts to receive SMS alerts during emergencies</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {emergencyContacts.map((contact: any, index: number) => (
                  <div 
                    key={index}
                    className="px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    data-testid={`contact-item-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-secondary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {contact.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditContact(index)}
                        data-testid={`button-edit-contact-${index}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContact(index)}
                        data-testid={`button-delete-contact-${index}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Menu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <button 
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                data-testid="button-notifications-settings"
              >
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Notifications</span>
                </div>
                <span className="text-muted-foreground">›</span>
              </button>

              <button 
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                data-testid="button-location-settings"
              >
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Location Permissions</span>
                </div>
                <span className="text-muted-foreground">›</span>
              </button>

              <button 
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                data-testid="button-privacy-settings"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Privacy & Security</span>
                </div>
                <span className="text-muted-foreground">›</span>
              </button>

              <button 
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                data-testid="button-help-settings"
              >
                <div className="flex items-center space-x-3">
                  <Info className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">About & Help</span>
                </div>
                <span className="text-muted-foreground">›</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>

        {/* App Info */}
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold text-sm mb-1">Bachaoo Emergency Network</h3>
            <p className="text-xs text-muted-foreground">
              Version 1.0.0 • Your safety is our priority
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
