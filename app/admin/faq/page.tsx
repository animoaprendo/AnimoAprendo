"use client";

import {
  AdminFaqItem,
  createFaqItem,
  deleteFaqItem,
  getFaqItems,
  reorderFaqItems,
  updateFaqItem,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import {
  CircleHelp,
  Edit,
  GripVertical,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AnswerFilter = "all" | "answered" | "empty";

const truncate = (text: string, maxLength = 110) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminFaqPage() {
  const { user } = useUser();
  const [faqs, setFaqs] = useState<AdminFaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [answerFilter, setAnswerFilter] = useState<AnswerFilter>("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<AdminFaqItem | null>(null);

  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.publicMetadata?.isAdmin === true;

  async function loadFaqItems() {
    try {
      setLoading(true);
      const result = await getFaqItems();
      if (result.success && result.data) {
        setFaqs(result.data);
      } else {
        toast.error(result.error || "Failed to load FAQ items");
      }
    } catch (error) {
      console.error("Error loading FAQ items:", error);
      toast.error("Failed to load FAQ items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadFaqItems();
    }
  }, [isAdmin]);

  const filteredFaqs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return faqs.filter((item) => {
      if (answerFilter === "answered" && !item.a?.trim()) return false;
      if (answerFilter === "empty" && item.a?.trim()) return false;

      if (!search) return true;

      const haystack = `${item.q || ""} ${item.a || ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [faqs, searchTerm, answerFilter]);

  function clearFilters() {
    setSearchTerm("");
    setAnswerFilter("all");
  }

  function openCreateDialog() {
    setFormQuestion("");
    setFormAnswer("");
    setIsCreateOpen(true);
  }

  function openEditDialog(item: AdminFaqItem) {
    setEditingFaq(item);
    setFormQuestion(item.q || "");
    setFormAnswer(item.a || "");
    setIsEditOpen(true);
  }

  async function handleCreateFaq() {
    if (!formQuestion.trim() || !formAnswer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createFaqItem({ q: formQuestion, a: formAnswer });
      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to create FAQ item");
        return;
      }

      setFaqs((prev) => [...prev, result.data as AdminFaqItem]);
      setIsCreateOpen(false);
      toast.success("FAQ item created");
    } catch (error) {
      console.error("Error creating FAQ:", error);
      toast.error("Failed to create FAQ item");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditFaq() {
    if (!editingFaq?._id) return;

    if (!formQuestion.trim() || !formAnswer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    try {
      setSubmitting(true);
      const result = await updateFaqItem({
        id: editingFaq._id,
        q: formQuestion,
        a: formAnswer,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to update FAQ item");
        return;
      }

      setFaqs((prev) =>
        prev.map((item) => (item._id === editingFaq._id ? (result.data as AdminFaqItem) : item)),
      );
      setIsEditOpen(false);
      setEditingFaq(null);
      toast.success("FAQ item updated");
    } catch (error) {
      console.error("Error updating FAQ:", error);
      toast.error("Failed to update FAQ item");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteFaq(item: AdminFaqItem) {
    if (!item?._id) return;

    const shouldDelete = window.confirm("Delete this FAQ entry?");
    if (!shouldDelete) return;

    try {
      const result = await deleteFaqItem(item._id);
      if (!result.success) {
        toast.error(result.error || "Failed to delete FAQ item");
        return;
      }

      toast.success("FAQ item deleted");
      await loadFaqItems();
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      toast.error("Failed to delete FAQ item");
    }
  }

  async function persistOrder(nextItems: AdminFaqItem[]) {
    try {
      setSavingOrder(true);
      const result = await reorderFaqItems(nextItems.map((item) => item._id));
      if (!result.success) {
        toast.error(result.error || "Failed to save FAQ order");
        await loadFaqItems();
        return;
      }

      toast.success("FAQ order updated");
    } catch (error) {
      console.error("Error reordering FAQ:", error);
      toast.error("Failed to save FAQ order");
      await loadFaqItems();
    } finally {
      setSavingOrder(false);
    }
  }

  function moveFaqItem(draggedId: string, targetId: string) {
    if (!draggedId || !targetId || draggedId === targetId) return;

    let reorderedFaqs: AdminFaqItem[] = [];

    setFaqs((prev) => {
      const fromIndex = prev.findIndex((item) => item._id === draggedId);
      const toIndex = prev.findIndex((item) => item._id === targetId);

      if (fromIndex < 0 || toIndex < 0) return prev;

      reorderedFaqs = [...prev];
      const [moved] = reorderedFaqs.splice(fromIndex, 1);
      reorderedFaqs.splice(toIndex, 0, moved);
      return reorderedFaqs;
    });

    if (reorderedFaqs.length > 0) {
      void persistOrder(reorderedFaqs);
    }
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="font-medium text-red-600">Access denied</p>
            <p className="text-muted-foreground mt-2">Admin access is required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <CircleHelp className="w-6 h-6" />
            FAQ Management
          </CardTitle>
          <CardDescription>
            Manage the FAQ collection in MongoDB. Drag rows to reorder how FAQs are shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                placeholder="Search by question or answer..."
              />
            </div>

            <Select value={answerFilter} onValueChange={(value) => setAnswerFilter(value as AnswerFilter)}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Answer filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Answers</SelectItem>
                <SelectItem value="answered">With Answer</SelectItem>
                <SelectItem value="empty">No Answer</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>

            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </Button>
          </div>

          {(searchTerm || answerFilter !== "all") && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Active filters:</span>
              {searchTerm ? <Badge variant="secondary">Search: {searchTerm}</Badge> : null}
              {answerFilter !== "all" ? (
                <Badge variant="secondary">
                  {answerFilter === "answered" ? "With Answer" : "No Answer"}
                </Badge>
              ) : null}
            </div>
          )}

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableCaption>
                Showing {filteredFaqs.length} of {faqs.length} FAQ entries
                {savingOrder ? " • Saving order..." : ""}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Drag</TableHead>
                  <TableHead className="w-[70px]">#</TableHead>
                  <TableHead className="min-w-[260px]">Question</TableHead>
                  <TableHead className="min-w-[360px]">Answer</TableHead>
                  <TableHead className="w-[180px]">Updated</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading FAQ entries...
                    </TableCell>
                  </TableRow>
                ) : filteredFaqs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No FAQ entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFaqs.map((item, index) => (
                    <TableRow
                      key={item._id}
                      draggable
                      onDragStart={() => setDraggingId(item._id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggingId) {
                          moveFaqItem(draggingId, item._id);
                        }
                        setDraggingId(null);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={draggingId === item._id ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <div className="inline-flex h-7 w-7 items-center justify-center rounded border text-muted-foreground">
                          <GripVertical className="w-4 h-4" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.q || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{truncate(item.a || "-")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(item.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => openEditDialog(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteFaq(item)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create FAQ Entry</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Question</label>
              <Input
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="Enter FAQ question"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Answer</label>
              <Textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="Enter FAQ answer"
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFaq} disabled={submitting}>
              {submitting ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingFaq(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit FAQ Entry</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Question</label>
              <Input
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="Enter FAQ question"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Answer</label>
              <Textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="Enter FAQ answer"
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditingFaq(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditFaq} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
