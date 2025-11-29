import { useUser } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Plus, X, Building2, GraduationCap } from "lucide-react";
import { createCollectionData } from "@/app/actions";
import { toast } from "sonner";

type Department = {
  name: string;
  yearLevel: number[];
};

interface CreateCollegeModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: ReturnType<typeof useUser>["user"];
  updateColleges: () => void;
}

const CreateCollegeModal = ({
  isOpen,
  setIsOpen,
  user,
  updateColleges,
}: CreateCollegeModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
  });
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editingDepartment, setEditingDepartment] = useState<{
    name: string;
    yearLevel: number[];
    isEditing: boolean;
    editIndex?: number;
  }>({ name: "", yearLevel: [0, 0, 0, 0], isEditing: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.abbreviation) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (departments.length === 0) {
      toast.error("Please add at least one department");
      return;
    }

    const collegeData = {
      ...formData,
      departments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const result = await createCollectionData("colleges", collegeData);
      if (result.success) {
        toast.success("College created successfully!");
        handleClose();
        updateColleges();
      } else {
        toast.error("Failed to create college");
      }
    } catch (error) {
      toast.error("Error creating college");
    }
  };

  const handleClose = () => {
    setFormData({ name: "", abbreviation: "" });
    setDepartments([]);
    setEditingDepartment({ name: "", yearLevel: [0, 0, 0, 0], isEditing: false });
    setIsOpen(false);
  };

  const addDepartment = () => {
    if (!editingDepartment.name.trim()) {
      toast.error("Please enter department name");
      return;
    }

    if (editingDepartment.yearLevel.every(year => year === 0)) {
      toast.error("Please add at least one student to any year level");
      return;
    }

    if (editingDepartment.isEditing && editingDepartment.editIndex !== undefined) {
      const updatedDepartments = [...departments];
      updatedDepartments[editingDepartment.editIndex] = {
        name: editingDepartment.name.trim(),
        yearLevel: [...editingDepartment.yearLevel]
      };
      setDepartments(updatedDepartments);
    } else {
      setDepartments([...departments, {
        name: editingDepartment.name.trim(),
        yearLevel: [...editingDepartment.yearLevel]
      }]);
    }
    
    setEditingDepartment({ name: "", yearLevel: [0, 0, 0, 0], isEditing: false });
  };

  const removeDepartment = (index: number) => {
    setDepartments(departments.filter((_, i) => i !== index));
  };

  const editDepartment = (index: number) => {
    const dept = departments[index];
    setEditingDepartment({
      name: dept.name,
      yearLevel: [...dept.yearLevel],
      isEditing: true,
      editIndex: index
    });
  };

  const cancelEdit = () => {
    setEditingDepartment({ name: "", yearLevel: [0, 0, 0, 0], isEditing: false });
  };

  const updateYearLevel = (yearIndex: number, value: number) => {
    const updatedYearLevels = [...editingDepartment.yearLevel];
    updatedYearLevels[yearIndex] = value;
    setEditingDepartment({ ...editingDepartment, yearLevel: updatedYearLevels });
  };

  const addYearLevel = () => {
    if (editingDepartment.yearLevel.length < 6) {
      setEditingDepartment({
        ...editingDepartment,
        yearLevel: [...editingDepartment.yearLevel, 0]
      });
    }
  };

  const removeYearLevel = () => {
    if (editingDepartment.yearLevel.length > 1) {
      const newYearLevels = [...editingDepartment.yearLevel];
      newYearLevels.pop();
      setEditingDepartment({ ...editingDepartment, yearLevel: newYearLevels });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Create New College
          </DialogTitle>
          <DialogDescription>
            Add a new college with its departments and academic programs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collegeName">College Name *</Label>
                <Input
                  id="collegeName"
                  placeholder="e.g., College of Information and Computer Studies"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="abbreviation">Abbreviation *</Label>
                <Input
                  id="abbreviation"
                  placeholder="e.g., CICS"
                  value={formData.abbreviation}
                  onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Departments Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Departments</h3>
            
            {/* Department Configuration */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {editingDepartment.isEditing ? 'Edit Department' : 'Add Department'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Department Name */}
                <div className="space-y-2">
                  <Label>Department Name</Label>
                  <Input
                    placeholder="e.g., Information Technology"
                    value={editingDepartment.name}
                    onChange={(e) => setEditingDepartment({ ...editingDepartment, name: e.target.value })}
                  />
                </div>

                {/* Year Levels Configuration */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Year Levels (Number of sections per year)</Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addYearLevel}
                        disabled={editingDepartment.yearLevel.length >= 6}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeYearLevel}
                        disabled={editingDepartment.yearLevel.length <= 1}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className={`grid gap-3 ${editingDepartment.yearLevel.length <= 2 ? 'grid-cols-2' : editingDepartment.yearLevel.length <= 4 ? 'grid-cols-4' : 'grid-cols-6'}`}>
                    {editingDepartment.yearLevel.map((count, yearIndex) => (
                      <div key={yearIndex} className="space-y-1">
                        <Label className="text-sm font-medium">
                          Year {yearIndex + 1}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={count}
                          onChange={(e) => updateYearLevel(yearIndex, parseInt(e.target.value) || 0)}
                          className="text-center"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">
                      {editingDepartment.yearLevel.length} Year Level{editingDepartment.yearLevel.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline">
                      Total Sections: {editingDepartment.yearLevel.reduce((sum, count) => sum + count, 0)}
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button type="button" onClick={addDepartment} size="sm">
                    {editingDepartment.isEditing ? 'Update Department' : 'Add Department'}
                  </Button>
                  {editingDepartment.isEditing && (
                    <Button type="button" variant="outline" onClick={cancelEdit} size="sm">
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Existing Departments */}
            {departments.length > 0 && (
              <div className="space-y-2">
                <Label>Added Departments ({departments.length})</Label>
                <div className="grid gap-2">
                  {departments.map((dept, index) => (
                    <Card key={index}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{dept.name}</p>
                              <div className="flex gap-1 mt-1">
                                {dept.yearLevel.map((count, yearIndex) => (
                                  <Badge key={yearIndex} variant="outline" className="text-xs">
                                    Year {yearIndex + 1}: {count}
                                  </Badge>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Total: {dept.yearLevel.reduce((sum, count) => sum + count, 0)} sections
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => editDepartment(index)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDepartment(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name || !formData.abbreviation || departments.length === 0}>
              Create College
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCollegeModal;
