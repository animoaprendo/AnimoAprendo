"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { deleteSubjectOption } from "../actions";
import { Subject } from "./page";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const DeleteSubject = ({
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!data) return;

    setIsOpen(false);
    deleteSubjectOption(formData).then((res) => {
      toast.success("Subject deleted successfully!");
      updateSubjects();
    });
  }

  function handleClose() {
    setIsOpen(false);
    setSelectedSubject(null);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Subject
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the subject from the system.
          </DialogDescription>
        </DialogHeader>

        {data ? (
          <Card className="border-destructive/20">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-lg">{data.subjectName}</h4>
                  <p className="text-sm text-muted-foreground font-mono">
                    {data.subjectCode}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {data.college}
                  </Badge>
                  <Badge variant="outline">
                    {data.department}
                  </Badge>
                  {data.year && data.semester && (
                    <Badge variant="outline">
                      Year {data.year} • Semester {data.semester}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Loading subject details...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex items-center gap-2"
              disabled={!data}
            >
              <Trash2 className="h-4 w-4" />
              Delete Subject
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteSubject;
