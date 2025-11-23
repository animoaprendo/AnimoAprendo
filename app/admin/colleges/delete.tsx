"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteCollectionData } from "@/app/actions";
import { CreatePopup } from "@/app/tutor/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Department = {
  name: string;
  yearLevel: number[];
};

type College = {
  _id: string | {
    $oid: string;
  };
  name: string;
  abbreviation: string;
  departments: Department[];
};

interface DeleteCollegeModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  college: College | null;
  onCollegeDeleted: () => void;
}

const DeleteCollegeModal = ({
  isOpen,
  setIsOpen,
  college,
  onCollegeDeleted,
}: DeleteCollegeModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!college) return null;

  const totalSections = college.departments.reduce(
    (total, dept) => total + dept.yearLevel.reduce((sum, count) => sum + count, 0),
    0
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Extract the ID - handle both string and object formats
      const collegeId = typeof college._id === 'string' ? college._id : college._id.$oid;
  
      // Delete the college from the database
      await deleteCollectionData("colleges", collegeId);
      
      CreatePopup("College deleted successfully!", "success");
      setIsOpen(false);
      onCollegeDeleted();
    } catch (error) {
      console.error("Error deleting college:", error);
      CreatePopup("Failed to delete college. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete College
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this college? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* College Information */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <h3 className="font-semibold text-lg">{college.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Abbreviation: {college.abbreviation}
            </p>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Departments ({college.departments.length}):</p>
              <div className="space-y-1">
                {college.departments.map((dept, index) => {
                  const deptTotal = dept.yearLevel.reduce((sum, count) => sum + count, 0);
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{dept.name}</span>
                      <Badge variant="secondary">{deptTotal} sections</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t">
              <div className="flex items-center justify-between font-medium">
                <span>Total Sections:</span>
                <Badge variant="outline">{totalSections}</Badge>
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting this college will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Permanently remove all {college.departments.length} departments</li>
                <li>Affect {totalSections} section records</li>
                <li>Remove associated subjects and course offerings</li>
                <li>Cannot be undone</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete College
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteCollegeModal;
