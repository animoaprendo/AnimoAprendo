"use client";

import { useState, useEffect } from "react";
import { Plus, X, Building2, GraduationCap, Save, AlertCircle } from "lucide-react";
import { updateCollectionData } from "@/app/actions";
import { CreatePopup } from "@/app/tutor/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Department = {
  name: string;
  yearLevel: number[];
};

type College = {
  _id: {
    $oid: string;
  };
  name: string;
  abbreviation: string;
  departments: Department[];
};

interface EditCollegeModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  college: College | null;
  onCollegeUpdated: () => void;
}

const EditCollegeModal = ({
  isOpen,
  setIsOpen,
  college,
  onCollegeUpdated,
}: EditCollegeModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    departments: [] as Department[],
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when college data changes
  useEffect(() => {
    if (college && isOpen) {
      setFormData({
        name: college.name,
        abbreviation: college.abbreviation,
        departments: college.departments.map(dept => ({
          name: dept.name,
          yearLevel: [...dept.yearLevel]
        })),
      });
      setErrors({});
    }
  }, [college, isOpen]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "College name is required";
    }

    if (!formData.abbreviation.trim()) {
      newErrors.abbreviation = "College abbreviation is required";
    } else if (formData.abbreviation.length > 10) {
      newErrors.abbreviation = "Abbreviation should be 10 characters or less";
    }

    if (formData.departments.length === 0) {
      newErrors.departments = "At least one department is required";
    } else {
      formData.departments.forEach((dept, index) => {
        if (!dept.name.trim()) {
          newErrors[`department_${index}`] = "Department name is required";
        }
        if (dept.yearLevel.length === 0 || dept.yearLevel.every(year => year === 0)) {
          newErrors[`yearLevel_${index}`] = "At least one valid year level is required";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addDepartment = () => {
    setFormData({
      ...formData,
      departments: [
        ...formData.departments,
        { name: "", yearLevel: [0, 0, 0, 0] },
      ],
    });
  };

  const removeDepartment = (index: number) => {
    setFormData({
      ...formData,
      departments: formData.departments.filter((_, i) => i !== index),
    });
    // Clear related errors
    const newErrors = { ...errors };
    delete newErrors[`department_${index}`];
    delete newErrors[`yearLevel_${index}`];
    setErrors(newErrors);
  };

  const updateDepartment = (index: number, field: string, value: any) => {
    const updatedDepartments = [...formData.departments];
    if (field === "name") {
      updatedDepartments[index].name = value;
    } else if (field === "yearLevel") {
      updatedDepartments[index].yearLevel = value;
    }
    setFormData({ ...formData, departments: updatedDepartments });

    // Clear related errors
    const newErrors = { ...errors };
    if (field === "name" && value.trim()) {
      delete newErrors[`department_${index}`];
    }
    setErrors(newErrors);
  };

  const updateYearLevel = (deptIndex: number, yearIndex: number, value: number) => {
    const updatedDepartments = [...formData.departments];
    updatedDepartments[deptIndex].yearLevel[yearIndex] = value;
    setFormData({ ...formData, departments: updatedDepartments });

    // Clear year level error if at least one year has a valid value
    if (updatedDepartments[deptIndex].yearLevel.some(year => year > 0)) {
      const newErrors = { ...errors };
      delete newErrors[`yearLevel_${deptIndex}`];
      setErrors(newErrors);
    }
  };

  const addYearLevel = (deptIndex: number) => {
    const updatedDepartments = [...formData.departments];
    if (updatedDepartments[deptIndex].yearLevel.length < 6) {
      updatedDepartments[deptIndex].yearLevel.push(0);
      setFormData({ ...formData, departments: updatedDepartments });
    }
  };

  const removeYearLevel = (deptIndex: number) => {
    const updatedDepartments = [...formData.departments];
    if (updatedDepartments[deptIndex].yearLevel.length > 1) {
      updatedDepartments[deptIndex].yearLevel.pop();
      setFormData({ ...formData, departments: updatedDepartments });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !college) return;

    setIsSubmitting(true);
    try {
      const updatedCollege = {
        ...college,
        name: formData.name.trim(),
        abbreviation: formData.abbreviation.trim().toUpperCase(),
        departments: formData.departments.map(dept => ({
          name: dept.name.trim(),
          yearLevel: dept.yearLevel
        }))
      };

      await updateCollectionData("colleges", college._id.$oid, updatedCollege);
      
      CreatePopup("College updated successfully!", "success");
      setIsOpen(false);
      onCollegeUpdated();
    } catch (error) {
      console.error("Error updating college:", error);
      CreatePopup("Failed to update college. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData({ name: "", abbreviation: "", departments: [] });
    setErrors({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit College
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">College Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name && e.target.value.trim()) {
                    setErrors({ ...errors, name: "" });
                  }
                }}
                placeholder="Enter college name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="abbreviation">Abbreviation</Label>
              <Input
                id="abbreviation"
                value={formData.abbreviation}
                onChange={(e) => {
                  setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() });
                  if (errors.abbreviation && e.target.value.trim()) {
                    setErrors({ ...errors, abbreviation: "" });
                  }
                }}
                placeholder="Enter abbreviation"
                className={errors.abbreviation ? "border-red-500" : ""}
                maxLength={10}
              />
              {errors.abbreviation && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.abbreviation}
                </p>
              )}
            </div>
          </div>

          {/* Departments Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Departments
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDepartment}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Department
              </Button>
            </div>

            {errors.departments && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.departments}
              </p>
            )}

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {formData.departments.map((department, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Department {index + 1}</CardTitle>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeDepartment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`dept-name-${index}`}>Department Name</Label>
                      <Input
                        id={`dept-name-${index}`}
                        value={department.name}
                        onChange={(e) => updateDepartment(index, "name", e.target.value)}
                        placeholder="Enter department name"
                        className={errors[`department_${index}`] ? "border-red-500" : ""}
                      />
                      {errors[`department_${index}`] && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors[`department_${index}`]}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Year Levels (Number of sections per year)</Label>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addYearLevel(index)}
                            disabled={department.yearLevel.length >= 6}
                            className="h-7 w-7 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeYearLevel(index)}
                            disabled={department.yearLevel.length <= 1}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className={`grid gap-3 ${department.yearLevel.length <= 2 ? 'grid-cols-2' : department.yearLevel.length <= 4 ? 'grid-cols-4' : 'grid-cols-6'}`}>
                        {department.yearLevel.map((count, yearIndex) => (
                          <div key={yearIndex} className="space-y-1">
                            <Label className="text-sm font-medium">
                              Year {yearIndex + 1}
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={count}
                              onChange={(e) =>
                                updateYearLevel(index, yearIndex, parseInt(e.target.value) || 0)
                              }
                              className="text-center"
                            />
                          </div>
                        ))}
                      </div>
                      {errors[`yearLevel_${index}`] && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors[`yearLevel_${index}`]}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">
                          {department.yearLevel.length} Year Level{department.yearLevel.length !== 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="outline">
                          Total Sections: {department.yearLevel.reduce((sum, count) => sum + count, 0)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Update College
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCollegeModal;
