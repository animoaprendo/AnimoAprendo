"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Check, 
  X, 
  Clock, 
  User, 
  Calendar, 
  MapPin, 
  BookOpen, 
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { getCollectionData, fetchUsers } from "@/app/actions";
import { approveOffer, rejectOffer } from "@/app/admin/actions";

type Availability = {
  id: string;
  day: string;
  start: string;
  end: string;
};

type PendingOffer = {
  _id: string;
  userId: string;
  subject: string;
  description: string;
  availability: Availability[];
  banner?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type UserData = {
  id: string;
  firstName?: string;
  lastName?: string;
  emailAddresses?: Array<{ emailAddress: string }>;
  imageUrl?: string;
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function OfferApprovalsPage() {
  const [pendingOffers, setPendingOffers] = useState<PendingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [usersData, setUsersData] = useState<Record<string, UserData>>({});

  const fetchPendingOffers = async () => {
    try {
      setLoading(true);
      
      // Fetch subjects using your action
      const result = await getCollectionData("subjects");
      const pendingOffers = result?.data?.filter((offer: any) => offer.status === "pending") || [];
      
      setPendingOffers(pendingOffers);
        
      // Fetch user data for all unique user IDs
      const userIds = [...new Set(pendingOffers.map((offer: PendingOffer) => offer.userId))] as string[];
      await fetchUsersData(userIds);
    } catch (error) {
      console.error("Error fetching pending offers:", error);
      toast.error("Error loading pending offers");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersData = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    try {
      // Use the existing fetchUsers function to get specific users
      const usersResult = await fetchUsers(userIds);
      
      if (!usersResult.success || !usersResult.data?.users) {
        console.error("Error fetching users:", usersResult.error);
        toast.error("Error loading user data");
        return;
      }
      
      const userData: Record<string, UserData> = {};
      const fetchedUsers = usersResult.data.users;
      
      userIds.forEach(userId => {
        // Find user by their ID
        const user = fetchedUsers.find((u: any) => u.id === userId);
        
        if (user) {
          userData[userId] = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            emailAddresses: user.emailAddresses || [{ emailAddress: user.email }],
            imageUrl: user.imageUrl
          };
        } else {
          // Fallback for users not found
          userData[userId] = {
            id: userId,
            firstName: "Unknown",
            lastName: "User",
            emailAddresses: [{ emailAddress: "unknown@example.com" }],
            imageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`
          };
        }
      });
      
      setUsersData(userData);
    } catch (error) {
      console.error("Error fetching users data:", error);
      toast.error("Error loading user data");
    }
  };

  const handleApprove = async (offerId: string) => {
    try {
      setProcessingId(offerId);
      const result = await approveOffer(offerId);
      
      if (result.success) {
        toast.success("Offer approved successfully!");
        setPendingOffers(prev => prev.filter(offer => offer._id !== offerId));
      } else {
        toast.error("Failed to approve offer");
      }
    } catch (error) {
      console.error("Error approving offer:", error);
      toast.error("Error approving offer");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (offerId: string) => {
    try {
      setProcessingId(offerId);
      const result = await rejectOffer(offerId);
      
      if (result.success) {
        toast.success("Offer rejected successfully!");
        setPendingOffers(prev => prev.filter(offer => offer._id !== offerId));
      } else {
        toast.error("Failed to reject offer");
      }
    } catch (error) {
      console.error("Error rejecting offer:", error);
      toast.error("Error rejecting offer");
    } finally {
      setProcessingId(null);
    }
  };

  const formatAvailability = (availability: Availability[]) => {
    const grouped = availability.reduce((acc, slot) => {
      if (!acc[slot.day]) {
        acc[slot.day] = [];
      }
      acc[slot.day].push(`${slot.start}-${slot.end}`);
      return acc;
    }, {} as Record<string, string[]>);

    return DAYS_ORDER
      .filter(day => grouped[day])
      .map(day => `${day}: ${grouped[day].join(', ')}`)
      .join(' | ');
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  useEffect(() => {
    fetchPendingOffers();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-lg font-medium">Loading pending offers...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offer Approvals</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve pending tutor offers
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-sm">
            <Clock className="w-4 h-4 mr-1" />
            {pendingOffers.length} pending
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPendingOffers}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Separator />

      {/* Content */}
      {pendingOffers.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Pending Offers</h3>
          <p className="text-muted-foreground max-w-md">
            There are currently no offers waiting for approval. Check back later or refresh the page.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {pendingOffers.map((offer) => {
            const user = usersData[offer.userId];
            return (
              <Card key={offer._id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user?.imageUrl} />
                        <AvatarFallback>
                          <User className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
                        </CardTitle>
                        <CardDescription>
                          {user?.emailAddresses?.[0]?.emailAddress || offer.userId}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Offer Banner */}
                  {offer.banner && (
                    <div className="relative h-48 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={offer.banner}
                        alt="Offer banner"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Subject Info */}
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">{offer.subject}</span>
                  </div>
                  
                  {/* Description */}
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {stripHtml(offer.description) || 'No description provided'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Availability */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Available Times
                    </h4>
                    <ScrollArea className="h-24">
                      <div className="space-y-2">
                        {offer.availability.map((slot) => (
                          <div key={slot.id} className="flex items-center justify-between bg-muted/50 p-2 rounded text-sm">
                            <span className="font-medium">{slot.day}</span>
                            <span className="text-muted-foreground">{slot.start} - {slot.end}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {/* Timestamps */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Submitted: {new Date(offer.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(offer.updatedAt).toLocaleDateString()}</span>
                  </div>
                  
                  <Separator />
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => handleReject(offer._id)}
                      disabled={processingId === offer._id}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                    >
                      {processingId === offer._id ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <X className="w-4 h-4 mr-2" />
                      )}
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(offer._id)}
                      disabled={processingId === offer._id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processingId === offer._id ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}