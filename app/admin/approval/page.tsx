"use client";

import { fetchUsers, getCollectionData } from "@/app/actions";
import { approveOffer, rejectOffer } from "@/app/admin/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  Clock,
  RefreshCw,
  User,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

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
  collegeInformation?: {
    college?: string;
    department?: string;
    yearLevel?: number;
    section?: string;
  };
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function OfferApprovalsPage() {
  const { user } = useUser();
  const [pendingOffers, setPendingOffers] = useState<PendingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [usersData, setUsersData] = useState<Record<string, UserData>>({});

  // Check if user is superadmin
  const isSuperAdmin = user?.publicMetadata?.isAdmin === true && user?.publicMetadata?.adminRole === "superadmin";
  const userCollege = user?.publicMetadata?.college as string | undefined;
  const userDepartment = user?.publicMetadata?.department as string | undefined;

  const fetchPendingOffers = async () => {
    try {
      setLoading(true);
      
      // Fetch subjects using your action
      const result = await getCollectionData("subjects");
      let pendingOffers = result?.data?.filter((offer: any) => offer.status === "pending") || [];
      
      // Apply admin role-based filtering
      if (!isSuperAdmin && (userCollege || userDepartment)) {
        // First get all user data to check college/department
        const allUserIds = [...new Set(pendingOffers.map((offer: PendingOffer) => offer.userId))] as string[];
        const tempUsersResult = await fetchUsers(allUserIds);
        
        if (tempUsersResult.success && tempUsersResult.data?.users) {
          const fetchedUsers = tempUsersResult.data.users;
          
          pendingOffers = pendingOffers.filter((offer: PendingOffer) => {
            const offerUser = fetchedUsers.find((u: any) => u.id === offer.userId);
            if (!offerUser) return false;
            console.log(offerUser);
            
            const userCollegeInfo = offerUser.collegeInformation;
            console.log(userCollegeInfo);
            if (!userCollegeInfo) return false;
            
            // If admin has a specific college, check if user is from that college
            if (userCollege && userCollegeInfo.college !== userCollege) {
              return false;
            }
            
            // If admin has a specific department (not ALL_DEPARTMENTS), check department
            if (userDepartment && userDepartment !== 'ALL_DEPARTMENTS' && userCollegeInfo.department !== userDepartment) {
              return false;
            }
            
            return true;
          });
        }
      }
      
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
            imageUrl: user.imageUrl,
            collegeInformation: user.public_metadata?.collegeInformation
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
    if (user?.publicMetadata?.isAdmin) {
      fetchPendingOffers();
    }
  }, [user, isSuperAdmin, userCollege, userDepartment]);

  // Security check - only admins can access this page
  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user.publicMetadata?.isAdmin) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-600 font-medium">Access Denied</div>
            <div className="text-muted-foreground mt-2">You do not have permission to access this page.</div>
          </div>
        </div>
      </div>
    );
  }

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
            {!isSuperAdmin && userCollege && (
              <span className="block mt-1 text-blue-600">
                Viewing offers from {userCollege}
                {userDepartment && userDepartment !== 'ALL_DEPARTMENTS' ? ` - ${userDepartment} department` : ' - All departments'}
              </span>
            )}
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
                          <div>{user?.emailAddresses?.[0]?.emailAddress || offer.userId}</div>
                          {user?.collegeInformation && (
                            <div className="flex gap-1 mt-1">
                              {user.collegeInformation.college && (
                                <Badge variant="outline" className="text-xs">
                                  {user.collegeInformation.college}
                                </Badge>
                              )}
                              {user.collegeInformation.department && (
                                <Badge variant="secondary" className="text-xs">
                                  {user.collegeInformation.department}
                                </Badge>
                              )}
                            </div>
                          )}
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