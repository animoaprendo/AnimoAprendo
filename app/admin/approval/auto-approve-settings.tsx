"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@clerk/nextjs";
import { Building2, CheckCircle2, Loader2, Shield, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Department = {
  name: string;
  yearLevel: number[];
};

type College = {
  _id: string | { $oid: string };
  name: string;
  abbreviation: string;
  departments: Department[];
};

type ApprovalSetting = {
  collegeAbbreviation: string;
  collegeName?: string;
  departmentName: string;
  autoApprove: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

type ApprovalScope = {
  role: 'superadmin' | 'college' | 'department';
  collegeAbbreviation?: string;
  departmentName?: string;
};

function scopeLabel(scope?: ApprovalScope | null) {
  if (!scope) return 'Unavailable';
  if (scope.role === 'superadmin') return 'Superadmin';
  if (scope.role === 'college') return 'Dean / College Admin';
  return 'Department Admin';
}

export default function AutoApproveSettingsPanel() {
  const { user, isLoaded } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [scope, setScope] = useState<ApprovalScope | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  const [settings, setSettings] = useState<ApprovalSetting[]>([]);
  const [selectedCollegeAbbreviation, setSelectedCollegeAbbreviation] = useState<string>('');

  const isAdmin = user?.publicMetadata?.isAdmin === true;

  const selectedCollege = useMemo(
    () => colleges.find((college) => college.abbreviation === selectedCollegeAbbreviation) || colleges[0],
    [colleges, selectedCollegeAbbreviation]
  );

  const visibleDepartments = useMemo(() => {
    if (!selectedCollege) return [];
    if (scope?.role === 'department' && scope.departmentName) {
      return selectedCollege.departments.filter((department) => department.name === scope.departmentName);
    }

    return selectedCollege.departments || [];
  }, [scope, selectedCollege]);

  const scopedSettings = useMemo(
    () => settings.filter((setting) => setting.collegeAbbreviation === selectedCollegeAbbreviation),
    [settings, selectedCollegeAbbreviation]
  );

  const enabledCount = useMemo(
    () => scopedSettings.filter((setting) => setting.autoApprove).length,
    [scopedSettings]
  );

  const settingForDepartment = (departmentName: string) => {
    return settings.find(
      (setting) =>
        setting.collegeAbbreviation === selectedCollegeAbbreviation &&
        setting.departmentName === departmentName
    );
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/approval-settings', { method: 'GET' });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load approval settings');
      }

      setScope(data.scope);
      setColleges(data.colleges || []);
      setSettings(data.settings || []);

      const initialCollege = data.scope?.collegeAbbreviation || data.colleges?.[0]?.abbreviation || '';
      setSelectedCollegeAbbreviation(initialCollege);
    } catch (error) {
      console.error('Error loading approval settings:', error);
      toast.error('Failed to load auto-approve settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (departmentName: string, autoApprove: boolean) => {
    if (!selectedCollegeAbbreviation) return;

    const key = `${selectedCollegeAbbreviation}::${departmentName}`;

    try {
      setSavingKey(key);
      const response = await fetch('/api/admin/approval-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collegeAbbreviation: selectedCollegeAbbreviation,
          departmentName,
          autoApprove,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update approval setting');
      }

      const updatedSetting = data.setting as ApprovalSetting;
      setSettings((current) => {
        const others = current.filter(
          (setting) =>
            !(
              setting.collegeAbbreviation === selectedCollegeAbbreviation &&
              setting.departmentName === departmentName
            )
        );

        return [...others, updatedSetting];
      });

      toast.success(`${departmentName} auto-approve ${autoApprove ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating approval setting:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  useEffect(() => {
    if (isLoaded && isAdmin) {
      loadSettings();
    }
  }, [isLoaded, isAdmin]);

  if (!isAdmin) {
    return null;
  }

  const currentScopeLabel = scopeLabel(scope);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Auto-Approve Controls
            </CardTitle>
            <CardDescription>
              Toggle automatic approval for departments within your allowed scope.
            </CardDescription>
          </div>
          <Button onClick={() => setOpen(true)} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Manage Settings
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3.5 w-3.5" />
            {currentScopeLabel}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {enabledCount} enabled
          </Badge>
          {scope?.collegeAbbreviation && (
            <Badge variant="outline" className="gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {scope.collegeAbbreviation}
            </Badge>
          )}
          {scope?.departmentName && (
            <Badge variant="outline">
              {scope.departmentName}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Superadmins can manage any college. College admins can manage departments under their college. Department admins can only manage their assigned department.
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Auto-Approve Settings</DialogTitle>
            <DialogDescription>
              Enable or disable automatic approval for departments in the selected scope.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto pr-1">
            {scope?.role === 'superadmin' && colleges.length > 0 && (
              <div className="space-y-2">
                <Label>College</Label>
                <Select value={selectedCollegeAbbreviation} onValueChange={setSelectedCollegeAbbreviation}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a college" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges.map((college) => (
                      <SelectItem key={typeof college._id === 'string' ? college._id : college._id.$oid} value={college.abbreviation}>
                        {college.abbreviation} - {college.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope?.role !== 'superadmin' && selectedCollege && (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="font-medium text-foreground">{selectedCollege.name}</div>
                <div className="text-muted-foreground">
                  {scope?.role === 'college'
                    ? 'You can manage every department under this college.'
                    : 'You can manage only your assigned department.'}
                </div>
              </div>
            )}

            {selectedCollege && visibleDepartments.length > 0 ? (
              <div className="space-y-3">
                {visibleDepartments.map((department) => {
                  const setting = settingForDepartment(department.name);
                  const checked = setting?.autoApprove === true;
                  const key = `${selectedCollegeAbbreviation}::${department.name}`;

                  return (
                    <div key={department.name} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                      <div className="space-y-1">
                        <div className="font-medium">{department.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Year levels: {department.yearLevel.join(', ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">
                          {checked ? 'Auto-approve on' : 'Auto-approve off'}
                        </div>
                        <Switch
                          checked={checked}
                          onCheckedChange={(value) => updateSetting(department.name, value)}
                          disabled={savingKey === key}
                        />
                        {savingKey === key && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {loading ? 'Loading departments...' : 'No departments available in this scope.'}
              </div>
            )}
          </div>

          <Separator />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}