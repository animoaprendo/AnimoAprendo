"use client";
import { getCollectionData } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUser } from "@clerk/nextjs";
import { ChevronDown, ChevronUp, Plus, RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import CreateSubject from "./create";
import DeleteSubject from "./delete";
import EditSubject from "./edit";

export type Subject = {
  _id: string;
  subjectName: string;
  subjectCode: string;
  college: string;
  department: string;
  year: number;
  semester: number;
  createdAt: string;
  updatedAt: string;
};

type SortField = 'subjectName' | 'subjectCode' | 'department' | 'college' | 'year' | 'semester' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export default function Subjects() {
  const { user } = useUser();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Check if user is superadmin
  const isSuperAdmin = user?.publicMetadata?.isAdmin === true && user?.publicMetadata?.adminRole === "superadmin";
  const userCollege = user?.publicMetadata?.college as string | undefined;
  const userDepartment = user?.publicMetadata?.department as string | undefined;
  const [searchTerm, setSearchTerm] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>('college');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenEdit, setIsOpenEdit] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  function updateSubjects() {
    getCollectionData("subjectOptions").then((data) => {
      setSubjects(data.data);
    });
  }

  useEffect(() => {
    updateSubjects();
  }, [user, isSuperAdmin, userCollege, userDepartment]);

  function handleEdit(subject: Subject) {
    setSelectedSubject(subject);
    setIsOpenEdit(true);
  }

  function handleDelete(subject: Subject) {
    setSelectedSubject(subject);
    setIsOpenDelete(true);
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
    setCollegeFilter("");
    setDepartmentFilter("");
    setYearFilter("");
    setSortField('college');
    setSortOrder('asc');
  }

  // Filter subjects based on admin role first
  const adminFilteredSubjects = subjects.filter(subject => {
    if (isSuperAdmin) {
      // Superadmins can see all subjects
      return true;
    } else {
      // Regular admins can only see subjects from their assigned college
      if (subject.college !== userCollege) {
        return false;
      }
      
      // If admin has ALL_DEPARTMENTS, they can see all departments in their college
      if (userDepartment === 'ALL_DEPARTMENTS') {
        return true;
      }
      
      // Otherwise, only show subjects from their specific department
      return subject.department === userDepartment;
    }
  });

  // Get unique values for filters (only from admin-filtered subjects)
  const uniqueColleges = [...new Set(adminFilteredSubjects.map(s => s.college))].sort();
  const uniqueDepartments = [...new Set(adminFilteredSubjects.map(s => s.department))].sort();
  const uniqueYears = [...new Set(adminFilteredSubjects.map(s => s.year))].sort((a, b) => a - b);

  // Filter and sort subjects
  const filteredAndSortedSubjects = adminFilteredSubjects
    .filter(subject => {
      const matchesSearch = subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           subject.subjectCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCollege = !collegeFilter || subject.college === collegeFilter;
      const matchesDepartment = !departmentFilter || subject.department === departmentFilter;
      const matchesYear = !yearFilter || subject.year.toString() === yearFilter;
      
      return matchesSearch && matchesCollege && matchesDepartment && matchesYear;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'updatedAt') {
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

  function getSortIcon(field: SortField) {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  }

  // Helper function to get year level colors
  function getYearColor(year: number) {
    switch (year) {
      case 1: return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
      case 2: return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200';
      case 3: return 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200';
      case 4: return 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200';
      case 5: return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
    }
  }

  // Helper function to get semester colors
  function getSemesterColor(semester: number) {
    switch (semester) {
      case 1: return 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200';
      case 2: return 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200';
      case 3: return 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Subject Management</CardTitle>
          <CardDescription>
            Manage academic subjects, departments, and course offerings
            {!isSuperAdmin && userCollege && (
              <span className="block mt-1 text-blue-600">
                Viewing subjects for {userCollege}
                {userDepartment && userDepartment !== 'ALL_DEPARTMENTS' ? ` - ${userDepartment} department` : ' - All departments'}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by subject name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 lg:flex-nowrap">
              <Select key={`college-${collegeFilter}`} value={collegeFilter || undefined} onValueChange={(value) => setCollegeFilter(value || "")}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="All Colleges" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueColleges.map((college) => (
                    <SelectItem key={college} value={college}>{college}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select key={`department-${departmentFilter}`} value={departmentFilter || undefined} onValueChange={(value) => setDepartmentFilter(value || "")}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select key={`year-${yearFilter}`} value={yearFilter || undefined} onValueChange={(value) => setYearFilter(value || "")}>
                <SelectTrigger className="w-full lg:w-[120px]">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>Year {year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters} size="icon">
                <RotateCcw className="w-4 h-4" />
              </Button>

              <Button onClick={() => setIsOpenCreate(true)} className="whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || collegeFilter || departmentFilter || yearFilter) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary">
                  Search: {searchTerm}
                </Badge>
              )}
              {collegeFilter && (
                <Badge variant="secondary">
                  College: {collegeFilter}
                </Badge>
              )}
              {departmentFilter && (
                <Badge variant="secondary">
                  Department: {departmentFilter}
                </Badge>
              )}
              {yearFilter && (
                <Badge variant="secondary">
                  Year: {yearFilter}
                </Badge>
              )}
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableCaption className="text-center py-4">
                Showing {filteredAndSortedSubjects.length} of {adminFilteredSubjects.length} subjects
                {!isSuperAdmin && userCollege && (
                  <span className="text-muted-foreground ml-2">
                    (filtered to {userCollege}
                    {userDepartment && userDepartment !== 'ALL_DEPARTMENTS' ? ` - ${userDepartment}` : ' - All Departments'})
                  </span>
                )}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('subjectName')}
                  >
                    <div className="flex items-center gap-1">
                      Subject Name
                      {getSortIcon('subjectName')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('subjectCode')}
                  >
                    <div className="flex items-center gap-1">
                      Subject Code
                      {getSortIcon('subjectCode')}
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
                    onClick={() => handleSort('college')}
                  >
                    <div className="flex items-center gap-1">
                      College
                      {getSortIcon('college')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('year')}
                  >
                    <div className="flex items-center gap-1">
                      Year
                      {getSortIcon('year')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('semester')}
                  >
                    <div className="flex items-center gap-1">
                      Semester
                      {getSortIcon('semester')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('updatedAt')}
                  >
                    <div className="flex items-center gap-1">
                      Updated
                      {getSortIcon('updatedAt')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No subjects found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedSubjects.map((subject: Subject) => (
                    <TableRow key={subject._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {subject.subjectName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{subject.subjectCode}</Badge>
                      </TableCell>
                      <TableCell>{subject.department}</TableCell>
                      <TableCell>{subject.college}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`font-medium ${getYearColor(subject.year)}`}
                        >
                          Year {subject.year}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`font-medium ${getSemesterColor(subject.semester)}`}
                        >
                          Sem {subject.semester}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(subject.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(subject)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(subject)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </Button>
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

      <CreateSubject isOpen={isOpenCreate} setIsOpen={setIsOpenCreate} user={user} updateSubjects={updateSubjects}/>
      <EditSubject isOpen={isOpenEdit} setIsOpen={setIsOpenEdit} setSelectedSubject={setSelectedSubject} data={selectedSubject} user={user} updateSubjects={updateSubjects}/>
      <DeleteSubject isOpen={isOpenDelete} setIsOpen={setIsOpenDelete} setSelectedSubject={setSelectedSubject} data={selectedSubject} user={user} updateSubjects={updateSubjects}/>
    </div>
  );
}
