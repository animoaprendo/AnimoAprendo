"use client";
import { getCollectionData } from "@/app/actions";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import CreateSubject from "./create";
import { useUser } from "@clerk/nextjs";
import EditSubject from "./edit";
import DeleteSubject from "./delete";
import { Search, Plus, ChevronUp, ChevronDown, Filter, RotateCcw } from "lucide-react";

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
  }, []);

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

  // Get unique values for filters
  const uniqueColleges = [...new Set(subjects.map(s => s.college))].sort();
  const uniqueDepartments = [...new Set(subjects.map(s => s.department))].sort();
  const uniqueYears = [...new Set(subjects.map(s => s.year))].sort((a, b) => a - b);

  // Filter and sort subjects
  const filteredAndSortedSubjects = subjects
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

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Subject Management</CardTitle>
          <CardDescription>
            Manage academic subjects, departments, and course offerings
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
                Showing {filteredAndSortedSubjects.length} of {subjects.length} subjects
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
                        <Badge variant="secondary">Year {subject.year}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Sem {subject.semester}</Badge>
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
