"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { createSubjectOption } from "../actions";
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

// const initialColleges = [
//   {
//     _id: {
//       $oid: "68cc34d441c9a252e8ab2725",
//     },
//     name: "College of Information and Computer Studies",
//     abbreviation: "CICS",
//     departments: [
//       {
//         name: "Information Technology",
//         yearLevel: [5, 5, 5, 3],
//       },
//       {
//         name: "Computer Science",
//         yearLevel: [5, 5, 5, 5],
//       },
//     ],
//   },
//   {
//     _id: {
//       $oid: "68cc350641c9a252e8ab2726",
//     },
//     name: "College of Science",
//     abbreviation: "COS",
//     departments: [
//       {
//         name: "Biology",
//         yearLevel: [3, 3, 3],
//       },
//       {
//         name: "Medical Biology",
//         yearLevel: [3, 4, 5],
//       },
//       {
//         name: "Applied Mathematics",
//         yearLevel: [2, 1],
//       },
//     ],
//   },
// ];

const CreateSubject = ({
  isOpen,
  setIsOpen,
  user,
  updateSubjects,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: ReturnType<typeof useUser>["user"];
  updateSubjects: () => void;
}) => {
  const [colleges, setColleges] = useState<College[]>([]);

  // Initialize form data first using initialColleges so we don't reference it before declaration
  const [formDataDefault, setFormDataDefault] = useState({
    subjectName: "",
    subjectCode: "",
    yearLevel: 1,
    semester: 1,
    college: colleges[0]?.abbreviation || "",
    department: colleges[0]?.departments?.[0]?.name || "",
  });
  const [formData, setFormData] = useState({ ...formDataDefault });
  // Departments should be derived from selected college; initialize safely
  const [departments, setDepartments] = useState<College["departments"]>([]);

  // Fetch colleges from backend if needed
  useEffect(() => {
    getCollectionData("colleges").then((data) => {
      setColleges(data.data);
      setFormDataDefault({
        subjectName: "",
        subjectCode: "",
        yearLevel: 1,
        semester: 1,
        college: data.data[0]?.abbreviation || "",
        department: data.data[0]?.departments?.[0]?.name || "",
      });

      setDepartments(
        data.data.find(
          (c: any) => c.abbreviation === (data.data[0]?.abbreviation || "")
        )?.departments || []
      );
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...formDataDefault, subjectName: "", subjectCode: "" });
    }
  }, [isOpen]);

  // Keep departments in sync with selected college
  useEffect(() => {
    const selected = colleges.find((c) => c.abbreviation === formData.college);
    setDepartments(selected?.departments || []);
  }, [colleges, formData.college]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsOpen(false);
    createSubjectOption(formData).then((res) => {
      CreatePopup("Subject created successfully!", "success");
      updateSubjects();
    });
  }

  function setSessionDefault() {
    // Implement the logic to set the current formData as session default
    setFormDataDefault({ ...formData });
    CreatePopup("Session default set successfully!", "success");
  }
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Create New Subject
          </DialogTitle>
          <DialogDescription>
            Add a new subject to the curriculum
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
                  value={formData.subjectName}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectName: e.target.value })
                  }
                  placeholder="e.g., Introduction to Computer Science"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjectCode">Subject Code</Label>
                <Input
                  id="subjectCode"
                  value={formData.subjectCode}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectCode: e.target.value })
                  }
                  placeholder="e.g., CS101"
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
                <div className="space-y-2 flex flex-col w-full">
                  <Label>College</Label>
                  <Select
                    value={formData.college}
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
                    <SelectContent className="w-full">
                      {colleges.map((college, i) => (
                        <SelectItem key={i} value={college.abbreviation}>
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
                    value={formData.department}
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
                    value={formData.yearLevel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        yearLevel:
                          e.target.value.toString() === ""
                            ? 1
                            : parseInt(e.target.value),
                      })
                    }
                    placeholder="1"
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
                    value={formData.semester}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        semester:
                          e.target.value.toString() === ""
                            ? 1
                            : parseInt(e.target.value),
                      })
                    }
                    placeholder="1"
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
                  Year {formData.yearLevel} • Semester {formData.semester}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={setSessionDefault}
              className="flex items-center gap-2"
            >
              Set Default
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Subject
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSubject;
