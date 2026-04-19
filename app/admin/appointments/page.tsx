"use client";

import { cancelAppointment, getCollectionData } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Calendar, ChevronDown, ChevronUp, Clock, MapPin, RotateCcw, Search, Users, Video, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export type Appointment = {
  _id: string;
  messageId?: string;
  tutorId: string;
  tuteeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  appointmentType?: 'single' | 'recurring';
  datetimeISO: string;
  endDate?: string;
  dates?: string[]; // New format: array of date strings (YYYY-MM-DD)
  selectedDates?: string[]; // For recurring appointments
  durationMinutes?: number;
  mode: 'online' | 'in-person';
  subject?: string;
  offeringId?: string;
  quiz?: any[];
  quizAttempts?: any[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  tutorName?: string;
  tuteeName?: string;
  tutorCollege?: string;
  tutorDepartment?: string;
  tuteeCollege?: string;
  tuteeDepartment?: string;
};

type SortField = 'datetimeISO' | 'status' | 'mode' | 'subject' | 'tutorName' | 'tuteeName' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export default function AdminAppointments() {
  const { user } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // today, tomorrow, week, month
  const [sortField, setSortField] = useState<SortField>('datetimeISO');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is superadmin
  const isSuperAdmin = user?.publicMetadata?.isAdmin === true && user?.publicMetadata?.adminRole === "superadmin";
  const userCollege = user?.publicMetadata?.college as string | undefined;
  const userDepartment = user?.publicMetadata?.department as string | undefined;

  useEffect(() => {
    if (user?.publicMetadata?.isAdmin) {
      fetchAppointments();
    }
  }, [user, isSuperAdmin, userCollege, userDepartment]);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const [appointmentsData, usersData] = await Promise.all([
        getCollectionData("appointments"),
        getCollectionData("users")
      ]);

      console.log(appointmentsData, usersData);
      if (appointmentsData.success) {
        let filteredAppointments = appointmentsData.data;

        // Apply admin role-based filtering
        if (!isSuperAdmin && (userCollege || userDepartment)) {
          filteredAppointments = appointmentsData.data.filter((apt: any) => {
            const tutor = usersData.data?.find((u: any) => u.id === apt.tutorId);
            const tutee = usersData.data?.find((u: any) => u.id === apt.tuteeId);
            
            // Check if either tutor or tutee belongs to admin's college/department
            const tutorCollegeInfo = tutor?.public_metadata?.collegeInformation;
            const tuteeCollegeInfo = tutee?.public_metadata?.collegeInformation;
            
            const isUserInScope = (userInfo: any) => {
              if (!userInfo) return false;
              
              // If admin has a specific college, check if user is from that college
              if (userCollege && userInfo.college !== userCollege) {
                return false;
              }
              
              // If admin has a specific department (not ALL_DEPARTMENTS), check department
              if (userDepartment && userDepartment !== 'ALL_DEPARTMENTS' && userInfo.department !== userDepartment) {
                return false;
              }
              
              return true;
            };
            
            // Include appointment if either tutor or tutee is in admin's scope
            return isUserInScope(tutorCollegeInfo) || isUserInScope(tuteeCollegeInfo);
          });
        }

        const appointmentsWithNames = filteredAppointments.map((apt: any) => {
          const tutor = usersData.data?.find((u: any) => u.id === apt.tutorId);
          const tutee = usersData.data?.find((u: any) => u.id === apt.tuteeId);
          
          return {
            ...apt,
            tutorName: tutor ? `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim() || tutor.username || 'Unknown Tutor' : 'Unknown Tutor',
            tuteeName: tutee ? `${tutee.firstName || ''} ${tutee.lastName || ''}`.trim() || tutee.username || 'Unknown Tutee' : 'Unknown Tutee',
            tutorCollege: tutor?.publicMetadata?.collegeInformation?.college,
            tutorDepartment: tutor?.publicMetadata?.collegeInformation?.department,
            tuteeCollege: tutee?.publicMetadata?.collegeInformation?.college,
            tuteeDepartment: tutee?.publicMetadata?.collegeInformation?.department
          };
        });
        
        setAppointments(appointmentsWithNames);
      }
      
      if (usersData.success) {
        setUsers(usersData.data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }

  function handleViewAppointment(appointment: Appointment) {
    setSelectedAppointment(appointment);
    setIsViewDialogOpen(true);
  }

  function handleCancelAppointment(appointment: Appointment) {
    setSelectedAppointment(appointment);
    setIsCancelDialogOpen(true);
  }

  async function confirmCancelAppointment() {
    if (!selectedAppointment) return;

    try {
      const result = await cancelAppointment({
        messageId: selectedAppointment.messageId || selectedAppointment._id,
        appointmentId: selectedAppointment._id
      });

      if (result.success) {
        toast.success('Appointment cancelled successfully');
        setIsCancelDialogOpen(false);
        setSelectedAppointment(null);
        fetchAppointments(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel appointment');
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("");
    setModeFilter("");
    setDateFilter("");
    setSortField('datetimeISO');
    setSortOrder('desc');
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  }

  // Security check - only admins can access this page
  if (!user) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user.publicMetadata?.isAdmin) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-red-600 font-medium">Access Denied</div>
            <div className="text-muted-foreground mt-2">You do not have permission to access this page.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function getDateFilteredAppointments(appointments: Appointment[]) {
    if (!dateFilter) return appointments;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const monthFromNow = new Date(today);
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);

    return appointments.filter(apt => {
      // Use new format (dates array) if available, otherwise fall back to datetimeISO
      const appointmentDates = apt.dates && apt.dates.length > 0 
        ? apt.dates.map(d => new Date(`${d}T00:00:00`))
        : [new Date(apt.datetimeISO)];
      
      // Check if any date in the appointment matches the filter
      return appointmentDates.some(appointmentDate => {
        switch (dateFilter) {
          case 'today':
            return appointmentDate >= today && appointmentDate < tomorrow;
          case 'tomorrow':
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
            return appointmentDate >= tomorrow && appointmentDate < dayAfterTomorrow;
          case 'week':
            return appointmentDate >= today && appointmentDate <= weekFromNow;
          case 'month':
            return appointmentDate >= today && appointmentDate <= monthFromNow;
          default:
            return true;
        }
      });
    });
  }

  // Filter and sort appointments
  const filteredAndSortedAppointments = getDateFilteredAppointments(
    appointments.filter(appointment => {
      const matchesSearch = 
        (appointment.tutorName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (appointment.tuteeName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (appointment.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
      const matchesStatus = !statusFilter || appointment.status === statusFilter;
      const matchesMode = !modeFilter || appointment.mode === modeFilter;
      
      return matchesSearch && matchesStatus && matchesMode;
    })
  ).sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    if (sortField === 'datetimeISO') {
      // For date sorting, use the first date from the new format if available
      const aDate = a.dates && a.dates.length > 0 ? new Date(a.dates[0]).getTime() : new Date(a.datetimeISO).getTime();
      const bDate = b.dates && b.dates.length > 0 ? new Date(b.dates[0]).getTime() : new Date(b.datetimeISO).getTime();
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    } else if (sortField === 'createdAt' || sortField === 'updatedAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Statistics
  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    accepted: appointments.filter(a => a.status === 'accepted').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  const uniqueStatuses = ['pending', 'accepted', 'declined', 'completed', 'cancelled'];
  const uniqueModes = ['online', 'in-person'];
  const getModeLabel = (mode: string) => (mode === 'online' ? 'Online' : 'Onsite');
  
  // Helper function to get the first date of an appointment
  const getFirstDate = (appointment: Appointment): Date => {
    if (appointment.dates && appointment.dates.length > 0) {
      return new Date(`${appointment.dates[0]}T00:00:00`);
    }
    return new Date(appointment.datetimeISO);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Appointment Management
          </CardTitle>
          <CardDescription>
            Monitor and manage all tutoring appointments in the system
            {!isSuperAdmin && userCollege && (
              <span className="block mt-1 text-blue-600">
                Viewing appointments for {userCollege}
                {userDepartment && userDepartment !== 'ALL_DEPARTMENTS' ? ` - ${userDepartment} department` : ' - All departments'}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-800">{stats.total}</div>
                <div className="text-blue-600 text-sm">Total</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
                <div className="text-yellow-600 text-sm">Pending</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-800">{stats.accepted}</div>
                <div className="text-green-600 text-sm">Active</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-800">{stats.completed}</div>
                <div className="text-purple-600 text-sm">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-800">{stats.cancelled}</div>
                <div className="text-red-600 text-sm">Cancelled</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by tutor, tutee, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 lg:flex-nowrap">
              <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value || "")}>
                <SelectTrigger className="w-full lg:w-[140px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={modeFilter || undefined} onValueChange={(value) => setModeFilter(value || "")}>
                <SelectTrigger className="w-full lg:w-[130px]">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {getModeLabel(mode)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter || undefined} onValueChange={(value) => setDateFilter(value || "")}>
                <SelectTrigger className="w-full lg:w-[130px]">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters} size="icon">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || statusFilter || modeFilter || dateFilter) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary">Search: {searchTerm}</Badge>
              )}
              {statusFilter && (
                <Badge variant="secondary">Status: {statusFilter}</Badge>
              )}
              {modeFilter && (
                <Badge variant="secondary">Mode: {modeFilter}</Badge>
              )}
              {dateFilter && (
                <Badge variant="secondary">Date: {dateFilter}</Badge>
              )}
            </div>
          )}

          {/* Appointments Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableCaption className="text-center py-4">
                Showing {filteredAndSortedAppointments.length} of {appointments.length} appointments
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('tuteeName')}
                  >
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Tutee
                      {getSortIcon('tuteeName')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('tutorName')}
                  >
                    <div className="flex items-center gap-1">
                      Tutor
                      {getSortIcon('tutorName')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('subject')}
                  >
                    <div className="flex items-center gap-1">
                      Subject
                      {getSortIcon('subject')}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Type
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('datetimeISO')}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Date & Time
                      {getSortIcon('datetimeISO')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('mode')}
                  >
                    <div className="flex items-center gap-1">
                      Mode
                      {getSortIcon('mode')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No appointments found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedAppointments.map((appointment: Appointment) => (
                    <TableRow key={appointment._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {appointment.tuteeName}
                      </TableCell>
                      <TableCell>
                        {appointment.tutorName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {appointment.subject || 'No Subject'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={appointment.appointmentType === 'recurring' ? 'secondary' : 'outline'}
                          className={appointment.appointmentType === 'recurring' ? 'bg-purple-100 text-purple-800' : ''}
                        >
                          {appointment.appointmentType === 'recurring' ? 'Recurring' : 'Single'}
                          {appointment.appointmentType === 'recurring' && appointment.dates && (
                            <span className="ml-1">({appointment.dates.length})</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {appointment.appointmentType === 'recurring' && appointment.dates && appointment.dates.length > 0 ? (
                            <>
                              <div className="font-medium text-sm">
                                {appointment.dates.length} dates
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <div>{appointment.dates[0]} (first)</div>
                                {appointment.dates.length > 1 && (
                                  <div>{appointment.dates[appointment.dates.length - 1]} (last)</div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-medium">
                                {appointment.dates && appointment.dates.length > 0 
                                  ? appointment.dates[0]
                                  : new Date(appointment.datetimeISO).toLocaleDateString()
                                }
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(appointment.datetimeISO).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {appointment.mode === 'online' ? (
                            <Video className="w-4 h-4 text-green-600" />
                          ) : (
                            <MapPin className="w-4 h-4 text-blue-600" />
                          )}
                          <span className="text-sm">
                            {getModeLabel(appointment.mode)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            appointment.status === 'pending' ? 'secondary' :
                            appointment.status === 'accepted' ? 'default' :
                            appointment.status === 'declined' ? 'destructive' :
                            appointment.status === 'completed' ? 'secondary' :
                            appointment.status === 'cancelled' ? 'destructive' : 'secondary'
                          }
                          className={
                            appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                            appointment.status === 'accepted' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                            appointment.status === 'declined' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                            appointment.status === 'completed' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                            appointment.status === 'cancelled' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewAppointment(appointment)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            View
                          </Button>
                          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCancelAppointment(appointment)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Appointment Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointment Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about this appointment
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              {/* Participants */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Tutee</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedAppointment.tuteeName}</p>
                    <p className="text-[0.6rem] -mx-4 md:mx-0 md:text-[0.65rem] text-muted-foreground">{selectedAppointment.tuteeId}</p>
                    {((selectedAppointment as any).tuteeCollege || (selectedAppointment as any).tuteeDepartment) && (
                      <div className="mt-2 space-y-1">
                        {(selectedAppointment as any).tuteeCollege && (
                          <Badge variant="outline" className="text-xs">{(selectedAppointment as any).tuteeCollege}</Badge>
                        )}
                        {(selectedAppointment as any).tuteeDepartment && (
                          <Badge variant="secondary" className="text-xs">{(selectedAppointment as any).tuteeDepartment}</Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Tutor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedAppointment.tutorName}</p>
                    <p className="text-[0.6rem] -mx-4 md:mx-0 md:text-[0.65rem] text-muted-foreground">{selectedAppointment.tutorId}</p>
                    {((selectedAppointment as any).tutorCollege || (selectedAppointment as any).tutorDepartment) && (
                      <div className="mt-2 space-y-1">
                        {(selectedAppointment as any).tutorCollege && (
                          <Badge variant="outline" className="text-xs">{(selectedAppointment as any).tutorCollege}</Badge>
                        )}
                        {(selectedAppointment as any).tutorDepartment && (
                          <Badge variant="secondary" className="text-xs">{(selectedAppointment as any).tutorDepartment}</Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Appointment Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Subject</h4>
                    <Badge variant="outline">{selectedAppointment.subject || 'No Subject'}</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Type</h4>
                    <Badge 
                      variant={selectedAppointment.appointmentType === 'recurring' ? 'secondary' : 'outline'}
                      className={selectedAppointment.appointmentType === 'recurring' ? 'bg-purple-100 text-purple-800' : ''}
                    >
                      {selectedAppointment.appointmentType === 'recurring' ? 'Recurring' : 'Single'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Mode</h4>
                    <div className="flex items-center gap-2">
                      {selectedAppointment.mode === 'online' ? (
                        <Video className="w-4 h-4 text-green-600" />
                      ) : (
                        <MapPin className="w-4 h-4 text-blue-600" />
                      )}
                      <span>{getModeLabel(selectedAppointment.mode)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Date & Time</h4>
                    {selectedAppointment.appointmentType === 'recurring' && selectedAppointment.dates && selectedAppointment.dates.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{selectedAppointment.dates.length} Scheduled Dates</p>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {selectedAppointment.dates.map((date, index) => (
                            <p key={index} className="text-sm text-muted-foreground">
                              {new Date(`${date}T00:00:00`).toLocaleDateString()}
                            </p>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Time: {new Date(selectedAppointment.datetimeISO).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    ) : (
                      <>
                        <p>{selectedAppointment.dates && selectedAppointment.dates.length > 0 
                          ? new Date(`${selectedAppointment.dates[0]}T00:00:00`).toLocaleDateString()
                          : new Date(selectedAppointment.datetimeISO).toLocaleDateString()
                        }</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(selectedAppointment.datetimeISO).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Appointment Type</h4>
                    <Badge 
                      variant={selectedAppointment.appointmentType === 'recurring' ? 'secondary' : 'outline'}
                      className={selectedAppointment.appointmentType === 'recurring' ? 'bg-purple-100 text-purple-800' : ''}
                    >
                      {selectedAppointment.appointmentType === 'recurring' ? `Recurring (${selectedAppointment.dates?.length || 0} dates)` : 'Single'}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Status</h4>
                    <Badge 
                      variant={
                        selectedAppointment.status === 'pending' ? 'secondary' :
                        selectedAppointment.status === 'accepted' ? 'default' :
                        selectedAppointment.status === 'declined' ? 'destructive' :
                        selectedAppointment.status === 'completed' ? 'secondary' :
                        selectedAppointment.status === 'cancelled' ? 'destructive' : 'secondary'
                      }
                    >
                      {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {selectedAppointment.quiz && selectedAppointment.quiz.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Quiz</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.quiz.length} question(s) assigned
                    </p>
                    {selectedAppointment.quizAttempts && selectedAppointment.quizAttempts.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedAppointment.quizAttempts.length} attempt(s) completed
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <p><strong>Created:</strong> {new Date(selectedAppointment.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p><strong>Updated:</strong> {new Date(selectedAppointment.updatedAt).toLocaleString()}</p>
                  </div>
                </div>

                {selectedAppointment.status === 'completed' && selectedAppointment.completedAt && (
                  <div className="text-sm text-muted-foreground">
                    <p><strong>Completed At:</strong> {new Date(selectedAppointment.completedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'completed' && (
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      handleCancelAppointment(selectedAppointment);
                    }}
                  >
                    Cancel Appointment
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cancel Appointment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div>
                    <p><strong>Tutee:</strong> {selectedAppointment.tuteeName}</p>
                    <p><strong>Tutor:</strong> {selectedAppointment.tutorName}</p>
                    <p><strong>Subject:</strong> {selectedAppointment.subject || 'No Subject'}</p>
                    <p><strong>Type:</strong> {selectedAppointment.appointmentType === 'recurring' ? 'Recurring' : 'Single'}</p>
                    {selectedAppointment.appointmentType === 'recurring' && selectedAppointment.dates && selectedAppointment.dates.length > 0 ? (
                      <>
                        <p><strong>Dates:</strong> {selectedAppointment.dates.length} scheduled dates</p>
                        <p className="text-sm text-muted-foreground">{selectedAppointment.dates[0]} to {selectedAppointment.dates[selectedAppointment.dates.length - 1]}</p>
                      </>
                    ) : (
                      <p><strong>Date:</strong> {selectedAppointment.dates && selectedAppointment.dates.length > 0 
                        ? new Date(`${selectedAppointment.dates[0]}T00:00:00`).toLocaleString()
                        : new Date(selectedAppointment.datetimeISO).toLocaleString()
                      }</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
            >
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelAppointment}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel Appointment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
