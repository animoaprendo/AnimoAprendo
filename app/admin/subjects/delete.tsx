import { useUser } from "@clerk/nextjs";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  Field,
  Fieldset,
  Input,
  Label,
  Select,
} from "@headlessui/react";
import clsx from "clsx";
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteSubjectOption, editSubjectOption } from "../actions";
import { Subject } from "./page";
import { CreatePopup } from "@/app/tutor/alert";

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

const initialColleges = [
  {
    _id: {
      $oid: "68cc34d441c9a252e8ab2725",
    },
    name: "College of Information and Computer Studies",
    abbreviation: "CICS",
    departments: [
      {
        name: "Information Technology",
        yearLevel: [5, 5, 5, 3],
      },
      {
        name: "Computer Science",
        yearLevel: [5, 5, 5, 5],
      },
    ],
  },
  {
    _id: {
      $oid: "68cc350641c9a252e8ab2726",
    },
    name: "College of Science",
    abbreviation: "COS",
    departments: [
      {
        name: "Biology",
        yearLevel: [3, 3, 3],
      },
      {
        name: "Medical Biology",
        yearLevel: [3, 4, 5],
      },
      {
        name: "Applied Mathematics",
        yearLevel: [2, 1],
      },
    ],
  },
];

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
  const [colleges, setColleges] = useState<College[]>(initialColleges);
  // Initialize form data first using initialColleges so we don't reference it before declaration
  const [formData, setFormData] = useState({
    _id: data?._id,
    subjectName: data?.subjectName,
    subjectCode: data?.subjectCode,
    college: data?.college,
    department: data?.department,
    createdAt: data?.createdAt,
  });

  // Departments should be derived from selected college; initialize safely
  const [departments, setDepartments] = useState<College["departments"]>(
    initialColleges.find(
      (c) => c.abbreviation === (initialColleges[0]?.abbreviation || "")
    )?.departments || []
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedSubject(null);
    }
    if (isOpen) {
      setFormData({
        _id: data?._id,
        subjectName: data?.subjectName,
        subjectCode: data?.subjectCode,
        college: data?.college,
        department: data?.department,
        createdAt: data?.createdAt,
      });
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
    deleteSubjectOption(formData).then((res) => {
      CreatePopup("Subject deleted successfully!", "success");
      updateSubjects();
    });
  }

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="fixed top-0 left-0 bg-black/40 w-full h-full z-999"
    >
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="max-w-lg w-full space-y-4 border bg-white p-12 rounded-2xl shadow-lg">
          <DialogTitle className="font-bold">Delete Subject</DialogTitle>

          <form onSubmit={handleSubmit}>
            <Description>
              This will permanently delete the subject
            </Description>
            <p>
              Are you sure you want to delete <span className="font-bold">{formData.subjectName}</span>?
            </p>
            <div className="flex gap-4 ml-auto mt-6 w-fit">
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-error rounded"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-success rounded">
                Delete
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default DeleteSubject;
