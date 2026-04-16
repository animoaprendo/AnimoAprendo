"use client";

import { fetchUsers, getCollectionData } from "@/app/actions";
import { takeDownOffer } from "@/app/admin/actions";
import {
  findUserById,
  getAdminScope,
  getUserCollegeInformation,
  idsMatch,
  toYmd,
  userInScope,
} from "@/app/admin/reports/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUser } from "@clerk/nextjs";
import { AlertCircle, Eye, RefreshCw, Search, ShieldX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Availability = {
  id?: string;
  day?: string;
  start?: string;
  end?: string;
};

type SubjectOffer = {
  _id: string;
  userId: string;
  subject: string;
  description?: string;
  banner?: string;
  availability?: Availability[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type UserData = {
  id: string;
  firstName?: string;
  lastName?: string;
  emailAddresses?: Array<{ emailAddress: string }>;
  email?: string;
  collegeInformation?: {
    college?: string;
    department?: string;
  };
};

function getDisplayName(user: UserData | undefined): string {
  if (!user) return "Unknown";
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  if (fullName) return fullName;
  return user.emailAddresses?.[0]?.emailAddress || user.email || "Unknown";
}

function stripHtml(value: string): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function ApprovedOffersPage() {
  const { user } = useUser();

  const [offers, setOffers] = useState<SubjectOffer[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [offerToTakeDown, setOfferToTakeDown] = useState<SubjectOffer | null>(null);
  const [isTakeDownModalOpen, setIsTakeDownModalOpen] = useState(false);
  const [offerToView, setOfferToView] = useState<SubjectOffer | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  const scope = useMemo(() => getAdminScope(user as Record<string, unknown> | null | undefined), [user]);

  const fetchApprovedOffers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCollectionData("subjects");
      const allOffers = (response?.data || []) as SubjectOffer[];
      const approvedOffers = allOffers.filter((offer) => String(offer.status || "").toLowerCase() === "available");

      const userIds = Array.from(new Set(approvedOffers.map((offer) => offer.userId).filter(Boolean)));
      let fetchedUsers: UserData[] = [];

      if (userIds.length > 0) {
        const usersResult = await fetchUsers(userIds as string[]);
        fetchedUsers = (usersResult.success ? usersResult.data?.users : []) || [];
      }

      const scopedOffers = approvedOffers.filter((offer) => {
        if (scope.isSuperAdmin) return true;
        const offerUser = findUserById(fetchedUsers as Record<string, unknown>[], offer.userId);
        if (!offerUser) return false;
        const collegeInfo = getUserCollegeInformation(offerUser as Record<string, unknown>);
        return userInScope(collegeInfo, scope);
      });

      const scopedUserIds = Array.from(new Set(scopedOffers.map((offer) => offer.userId).filter(Boolean)));
      const scopedUsers = scopedUserIds
        .map((id) => findUserById(fetchedUsers as Record<string, unknown>[], id))
        .filter(Boolean) as UserData[];

      setOffers(scopedOffers);
      setUsers(scopedUsers);
    } catch (error) {
      console.error("Error fetching approved offers:", error);
      toast.error("Failed to load approved offers");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (user?.publicMetadata?.isAdmin) {
      fetchApprovedOffers();
    }
  }, [user, fetchApprovedOffers]);

  const colleges = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((u) => u.collegeInformation?.college)
          .filter(Boolean)
          .map((value) => String(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((u) => u.collegeInformation?.department)
          .filter(Boolean)
          .map((value) => String(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filteredOffers = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return offers
      .filter((offer) => {
        const offerUser = users.find((u) => idsMatch(u.id, offer.userId));
        const offerDate = toYmd(offer.updatedAt || offer.createdAt || "");

        if (dateFrom && offerDate && offerDate < dateFrom) return false;
        if (dateTo && offerDate && offerDate > dateTo) return false;

        const offerCollege = String(offerUser?.collegeInformation?.college || "");
        if (collegeFilter !== "all" && offerCollege !== collegeFilter) return false;

        const offerDepartment = String(offerUser?.collegeInformation?.department || "");
        if (departmentFilter !== "all" && offerDepartment !== departmentFilter) return false;

        if (!searchText) return true;

        const haystack = [
          offer.subject,
          stripHtml(offer.description || ""),
          getDisplayName(offerUser),
          offerUser?.emailAddresses?.[0]?.emailAddress || offerUser?.email || "",
          offerCollege,
          offerDepartment,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchText);
      })
      .sort((a, b) => {
        const left = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const right = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return right - left;
      });
  }, [offers, users, search, collegeFilter, departmentFilter, dateFrom, dateTo]);

  const pageSizeNumber = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredOffers.length / pageSizeNumber));
  const pageStartIndex = (currentPage - 1) * pageSizeNumber;
  const paginatedOffers = filteredOffers.slice(pageStartIndex, pageStartIndex + pageSizeNumber);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, collegeFilter, departmentFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openTakeDownModal = (offer: SubjectOffer) => {
    setOfferToTakeDown(offer);
    setIsTakeDownModalOpen(true);
  };

  const openViewModal = (offer: SubjectOffer) => {
    setOfferToView(offer);
    setIsViewModalOpen(true);
  };

  const handleTakeDown = async () => {
    if (!offerToTakeDown) return;

    try {
      setProcessingId(offerToTakeDown._id);
      const result = await takeDownOffer(offerToTakeDown._id);
      if (result?.success) {
        toast.success("Offer has been taken down");
        setOffers((prev) => prev.filter((item) => item._id !== offerToTakeDown._id));
        setIsTakeDownModalOpen(false);
        setOfferToTakeDown(null);
        return;
      }

      toast.error(result?.error || "Failed to take down offer");
    } catch (error) {
      console.error("Error taking down offer:", error);
      toast.error("Failed to take down offer");
    } finally {
      setProcessingId(null);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[360px]">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user.publicMetadata?.isAdmin) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center min-h-[360px] gap-3 text-center">
          <ShieldX className="h-10 w-10 text-red-600" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view approved offers.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[360px] gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="font-medium">Loading approved offers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Approved Offers</CardTitle>
              <CardDescription>
                Manage already approved tutor offers and take down listings when needed.
              </CardDescription>
              {!scope.isSuperAdmin && scope.college && (
                <p className="text-xs text-blue-700 mt-2">
                  Viewing scope: {scope.college}
                  {scope.department && scope.department !== "ALL_DEPARTMENTS"
                    ? ` - ${scope.department}`
                    : " - All departments"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{filteredOffers.length} visible</Badge>
              <Badge variant="outline">{offers.length} scoped total</Badge>
              <Button variant="outline" size="sm" onClick={fetchApprovedOffers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="relative md:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search subject, tutor, college"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={collegeFilter} onValueChange={setCollegeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="College" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colleges</SelectItem>
                {colleges.map((college) => (
                  <SelectItem key={college} value={college}>
                    {college}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          {(search || collegeFilter !== "all" || departmentFilter !== "all" || dateFrom || dateTo) && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCollegeFilter("all");
                  setDepartmentFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}

          {offers.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-60 text-center gap-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">No approved offers found</h3>
                <p className="text-sm text-muted-foreground">
                  There are no currently available offers in your admin scope.
                </p>
              </div>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-60 text-center gap-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">No matches for these filters</h3>
                <p className="text-sm text-muted-foreground">
                  Try broadening your search or clearing one of the filters.
                </p>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutor</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Approved On</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOffers.map((offer) => {
                    const offerUser = users.find((u) => idsMatch(u.id, offer.userId));
                    const offerCollege = offerUser?.collegeInformation?.college || "-";
                    const offerDepartment = offerUser?.collegeInformation?.department || "-";
                    const approvedOn = offer.updatedAt || offer.createdAt;

                    return (
                      <TableRow key={offer._id}>
                        <TableCell className="font-medium">{getDisplayName(offerUser)}</TableCell>
                        <TableCell className="font-semibold text-primary">{offer.subject || "-"}</TableCell>
                        <TableCell>{offerCollege}</TableCell>
                        <TableCell>{offerDepartment}</TableCell>
                        <TableCell>{approvedOn ? new Date(approvedOn).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openViewModal(offer)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openTakeDownModal(offer)}
                              disabled={processingId === offer._id}
                            >
                              {processingId === offer._id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                "Take Down"
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {filteredOffers.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {pageStartIndex + 1} to {Math.min(pageStartIndex + pageSizeNumber, filteredOffers.length)} of {filteredOffers.length} offers
          </div>

          <div className="flex items-center gap-2">
            <Select value={pageSize} onValueChange={setPageSize}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-1">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={isTakeDownModalOpen}
        onOpenChange={(open) => {
          setIsTakeDownModalOpen(open);
          if (!open && !processingId) {
            setOfferToTakeDown(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Take down approved offer?</DialogTitle>
            <DialogDescription>
              This will remove this offer from available listings.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border p-3 text-sm space-y-1">
            <div>
              <span className="font-medium">Subject:</span> {offerToTakeDown?.subject || "-"}
            </div>
            <div>
              <span className="font-medium">Tutor:</span>{" "}
              {getDisplayName(users.find((u) => idsMatch(u.id, offerToTakeDown?.userId)))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTakeDownModalOpen(false);
                setOfferToTakeDown(null);
              }}
              disabled={Boolean(processingId)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleTakeDown} disabled={Boolean(processingId) || !offerToTakeDown}>
              {processingId ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Confirm Take Down"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isViewModalOpen}
        onOpenChange={(open) => {
          setIsViewModalOpen(open);
          if (!open) {
            setOfferToView(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Offer Details</DialogTitle>
            <DialogDescription>Review complete offer information before taking action.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Subject</div>
                <div className="font-medium mt-1">{offerToView?.subject || "-"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Tutor</div>
                <div className="font-medium mt-1">
                  {getDisplayName(users.find((u) => idsMatch(u.id, offerToView?.userId)))}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">College</div>
                <div className="font-medium mt-1">
                  {users.find((u) => idsMatch(u.id, offerToView?.userId))?.collegeInformation?.college || "-"}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Department</div>
                <div className="font-medium mt-1">
                  {users.find((u) => idsMatch(u.id, offerToView?.userId))?.collegeInformation?.department || "-"}
                </div>
              </div>
            </div>

            {offerToView?.banner && (
              <div>
                <div className="text-sm font-medium mb-2">Banner</div>
                <img
                  src={offerToView.banner}
                  alt="Offer banner"
                  className="h-44 w-full rounded-md object-cover border"
                />
              </div>
            )}

            <div>
              <div className="text-sm font-medium mb-2">Description</div>
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                {stripHtml(offerToView?.description || "") || "No description provided"}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Availability</div>
              {offerToView?.availability && offerToView.availability.length > 0 ? (
                <div className="space-y-2">
                  {offerToView.availability.map((slot, index) => (
                    <div key={`${slot.id || index}`} className="rounded-md border p-2 text-sm flex items-center justify-between">
                      <span className="font-medium">{slot.day || "Day"}</span>
                      <span className="text-muted-foreground">{slot.start || "-"} - {slot.end || "-"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">No availability listed</div>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div>Created: {offerToView?.createdAt ? new Date(offerToView.createdAt).toLocaleString() : "-"}</div>
              <div>Updated: {offerToView?.updatedAt ? new Date(offerToView.updatedAt).toLocaleString() : "-"}</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
