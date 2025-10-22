"use client";
import { getCollectionData } from "@/app/actions";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";

type User = {
  _id: string;
  first_name: string;
  last_name: string;
  email_addresses: {
    email_address: string;
  }[];
  username: string;
  updated_at: string;
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    getCollectionData("users").then((data) => {
      setUsers(data.data);
    });
  }, []);

  return (
    <div className="border p-4 rounded-2xl flex flex-col gap-4">
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-lg font-semibold">User Management</h1>
        <div className="flex flex-row items-center gap-2">
          <h3 className="text-sm font-medium">Search Users</h3>
          <input type="text" className="border-2 px-3 py-2 text-sm" />
        </div>
      </div>
      <Table>
        <TableCaption>A list of your recent users.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user._id}>
              <TableCell>
                {user.first_name} {user.last_name}
              </TableCell>
              <TableCell>
                {user.email_addresses
                  .map((email) => email.email_address)
                  .join(", ")}
              </TableCell>
              <TableCell>{user.username}</TableCell>
              <TableCell>{new Date(user.updated_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <div>
                  <button className="text-blue-600 hover:underline mr-2">Edit</button>
                  <button className="text-red-600 hover:underline">Delete</button>
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
    </div>
  );
}
