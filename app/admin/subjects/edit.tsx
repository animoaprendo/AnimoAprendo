import { useUser } from "@clerk/nextjs";
import {
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
import { editSubjectOption } from "../actions";
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
    console.log("Form submitted:", formData);

    setIsOpen(false);
    editSubjectOption(formData).then((res) => {
      console.log("Subject option created successfully:", res);
      CreatePopup("Subject updated successfully!", "success");
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
          <DialogTitle className="font-bold">Edit Subject</DialogTitle>

          <form onSubmit={handleSubmit}>
            <Fieldset className="flex flex-col gap-2">
              <Field>
                <Label className="text-sm/6 font-medium text-black">
                  Subject Name
                </Label>
                <Input
                  className={clsx(
                    "mt-3 block w-full rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
                    "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
                  )}
                  value={formData.subjectName}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectName: e.target.value })
                  }
                  placeholder="Enter subject name"
                  required
                />
              </Field>
              <Field>
                <Label className="text-sm/6 font-medium text-black">
                  Subject Code
                </Label>
                <Input
                  className={clsx(
                    "mt-3 block w-full rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
                    "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25"
                  )}
                  value={formData.subjectCode}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectCode: e.target.value })
                  }
                  placeholder="Enter subject code"
                  required
                />
              </Field>
              <Field>
                <Label className="text-sm/6 font-medium text-black">
                  College
                </Label>
                <div className="relative">
                  <Select
                    className={clsx(
                      "mt-3 block w-full appearance-none rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
                      "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25",
                      // Make the text of each option black on Windows
                      "*:text-black"
                    )}
                    value={
                      colleges.find((c) => c.abbreviation === formData.college)
                        ? formData.college
                        : colleges[0].abbreviation
                    }
                    onChange={(e) => {
                      const college = colleges.find(
                        (c) => c.abbreviation === e.target.value
                      );
                      if (college) {
                        setFormData({
                          ...formData,
                          college: college.abbreviation,
                          department: college.departments[0].name,
                        });
                      }
                    }}
                    disabled={user?.publicMetadata.adminRole !== "superadmin"}
                  >
                    {colleges.map((college) => (
                      <option
                        key={college._id.$oid}
                        value={college.abbreviation}
                      >
                        {college.name}
                      </option>
                    ))}
                  </Select>
                  {user?.publicMetadata.adminRole === "superadmin" && (
                    <ChevronDownIcon
                      className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-white/60"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </Field>
              <Field>
                <Label className="text-sm/6 font-medium text-black">
                  Department
                </Label>
                <div className="relative">
                  <Select
                    className={clsx(
                      "mt-3 block w-full appearance-none rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
                      "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-white/25",
                      // Make the text of each option black on Windows
                      "*:text-black"
                    )}
                    value={formData.department}
                    onChange={(e) => {
                      const department = departments.find(
                        (d) => d.name === e.target.value
                      );
                      if (department) {
                        setFormData({
                          ...formData,
                          department: department.name,
                        });
                      }
                    }}
                    disabled={user?.publicMetadata.adminRole !== "superadmin"}
                  >
                    {departments.map((department, i) => (
                      <option key={i} value={department.name}>
                        {department.name}
                      </option>
                    ))}
                  </Select>
                  {user?.publicMetadata.adminRole === "superadmin" && (
                    <ChevronDownIcon
                      className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-white/60"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </Field>
            </Fieldset>
            <div className="flex gap-4 ml-auto mt-6 w-fit">
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-error rounded"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-success rounded">
                Edit
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default EditSubject;
