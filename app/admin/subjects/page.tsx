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
import { useEffect, useState } from "react";
import CreateSubject from "./create";
import { useUser } from "@clerk/nextjs";
import EditSubject from "./edit";
import DeleteSubject from "./delete";

export type Subject = {
  _id: string;
  subjectName: string;
  subjectCode: string;
  college: string;
  department: string;
  createdAt: string;
  updatedAt: string;
};

export default function Subjects() {
  const { user } = useUser();
  const [subjects, setSubjects] = useState<Subject[]>([]);
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

  return (
    <div className="border p-4 rounded-2xl flex flex-col gap-4 h-full">
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-lg font-semibold">Subject Management</h1>
        <div className="flex flex-row items-center gap-2">
          <h3 className="text-sm font-medium">Search Subjects</h3>
          <input type="text" className="border-2 px-3 py-2 text-sm" />
          <button
            className="btn bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
            onClick={() => setIsOpenCreate(true)}
          >
            Add Subject
          </button>
        </div>
      </div>
      <Table>
        <TableCaption>{subjects.length} subjects found</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Subject Name</TableHead>
            <TableHead>Subject Code</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>College</TableHead>
            <TableHead>Updated At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((subject) => (
            <TableRow key={subject._id}>
              <TableCell>
                {subject.subjectName}
              </TableCell>
              <TableCell>
                {subject.subjectCode}
              </TableCell>
              <TableCell>{subject.department}</TableCell>
              <TableCell>
                {subject.college}
              </TableCell>
              <TableCell>{new Date(subject.updatedAt).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <div>
                  <button className="text-blue-600 hover:underline mr-2" onClick={() => handleEdit(subject)}>
                    Edit
                  </button>
                  <button className="text-red-600 hover:underline" onClick={() => handleDelete(subject)}>
                    Delete
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {/* <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Total</TableCell>
            <TableCell className="text-right">$2,500.00</TableCell>
          </TableRow>
        </TableFooter> */}
      </Table>

      <CreateSubject isOpen={isOpenCreate} setIsOpen={setIsOpenCreate} user={user} updateSubjects={updateSubjects}/>
      <EditSubject isOpen={isOpenEdit} setIsOpen={setIsOpenEdit} setSelectedSubject={setSelectedSubject} data={selectedSubject} user={user} updateSubjects={updateSubjects}/>
      <DeleteSubject isOpen={isOpenDelete} setIsOpen={setIsOpenDelete} setSelectedSubject={setSelectedSubject} data={selectedSubject} user={user} updateSubjects={updateSubjects}/>
    </div>
  );
}
