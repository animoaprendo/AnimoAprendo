"use server";

export async function createSubjectOption(data: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/createSubjectOption`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create subject option");
    }

    return response.json();
  } catch (error) {
    console.error("Error creating subject option:", error);
    throw error;
  }
}

export async function editSubjectOption(data: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/editSubjectOption`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create subject option");
    }

    return response.json();
  } catch (error) {
    console.error("Error creating subject option:", error);
    throw error;
  }
}

export async function deleteSubjectOption(data: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/editSubjectOption`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete subject option");
    }

    return response.json();
  } catch (error) {
    console.error("Error deleting subject option:", error);
    throw error;
  }
}

export async function approveOffer(offerId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/updateData`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection: "subjects",
          id: offerId,
          data: { status: "available" }
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to approve offer");
    }

    return response.json();
  } catch (error) {
    console.error("Error approving offer:", error);
    throw error;
  }
}

export async function rejectOffer(offerId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/updateData`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection: "subjects",
          id: offerId,
          data: { status: "rejected" }
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to reject offer");
    }

    return response.json();
  } catch (error) {
    console.error("Error rejecting offer:", error);
    throw error;
  }
}

export async function getPendingOffers() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/getData?collection=subjects`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch offers");
    }

    const result = await response.json();
    return {
      success: true,
      data: result.data?.filter((offer: any) => offer.status === "pending") || []
    };
  } catch (error) {
    console.error("Error fetching pending offers:", error);
    return { success: false, data: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Admin Management Functions
export async function createAdmin(data: {
  userId: string;
  adminRole: 'admin';
  college?: string;
  department?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/createAdmin`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create admin");
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating admin:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function updateAdminRole(data: {
  userId: string;
  adminRole?: 'admin' | 'superadmin';
  college?: string;
  department?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/updateAdmin`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update admin");
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating admin:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function removeAdmin(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/removeAdmin`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to remove admin");
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error removing admin:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getAdmins(): Promise<{ success: boolean; admins?: any[]; error?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/getAdmins`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch admins");
    }

    const result = await response.json();
    return { success: true, admins: result.admins || [] };
  } catch (error) {
    console.error("Error fetching admins:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}