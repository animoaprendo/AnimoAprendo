"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ChevronDown, ChevronUp, Crown, RotateCcw, Search, Shield, ShieldCheck, Users, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getCollectionData } from "@/app/actions";
import { createAdmin, updateAdminRole, removeAdmin, getAdmins } from "@/app/admin/actions";

export type Admin = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  imageUrl?: string;
  adminRole: 'admin' | 'superadmin';
  college?: string;
  department?: string;
  createdAt: number;
  lastSignInAt?: number;
};

export type College = {
  _id: { $oid: string };
  name: string;
  abbreviation: string;
  departments: Array<{
    name: string;
    yearLevel: number[];
  }>;
};

export type RegularUser = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  imageUrl?: string;
  publicMetadata?: any;
};

type SortField = 'email' | 'firstName' | 'lastName' | 'adminRole' | 'college' | 'department' | 'createdAt' | 'lastSignInAt';
type SortOrder = 'asc' | 'desc';

export default function AdminManagement() {
  const { user } = useUser();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [users, setUsers] = useState<RegularUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);

  // Form states
  const [createForm, setCreateForm] = useState({
    userId: '',
    adminRole: 'admin' as 'admin',
    college: '',
    department: ''
  });

  // User search state
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const [editForm, setEditForm] = useState({
    adminRole: 'admin' as 'admin' | 'superadmin',
    college: '',
    department: ''
  });

  // Check if current user is superadmin
  const isSuperAdmin = user?.publicMetadata?.isAdmin === true && user?.publicMetadata?.adminRole === "superadmin";

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  async function fetchData() {
    try {
      setLoading(true);
      const [adminsData, collegesData, usersData] = await Promise.all([
        getAdmins(),
        getCollectionData("colleges"),
        getCollectionData("users")
      ]);

      if (adminsData.success && adminsData.admins) {
        setAdmins(adminsData.admins);
      }

      if (collegesData?.success) {
        setColleges(collegesData.data || []);
      }

      if (usersData?.success) {
        // Filter out users who are already admins
        const nonAdminUsers = usersData.data?.filter((userData: any) => {
          const metadata = userData.publicMetadata || {};
          return !metadata.isAdmin;
        }) || [];
        setUsers(nonAdminUsers);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  function handleCreateAdmin() {
    setCreateForm({
      userId: '',
      adminRole: 'admin',
      college: '',
      department: ''
    });
    setUserSearchTerm("");
    setIsCreateDialogOpen(true);
  }

  function handleEditAdmin(admin: Admin) {
    setSelectedAdmin(admin);
    setEditForm({
      adminRole: admin.adminRole,
      college: admin.college || '',
      department: admin.department || ''
    });
    setIsEditDialogOpen(true);
  }

  function handleRemoveAdmin(admin: Admin) {
    setSelectedAdmin(admin);
    setIsRemoveDialogOpen(true);
  }

  function handleViewAdmin(admin: Admin) {
    setSelectedAdmin(admin);
    setIsViewDialogOpen(true);
  }

  async function confirmCreateAdmin() {
    if (!createForm.userId) {
      toast.error('Please select a user');
      return;
    }

    try {
      const result = await createAdmin({
        userId: createForm.userId,
        adminRole: createForm.adminRole,
        college: createForm.college || undefined,
        department: createForm.department || undefined
      });

      if (result.success) {
        toast.success('Admin created successfully');
        setIsCreateDialogOpen(false);
        fetchData(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to create admin');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create admin');
    }
  }

  async function confirmEditAdmin() {
    if (!selectedAdmin) return;

    try {
      const result = await updateAdminRole({
        userId: selectedAdmin.id,
        adminRole: editForm.adminRole,
        college: editForm.college || undefined,
        department: editForm.department || undefined
      });

      if (result.success) {
        toast.success('Admin updated successfully');
        setIsEditDialogOpen(false);
        setSelectedAdmin(null);
        fetchData(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to update admin');
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update admin');
    }
  }

  async function confirmRemoveAdmin() {
    if (!selectedAdmin) return;

    try {
      const result = await removeAdmin(selectedAdmin.id);

      if (result.success) {
        toast.success('Admin removed successfully');
        setIsRemoveDialogOpen(false);
        setSelectedAdmin(null);
        fetchData(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to remove admin');
      }
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove admin');
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
    setRoleFilter("");
    setCollegeFilter("");
    setSortField('createdAt');
    setSortOrder('desc');
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  }

  // Filter and sort admins
  const filteredAndSortedAdmins = admins
    .filter(admin => {
      const matchesSearch = 
        admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.username?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = !roleFilter || admin.adminRole === roleFilter;
      const matchesCollege = !collegeFilter || admin.college === collegeFilter;
      
      return matchesSearch && matchesRole && matchesCollege;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'createdAt' || sortField === 'lastSignInAt') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
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
    total: admins.length,
    superadmins: admins.filter(a => a.adminRole === 'superadmin').length,
    regularAdmins: admins.filter(a => a.adminRole === 'admin').length,
  };

  // Get departments for selected college in create form
  const createFormDepartments = colleges.find(c => c.abbreviation === createForm.college)?.departments || [];
  const editFormDepartments = colleges.find(c => c.abbreviation === editForm.college)?.departments || [];

  // Filter users for create dialog based on search
  const filteredUsers = users.filter(userData => {
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.toLowerCase();
    const email = userData.email?.toLowerCase() || '';
    const username = userData.username?.toLowerCase() || '';
    const searchLower = userSearchTerm.toLowerCase();
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           username.includes(searchLower);
  }).slice(0, 50); // Limit to first 50 results for performance

  // Access control
  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need superadmin privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
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
            <Crown className="w-6 h-6" />
            Admin Management
          </CardTitle>
          <CardDescription>
            Manage administrator accounts and permissions (Superadmin Only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-800">{stats.total}</div>
                <div className="text-blue-600 text-sm">Total Admins</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-800">{stats.superadmins}</div>
                <div className="text-purple-600 text-sm">Superadmins</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-800">{stats.regularAdmins}</div>
                <div className="text-green-600 text-sm">Regular Admins</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 lg:flex-nowrap">
              <Select value={roleFilter || undefined} onValueChange={(value) => setRoleFilter(value || "")}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={collegeFilter || undefined} onValueChange={(value) => setCollegeFilter(value || "")}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="All Colleges" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((college) => (
                    <SelectItem key={college._id.$oid} value={college.abbreviation}>
                      {college.abbreviation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters} size="icon">
                <RotateCcw className="w-4 h-4" />
              </Button>

              <Button onClick={handleCreateAdmin} className="whitespace-nowrap">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Admin
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || roleFilter || collegeFilter) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary">Search: {searchTerm}</Badge>
              )}
              {roleFilter && (
                <Badge variant="secondary">Role: {roleFilter}</Badge>
              )}
              {collegeFilter && (
                <Badge variant="secondary">College: {collegeFilter}</Badge>
              )}
            </div>
          )}

          {/* Admins Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableCaption className="text-center py-4">
                Showing {filteredAndSortedAdmins.length} of {admins.length} administrators
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Name
                      {getSortIcon('firstName')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-1">
                      Email
                      {getSortIcon('email')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('adminRole')}
                  >
                    <div className="flex items-center gap-1">
                      Role
                      {getSortIcon('adminRole')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('college')}
                  >
                    <div className="flex items-center gap-1">
                      College
                      {getSortIcon('college')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('department')}
                  >
                    <div className="flex items-center gap-1">
                      Department
                      {getSortIcon('department')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {getSortIcon('createdAt')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedAdmins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No administrators found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedAdmins.map((admin: Admin) => (
                    <TableRow key={admin.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {admin.imageUrl && (
                            <img
                              src={admin.imageUrl}
                              alt={`${admin.firstName} ${admin.lastName}`}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <div>{admin.firstName} {admin.lastName}</div>
                            {admin.username && (
                              <div className="text-sm text-muted-foreground">@{admin.username}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {admin.adminRole === 'superadmin' ? (
                            <Crown className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <Shield className="w-4 h-4 text-blue-600" />
                          )}
                          <Badge 
                            variant={admin.adminRole === 'superadmin' ? 'default' : 'secondary'}
                            className={
                              admin.adminRole === 'superadmin' 
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }
                          >
                            {admin.adminRole === 'superadmin' ? 'Superadmin' : 'Admin'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {admin.college ? (
                          <Badge variant="outline">{admin.college}</Badge>
                        ) : (
                          <span className="text-muted-foreground">All Colleges</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {admin.department ? (
                          <Badge variant="outline">{admin.department}</Badge>
                        ) : (
                          <span className="text-muted-foreground">All Departments</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewAdmin(admin)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditAdmin(admin)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            Edit
                          </Button>
                          {admin.id !== user?.id && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveAdmin(admin)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
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

      {/* Create Admin Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create New Admin
            </DialogTitle>
            <DialogDescription>
              Grant administrator privileges to an existing user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search users by username"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select 
                  value={createForm.userId} 
                  onValueChange={(value) => setCreateForm({ ...createForm, userId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((userData) => (
                        <SelectItem key={userData.id} value={userData.id}>
                          <div className="flex items-center gap-2">
                            {userData.imageUrl && (
                              <img
                                src={userData.imageUrl}
                                alt="User"
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <div>
                              <div className="font-medium">
                                {userData.firstName} {userData.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {userData.email}
                              </div>
                              {userData.username && (
                                <div className="text-xs text-muted-foreground">
                                  @{userData.username}
                                </div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        {userSearchTerm ? `No users found matching "${userSearchTerm}"` : "No users available"}
                      </div>
                    )}
                    {userSearchTerm && filteredUsers.length === 50 && (
                      <div className="p-2 text-xs text-muted-foreground text-center border-t">
                        Showing first 50 results. Use search to narrow down.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Admin Role</Label>
              <Select 
                value={createForm.adminRole} 
                onValueChange={(value: 'admin') => setCreateForm({ ...createForm, adminRole: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Regular Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only superadmins can create other superadmins through direct database access.
              </p>
            </div>

            <div className="space-y-2">
              <Label>College (Optional)</Label>
              <Select 
                value={createForm.college} 
                onValueChange={(value) => {
                  const college = colleges.find(c => c.abbreviation === value);
                  setCreateForm({ 
                    ...createForm, 
                    college: value,
                    department: college?.departments[0]?.name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Leave empty for all colleges" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((college) => (
                    <SelectItem key={college._id.$oid} value={college.abbreviation}>
                      {college.abbreviation} - {college.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {createForm.college && (
              <div className="space-y-2">
                <Label>Department (Optional)</Label>
                <Select 
                  value={createForm.department} 
                  onValueChange={(value) => setCreateForm({ ...createForm, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Leave empty for all departments" />
                  </SelectTrigger>
                  <SelectContent>
                    {createFormDepartments.map((dept) => (
                      <SelectItem key={dept.name} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmCreateAdmin}
              className="flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Create Admin
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Edit Admin: {selectedAdmin?.firstName} {selectedAdmin?.lastName}
            </DialogTitle>
            <DialogDescription>
              Update administrator privileges and restrictions
            </DialogDescription>
          </DialogHeader>

          {selectedAdmin && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Admin Role</Label>
                <Select 
                  value={editForm.adminRole} 
                  onValueChange={(value: 'admin' | 'superadmin') => setEditForm({ ...editForm, adminRole: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Regular Admin</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editForm.adminRole === 'admin' && (
                <>
                  <div className="space-y-2">
                    <Label>College Restriction</Label>
                    <Select 
                      value={editForm.college} 
                      onValueChange={(value) => {
                        const college = colleges.find(c => c.abbreviation === value);
                        setEditForm({ 
                          ...editForm, 
                          college: value,
                          department: value ? (college?.departments[0]?.name || '') : ''
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All colleges (no restriction)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No restriction</SelectItem>
                        {colleges.map((college) => (
                          <SelectItem key={college._id.$oid} value={college.abbreviation}>
                            {college.abbreviation} - {college.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {editForm.college && (
                    <div className="space-y-2">
                      <Label>Department Restriction</Label>
                      <Select 
                        value={editForm.department} 
                        onValueChange={(value) => setEditForm({ ...editForm, department: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All departments (no restriction)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No restriction</SelectItem>
                          {editFormDepartments.map((dept) => (
                            <SelectItem key={dept.name} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {editForm.adminRole === 'superadmin' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Superadmins have unrestricted access to all system functions and can manage other administrators.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmEditAdmin}
              className="flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Update Admin
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Admin Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Remove Admin Privileges
            </DialogTitle>
            <DialogDescription>
              This will remove all administrative privileges from this user. They will become a regular user.
            </DialogDescription>
          </DialogHeader>

          {selectedAdmin && (
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {selectedAdmin.imageUrl && (
                      <img
                        src={selectedAdmin.imageUrl}
                        alt="Admin"
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{selectedAdmin.firstName} {selectedAdmin.lastName}</p>
                      <p className="text-sm text-muted-foreground">{selectedAdmin.email}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p><strong>Current Role:</strong> {selectedAdmin.adminRole === 'superadmin' ? 'Superadmin' : 'Admin'}</p>
                    {selectedAdmin.college && <p><strong>College:</strong> {selectedAdmin.college}</p>}
                    {selectedAdmin.department && <p><strong>Department:</strong> {selectedAdmin.department}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoveAdmin}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Remove Admin
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Admin Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this administrator
            </DialogDescription>
          </DialogHeader>

          {selectedAdmin && (
            <div className="space-y-6">
              {/* Profile Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    {selectedAdmin.imageUrl && (
                      <img
                        src={selectedAdmin.imageUrl}
                        alt="Admin"
                        className="w-16 h-16 rounded-full"
                      />
                    )}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">
                        {selectedAdmin.firstName} {selectedAdmin.lastName}
                      </h3>
                      <p className="text-muted-foreground">{selectedAdmin.email}</p>
                      {selectedAdmin.username && (
                        <p className="text-sm text-muted-foreground">@{selectedAdmin.username}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Information */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Administrative Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {selectedAdmin.adminRole === 'superadmin' ? (
                        <Crown className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <Shield className="w-5 h-5 text-blue-600" />
                      )}
                      <Badge 
                        variant={selectedAdmin.adminRole === 'superadmin' ? 'default' : 'secondary'}
                        className={
                          selectedAdmin.adminRole === 'superadmin' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {selectedAdmin.adminRole === 'superadmin' ? 'Superadmin' : 'Admin'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Access Level</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedAdmin.adminRole === 'superadmin' ? (
                      <p className="text-green-600 font-medium">Full System Access</p>
                    ) : (
                      <p className="text-blue-600 font-medium">
                        {selectedAdmin.college || selectedAdmin.department 
                          ? 'Restricted Access' 
                          : 'General Admin Access'
                        }
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Restrictions (for regular admins) */}
              {selectedAdmin.adminRole === 'admin' && (selectedAdmin.college || selectedAdmin.department) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Access Restrictions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedAdmin.college && (
                        <div>
                          <span className="text-sm font-medium">College: </span>
                          <Badge variant="outline">{selectedAdmin.college}</Badge>
                        </div>
                      )}
                      {selectedAdmin.department && (
                        <div>
                          <span className="text-sm font-medium">Department: </span>
                          <Badge variant="outline">{selectedAdmin.department}</Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Account Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Account Created: </span>
                      {new Date(selectedAdmin.createdAt).toLocaleString()}
                    </div>
                    {selectedAdmin.lastSignInAt && (
                      <div>
                        <span className="font-medium">Last Sign In: </span>
                        {new Date(selectedAdmin.lastSignInAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleEditAdmin(selectedAdmin);
                  }}
                >
                  Edit Admin
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
