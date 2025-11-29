"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { BookOpen, Save } from "lucide-react";
import { editSubjectOption } from "../actions";
import { Subject } from "./page";
import { CreatePopup } from "@/app/tutor/alert";
import { getCollectionData } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type College = {
  _id: {
    $oid: string;
  };
  name: string;
  abbreviation: string;
  departments: {
    name: string;
    yearLevel: number[];
  }[];
};



const EditSubject = ({
  isOpen,
  setIsOpen,
  data,
  setSelectedSubject,
  user,
  updateSubjects,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  data: Subject | null;
  setSelectedSubject: (subject: any) => void;
  user: ReturnType<typeof useUser>["user"];
  updateSubjects: () => void;
}) => {
  const [colleges, setColleges] = useState<College[]>([]);
  // Initialize form data
  const [formData, setFormData] = useState({
    _id: data?._id,
    subjectName: data?.subjectName,
    subjectCode: data?.subjectCode,
    college: data?.college,
    department: data?.department,
    yearLevel: data?.year,
    semester: data?.semester,
    createdAt: data?.createdAt,
  });

  // Departments should be derived from selected college
  const [departments, setDepartments] = useState<College["departments"]>([]);

  // Fetch colleges from database
  useEffect(() => {
    getCollectionData("colleges").then((data) => {
      setColleges(data.data);
    });
  }, []);

  useEffect(() => {
    if (isOpen && data) {
      setFormData({
        _id: data._id,
        subjectName: data.subjectName,
        subjectCode: data.subjectCode,
        college: data.college,
        department: data.department,
        yearLevel: data.year,
        semester: data.semester,
        createdAt: data.createdAt,
      });
    }
  }, [isOpen, data, setSelectedSubject]);

  // Keep departments in sync with selected college
  useEffect(() => {
    const selected = colleges.find((c) => c.abbreviation === formData.college);
    setDepartments(selected?.departments || []);
  }, [colleges, formData.college]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Form submitted:", formData);

    setIsOpen(false);
    editSubjectOption(formData).then((res) => {
      toast.success("Subject updated successfully!");
      updateSubjects();
    });
  }

  function handleClose() {
    setIsOpen(false);
    setSelectedSubject(null);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-fit max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Edit Subject
          </DialogTitle>
          <DialogDescription>
            Update the subject information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Subject Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subjectName">Subject Name</Label>
                <Input
                  id="subjectName"
                  value={formData.subjectName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectName: e.target.value })
                  }
                  placeholder="Enter subject name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjectCode">Subject Code</Label>
                <Input
                  id="subjectCode"
                  value={formData.subjectCode || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectCode: e.target.value })
                  }
                  placeholder="Enter subject code"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Academic Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Academic Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 w-full">
                  <Label>College</Label>
                  <Select
                    value={formData.college || ""}
                    onValueChange={(value) => {
                      const college = colleges.find(
                        (c) => c.abbreviation === value
                      );
                      if (college) {
                        setFormData({
                          ...formData,
                          college: college.abbreviation,
                          department: college.departments[0]?.name || "General",
                        });
                      }
                    }}
                    disabled={user?.publicMetadata.adminRole !== "superadmin"}
                    
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select college" />
                    </SelectTrigger>
                    <SelectContent>
                      {colleges.map((college) => (
                        <SelectItem key={college._id.$oid} value={college.abbreviation}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{college.abbreviation}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={formData.department || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, department: value })
                    }
                    disabled={user?.publicMetadata.adminRole !== "superadmin"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      {departments.map((department, i) => (
                        <SelectItem key={i} value={department.name}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearLevel">Year Level</Label>
                  <Input
                    id="yearLevel"
                    type="number"
                    min="1"
                    max="6"
                    value={formData.yearLevel || 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        yearLevel:
                          e.target.value.toString() === ""
                            ? 1
                            : parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Input
                    id="semester"
                    type="number"
                    min="1"
                    max="3"
                    value={formData.semester || 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        semester:
                          e.target.value.toString() === ""
                            ? 1
                            : parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Badge variant="secondary">
                  {formData.college || "No college selected"}
                </Badge>
                <Badge variant="outline">
                  {formData.department || "No department selected"}
                </Badge>
                <Badge variant="outline">
                  Year {formData.yearLevel || 1} • Semester {formData.semester || 1}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Update Subject
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSubject;
