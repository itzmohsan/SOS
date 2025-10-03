import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Upload, User } from "lucide-react";

const registrationSchema = z.object({
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[0-9+\s-]+$/, "Please enter a valid phone number"),
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  profile_photo: z.string().optional(),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

interface RegistrationModalProps {
  onUserRegistered: (user: any) => void;
}

export default function RegistrationModal({ onUserRegistered }: RegistrationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string>("");
  const { toast } = useToast();
  const { getCurrentPosition, latitude, longitude } = useGeolocation();

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      phone: "",
      name: "",
      profile_photo: "",
    },
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfilePhoto(base64String);
        form.setValue("profile_photo", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name: string) => {
    const names = name.trim().split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const onSubmit = async (data: RegistrationForm) => {
    setIsSubmitting(true);

    try {
      await getCurrentPosition();

      const formattedPhone = data.phone.startsWith('+92') 
        ? data.phone 
        : `+92${data.phone.replace(/^0/, '')}`;

      const userData = {
        phone: formattedPhone,
        name: data.name,
        profile_photo: data.profile_photo || undefined,
        location: latitude && longitude ? {
          lat: latitude,
          lng: longitude,
          last_updated: new Date().toISOString(),
        } : undefined,
      };

      const response = await apiRequest("POST", "/api/users/register", userData);
      const result = await response.json();

      onUserRegistered(result.user);

      toast({
        title: "Registration Successful!",
        description: "Welcome to Bachaoo Emergency Network",
      });

    } catch (error) {
      console.error("Registration failed:", error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedName = form.watch("name");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl" data-testid="text-registration-title">
            Join Bachaoo Network
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Create your emergency safety profile
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Profile Photo */}
            <div className="flex flex-col items-center">
              <Avatar className="w-24 h-24 mb-3">
                <AvatarImage src={profilePhoto} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {watchedName ? getInitials(watchedName) : <User className="w-10 h-10" />}
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Upload className="w-4 h-4" />
                  {profilePhoto ? "Change Photo" : "Upload Photo (Optional)"}
                </div>
              </Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
            </div>

            {/* Phone Number */}
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                  +92
                </span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="300 1234567"
                  className="pl-12"
                  data-testid="input-phone"
                  {...form.register("phone")}
                />
              </div>
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                className="mt-1"
                data-testid="input-name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Register Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              data-testid="button-register"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
