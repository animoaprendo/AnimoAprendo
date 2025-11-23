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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect, useState } from "react";
import CreateCollegeModal from "./create";
import { useUser } from "@clerk/nextjs";
import EditCollegeModal from "./edit";
import DeleteCollegeModal from "./delete";
import { Search, Plus, ChevronUp, ChevronDown, ChevronRight, RotateCcw, School, Building2 } from "lucide-react";

export type Department = {
  name: string;
  yearLevel: number[];
};

export type College = {
  _id: {
    $oid: string;
  };
  name: string;
  abbreviation: string;
  departments: Department[];
  createdAt?: string;
  updatedAt?: string;
};

type SortField = 'name' | 'abbreviation' | 'departmentCount';
type SortOrder = 'asc' | 'desc';

export default function Colleges() {
  const { user } = useUser();
  const [colleges, setColleges] = useState<College[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedColleges, setExpandedColleges] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenEdit, setIsOpenEdit] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);

  function updateColleges() {
    getCollectionData("colleges").then((data) => {
      setColleges(data.data);
    });
  }

  useEffect(() => {
    updateColleges();
  }, []);

  function handleEdit(college: College) {
    setSelectedCollege(college);
    setIsOpenEdit(true);
  }

  function handleDelete(college: College) {
    setSelectedCollege(college);
    setIsOpenDelete(true);
  }

  function toggleCollege(collegeId: string) {
    const newExpanded = new Set(expandedColleges);
    if (newExpanded.has(collegeId)) {
      newExpanded.delete(collegeId);
    } else {
      newExpanded.add(collegeId);
    }
    setExpandedColleges(newExpanded);
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
    setSortField('name');
    setSortOrder('asc');
  }

  // Filter and sort colleges
  const filteredAndSortedColleges = colleges
    .filter(college => {
      const matchesSearch = college.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           college.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      if (sortField === 'departmentCount') {
        aValue = a.departments.length;
        bValue = b.departments.length;
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }
      
      if (typeof aValue === 'string') {
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
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-7 h-7" />
            College Management
          </CardTitle>
          <CardDescription>
            Manage colleges, their departments, and academic programs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by college name or abbreviation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearFilters} size="icon">
                <RotateCcw className="w-4 h-4" />
              </Button>

              <Button onClick={() => setIsOpenCreate(true)} className="whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Add College
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {searchTerm && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Active filters:</span>
              <Badge variant="secondary">
                Search: {searchTerm}
              </Badge>
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableCaption className="text-center py-4">
                Showing {filteredAndSortedColleges.length} of {colleges.length} colleges
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    {/* Expand/Collapse column */}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      College Name
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('abbreviation')}
                  >
                    <div className="flex items-center gap-1">
                      Abbreviation
                      {getSortIcon('abbreviation')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('departmentCount')}
                  >
                    <div className="flex items-center gap-1">
                      Departments
                      {getSortIcon('departmentCount')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedColleges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No colleges found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedColleges.map((college: College) => (
                    <>
                      <TableRow key={college._id.$oid} className="hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCollege(college._id.$oid)}
                            className="p-0 h-8 w-8"
                          >
                            {expandedColleges.has(college._id.$oid) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <School className="w-4 h-4 text-muted-foreground" />
                            {college.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {college.abbreviation}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {college.departments.length} departments
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(college)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(college)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Department Details */}
                      {expandedColleges.has(college._id.$oid) && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30 p-0">
                            <div className="p-4 space-y-3">
                              <h4 className="font-medium text-sm text-muted-foreground">Departments & Year Levels</h4>
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {college.departments.map((dept, index) => (
                                  <Card key={index} className="p-3">
                                    <h5 className="font-medium text-sm mb-2">{dept.name}</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {dept.yearLevel.map((years, yearIndex) => (
                                        <Badge key={yearIndex} variant="outline" className="text-xs">
                                          Year {yearIndex + 1}: {years} sections
                                        </Badge>
                                      ))}
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* College CRUD Modals */}
      <CreateCollegeModal 
        isOpen={isOpenCreate} 
        setIsOpen={setIsOpenCreate} 
        user={user}
        updateColleges={updateColleges}
      />
      <EditCollegeModal 
        isOpen={isOpenEdit} 
        setIsOpen={setIsOpenEdit} 
        college={selectedCollege}
        onCollegeUpdated={updateColleges}
      />
      <DeleteCollegeModal 
        isOpen={isOpenDelete} 
        setIsOpen={setIsOpenDelete} 
        college={selectedCollege}
        onCollegeDeleted={updateColleges}
      />
    </div>
  );
}
